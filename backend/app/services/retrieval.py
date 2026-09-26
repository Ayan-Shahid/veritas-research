"""Top-k retrieval using pgvector in SQLAlchemy."""
from __future__ import annotations

import hashlib
import uuid
from sqlalchemy import Select, select

from app.models.filing import Filing
from app.models.filing_chunk import FilingChunk


def deduplicate_parent_chunks(chunks: list[FilingChunk]) -> tuple[list[tuple[str, str]], dict[str, list[str]]]:
    """
    Consolidates child chunks that share the same parent context.
    Generates a deterministic hash for each unique parent block to be used as the citation ID.

    Returns:
        chunk_pairs: list of (citation_id, parent_text) for the LLM prompt.
        hash_to_children: dict mapping citation_id -> list of child_ids for DB lookups.
    """
    parent_to_children: dict[str, list[str]] = {}

    for chunk in chunks:
        parent_text = (
            chunk.chunk_metadata.get("parent_content", chunk.content)
            if chunk.chunk_metadata else chunk.content
        )

        if parent_text not in parent_to_children:
            parent_to_children[parent_text] = []
        parent_to_children[parent_text].append(str(chunk.id))

    chunk_pairs = []
    hash_to_children = {}

    for parent_text, child_ids in parent_to_children.items():
        # Generate a stable 8-character hex hash from the text
        parent_hash = hashlib.md5(parent_text.encode("utf-8")).hexdigest()[:8]

        # Prefix it to make it clearly recognizable as a parent block citation
        citation_id = f"sec-{parent_hash}"

        chunk_pairs.append((citation_id, parent_text))
        hash_to_children[citation_id] = child_ids

    return chunk_pairs, hash_to_children


def build_top_chunks_query(
    company_id: uuid.UUID,
    query_embedding: list[float],
    k: int,
    sec_item_filter: str | None = None,
) -> Select:
    """Build a pgvector similarity search query over FilingChunk embeddings."""
    stmt = (
        select(FilingChunk)
        .join(Filing, Filing.id == FilingChunk.filing_id)
        .where(Filing.company_id == company_id)
    )

    if sec_item_filter:
        # Pre-filter by metadata if chunk_metadata is stored as JSONB
        stmt = stmt.where(
            FilingChunk.chunk_metadata["sec_item_label"].astext == sec_item_filter
        )

    stmt = stmt.order_by(FilingChunk.embedding.cosine_distance(query_embedding)).limit(k)
    return stmt