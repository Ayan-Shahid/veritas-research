import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.filing_chunk import FilingChunk
from app.schemas.filing_chunk import FilingChunkRead

router = APIRouter()


@router.get("/chunks/{chunk_id}", response_model=FilingChunkRead)
async def get_chunk(chunk_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Look up a single chunk by id — what a citation badge resolves
    to when an analyst clicks it on the memo review page."""
    chunk = await db.get(FilingChunk, chunk_id)
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    return chunk