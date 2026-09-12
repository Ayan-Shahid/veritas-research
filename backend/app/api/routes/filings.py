import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.company import Company
from app.models.filing import Filing
from app.models.filing_chunk import FilingChunk
from app.schemas.filing import FilingRead
from app.schemas.filing_chunk import FilingChunkRead, IngestResult
from app.services.chunking import chunk_text, html_to_text
from app.services.edgar import EdgarClient
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
    """Fetch a filing's document, chunk it, embed each chunk, and store it.

    Idempotent: re-running this deletes any existing chunks for the
    filing first, so it's safe to call again after a chunking-logic
    change without creating duplicates.
    """
    filing = await db.get(Filing, filing_id)
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    client = EdgarClient()
    raw_html = await client.fetch_document_text(filing.primary_document_url)
    plain_text = html_to_text(raw_html)

    if not plain_text:
        raise HTTPException(status_code=422, detail="Fetched document had no extractable text")

    chunks = chunk_text(plain_text)
    embeddings = embed_texts(chunks)

    existing_chunks = await db.execute(
        select(FilingChunk).where(FilingChunk.filing_id == filing_id)
    )
    for old_chunk in existing_chunks.scalars().all():
        await db.delete(old_chunk)

    for i, (content, embedding) in enumerate(zip(chunks, embeddings)):
        db.add(
            FilingChunk(
                filing_id=filing_id,
                chunk_index=i,
                content=content,
                embedding=embedding,
            )
        )

    filing.raw_text = plain_text
    filing.ingested_at = datetime.utcnow()

    await db.commit()

    invalidate_chunk_cache(filing.company_id)

    return IngestResult(
        filing_id=filing_id,
        chunks_created=len(chunks),
        total_characters=len(plain_text),
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