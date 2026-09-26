import asyncio
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.models.company import Company
from app.models.filing import Filing
from app.models.filing_chunk import FilingChunk
from app.schemas.filing import FilingRead
from app.schemas.filing_chunk import FilingChunkRead, IngestResult
from app.services.edgar import EdgarClient
from app.services.chunking import parse_and_chunk_filing
from app.services.embeddings import embed_texts
from app.services.cache import invalidate_chunk_cache

router = APIRouter()


@router.get("/companies/{company_id}/filings", response_model=list[FilingRead])
async def list_filings(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    result = await db.execute(
        select(Filing).where(Filing.company_id == company_id).order_by(Filing.filing_date.desc())
    )
    return result.scalars().all()


@router.post("/companies/{company_id}/filings/sync", response_model=list[FilingRead])
async def sync_filings(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Pull recent 10-K/10-Q filing metadata for this company from SEC EDGAR."""
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    client = EdgarClient()
    filings_data = await client.get_recent_filings(company.cik, forms=("10-K", "10-Q"), limit=8)

    created: list[Filing] = []
    for item in filings_data:
        existing = await db.execute(
            select(Filing).where(Filing.accession_number == item["accession_number"])
        )
        if existing.scalar_one_or_none():
            continue
        filing = Filing(company_id=company.id, **item)
        db.add(filing)
        created.append(filing)

    await db.commit()
    for f in created:
        await db.refresh(f)
    return created


@router.post("/filings/{filing_id}/ingest", response_model=IngestResult)
async def ingest_filing(filing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Fetch a filing's document, parse SEC sections, chunk hierarchically, embed, and store.

    Idempotent: re-running this deletes any existing chunks for the
    filing first, so it's safe to call again after a chunking-logic
    change without creating duplicates.
    """
    filing = await db.get(Filing, filing_id)
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    # parse_and_chunk_filing makes synchronous HTTP requests via sec2md,
    # so we wrap it in an executor to prevent blocking the async event loop
    try:
        chunks = await asyncio.to_thread(
            parse_and_chunk_filing,
            doc_url=filing.primary_document_url,
            user_agent=settings.EDGAR_USER_AGENT,
            filing_type=filing.form_type
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse and chunk filing: {e}")

    if not chunks:
        raise HTTPException(status_code=422, detail="Fetched document had no extractable target sections")

    # Only embed the small child text snippets to keep vectors dense and focused
    child_texts = [c["child_content"] for c in chunks]
    embeddings = embed_texts(child_texts)

    existing_chunks = await db.execute(
        select(FilingChunk).where(FilingChunk.filing_id == filing_id)
    )
    for old_chunk in existing_chunks.scalars().all():
        await db.delete(old_chunk)

    total_chars = 0
    for i, (chunk_data, embedding) in enumerate(zip(chunks, embeddings)):
        content = chunk_data["child_content"]
        total_chars += len(content)

        db.add(
            FilingChunk(
                filing_id=filing_id,
                chunk_index=i,
                content=content,
                chunk_metadata=chunk_data["metadata"],
                embedding=embedding,
            )
        )

    filing.raw_text = "See chunk_metadata for structured content."
    filing.ingested_at = datetime.utcnow()

    await db.commit()

    invalidate_chunk_cache(filing.company_id)

    return IngestResult(
        filing_id=filing_id,
        chunks_created=len(chunks),
        total_characters=total_chars,
    )


@router.get("/filings/{filing_id}/chunks", response_model=list[FilingChunkRead])
async def list_filing_chunks(filing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    filing = await db.get(Filing, filing_id)
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    result = await db.execute(
        select(FilingChunk)
        .where(FilingChunk.filing_id == filing_id)
        .order_by(FilingChunk.chunk_index)
    )
    return result.scalars().all()


@router.delete("/filings/{filing_id}/ingest")
async def delete_filing_ingestion(filing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete all vectorized chunks and reset ingestion status for a specific filing."""
    filing = await db.get(Filing, filing_id)
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    # 1. Delete all associated chunks
    await db.execute(
        delete(FilingChunk).where(FilingChunk.filing_id == filing_id)
    )

    # 2. Reset the filing metadata
    filing.raw_text = None
    filing.ingested_at = None

    await db.commit()

    # 3. Invalidate cache so stale chunks aren't served
    invalidate_chunk_cache(filing.company_id)

    return {"detail": f"Successfully deleted all chunks for filing {filing_id}"}


@router.delete("/filings/ingest/all")
async def delete_all_ingestions(db: AsyncSession = Depends(get_db)):
    """Danger: Deletes ALL vectorized chunks across ALL filings in the database."""

    # 1. Wipe the entire pgvector chunks table
    await db.execute(delete(FilingChunk))

    # 2. Bulk reset the ingestion status on all filings
    await db.execute(
        update(Filing).values(raw_text=None, ingested_at=None)
    )

    await db.commit()

    # Note: Since this wipes everything, you may also want to manually flush
    # your Redis cache using your Redis client if you have global keys,
    # or let the TTL expire if you don't track all company_ids explicitly.

    return {"detail": "Successfully purged all filing chunks from the database."}