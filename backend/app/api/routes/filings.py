import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_owned_company, get_owned_filing
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.filing import Filing
from app.models.filing_chunk import FilingChunk
from app.models.company import Company
from app.models.user import User
from app.schemas.filing import FilingRead
from app.schemas.filing_chunk import FilingChunkRead, IngestResult
from app.services.edgar import EdgarClient
from app.services.chunking import parse_and_chunk_filing
from app.services.embeddings import embed_texts
from app.services.cache import invalidate_chunk_cache

router = APIRouter()


@router.get("/companies/{company_id}/filings", response_model=list[FilingRead])
async def list_filings(
        company: Company = Depends(get_owned_company),
        db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Filing).where(Filing.company_id == company.id).order_by(Filing.filing_date.desc())
    )
    return result.scalars().all()


@router.post("/companies/{company_id}/filings/sync", response_model=list[FilingRead])
async def sync_filings(
        company: Company = Depends(get_owned_company),
        db: AsyncSession = Depends(get_db),
):
    client = EdgarClient()
    filings_data = await client.get_recent_filings(company.cik, forms=("10-K", "10-Q"), limit=8)

    created: list[Filing] = []
    for item in filings_data:
        # Scoped: the same real SEC accession_number is fine to exist
        # once per org, since two different orgs can both ingest AAPL's
        # latest 10-K independently.
        existing = await db.execute(
            select(Filing).where(
                Filing.organization_id == company.organization_id,
                Filing.accession_number == item["accession_number"],
            )
        )
        if existing.scalar_one_or_none():
            continue
        filing = Filing(company_id=company.id, organization_id=company.organization_id, **item)
        db.add(filing)
        created.append(filing)

    await db.commit()
    for f in created:
        await db.refresh(f)
    return created


@router.post("/filings/{filing_id}/ingest", response_model=IngestResult)
async def ingest_filing(
        filing: Filing = Depends(get_owned_filing),
        db: AsyncSession = Depends(get_db),
):
    try:
        chunks = await asyncio.to_thread(
            parse_and_chunk_filing,
            doc_url=filing.primary_document_url,
            filing_type=filing.form_type,
            user_agent=settings.EDGAR_USER_AGENT,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse and chunk filing: {e}")

    if not chunks:
        raise HTTPException(status_code=422, detail="Fetched document had no extractable target sections")

    child_texts = [c["child_content"] for c in chunks]
    embeddings = embed_texts(child_texts)

    existing_chunks = await db.execute(
        select(FilingChunk).where(FilingChunk.filing_id == filing.id)
    )
    for old_chunk in existing_chunks.scalars().all():
        await db.delete(old_chunk)

    total_chars = 0
    for i, (chunk_data, embedding) in enumerate(zip(chunks, embeddings)):
        content = chunk_data["child_content"]
        total_chars += len(content)

        db.add(
            FilingChunk(
                filing_id=filing.id,
                organization_id=filing.organization_id,
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
        filing_id=filing.id,
        chunks_created=len(chunks),
        total_characters=total_chars,
    )


@router.get("/filings/{filing_id}/chunks", response_model=list[FilingChunkRead])
async def list_filing_chunks(
        filing: Filing = Depends(get_owned_filing),
        db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FilingChunk)
        .where(FilingChunk.filing_id == filing.id)
        .order_by(FilingChunk.chunk_index)
    )
    return result.scalars().all()


@router.delete("/filings/{filing_id}/ingest")
async def delete_filing_ingestion(
        filing: Filing = Depends(get_owned_filing),
        db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(FilingChunk).where(FilingChunk.filing_id == filing.id)
    )

    filing.raw_text = None
    filing.ingested_at = None

    await db.commit()
    invalidate_chunk_cache(filing.company_id)

    return {"detail": f"Successfully deleted all chunks for filing {filing.id}"}


@router.delete("/filings/ingest/all")
async def delete_all_ingestions(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    """Deletes all vectorized chunks for the CALLER'S organization only.

    Previously wiped every org's data globally - under real
    multi-tenancy that's not just "dangerous", it's one user being able
    to destroy every other firm's ingested filings. Now scoped.
    """
    org_filing_ids_subq = (
        select(Filing.id).where(Filing.organization_id == current_user.organization_id)
    )
    await db.execute(delete(FilingChunk).where(FilingChunk.filing_id.in_(org_filing_ids_subq)))
    await db.execute(
        update(Filing)
        .where(Filing.organization_id == current_user.organization_id)
        .values(raw_text=None, ingested_at=None)
    )

    await db.commit()

    return {"detail": "Successfully purged all filing chunks for your organization."}
