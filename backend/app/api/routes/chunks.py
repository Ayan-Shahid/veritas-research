import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.models.filing_chunk import FilingChunk
from app.models.user import User
from app.schemas.filing_chunk import FilingChunkRead

router = APIRouter()


@router.get("/chunks/{chunk_id}", response_model=FilingChunkRead)
async def get_chunk(
    chunk_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deprecated - superseded by GET /memos/{memo_id}/citations/{citation_id}.
    Kept only for any in-flight frontend calls during the transition."""
    chunk = await db.get(FilingChunk, chunk_id)
    if not chunk or chunk.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chunk not found")
    return chunk