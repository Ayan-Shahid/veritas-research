"""Top-k chunk retrieval over pgvector.

Returns a plain SQLAlchemy Select rather than executing it, so the
same query works from both the async request path (a quick "preview
what retrieval would pull" endpoint, if one gets added later) and the
sync Celery worker that actually generates memos.
"""
from __future__ import annotations

import uuid

from sqlalchemy import Select, select

from app.models.filing import Filing
from app.models.filing_chunk import FilingChunk


def build_top_chunks_query(
    company_id: uuid.UUID, query_embedding: list[float], k: int
) -> Select:
    return (
        select(FilingChunk)
        .join(Filing, Filing.id == FilingChunk.filing_id)
        .where(Filing.company_id == company_id)
        .order_by(FilingChunk.embedding.cosine_distance(query_embedding))
        .limit(k)
    )