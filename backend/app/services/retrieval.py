"""Top-k chunk retrieval over pgvector, plus parent-block deduplication
and citation-id assignment for prompt construction.

Retrieval is split into two separate queries (financials / risks) rather
than one composite query - dense numeric tables and qualitative risk
narrative embed very differently, and one generic query was found to
systematically under-rank real financial data against boilerplate
narrative text. See app/tasks/memo_tasks.py for how the two halves of
MEMO_RETRIEVAL_TOP_K get combined.
"""
from __future__ import annotations

import hashlib
import uuid

from sqlalchemy import Select, select

from app.models.filing import Filing
from app.models.filing_chunk import FilingChunk


def build_top_chunks_query(
    company_id: uuid.UUID,
    query_embedding: list[float],
    k: int,
    sec_item_filter: str | None = None,
) -> Select:
    """Returns a Select (not executed) for the top-k chunks by cosine
    distance for a company, optionally restricted to chunks tagged with a
    specific sec_item_label (e.g. narrowing a risk query to Item 1A
    specifically, rather than searching the whole filing)."""
    stmt = (
        select(FilingChunk)
        .join(Filing, Filing.id == FilingChunk.filing_id)
        .where(Filing.company_id == company_id)
    )

    if sec_item_filter:
        stmt = stmt.where(FilingChunk.chunk_metadata["sec_item_label"].astext == sec_item_filter)

    return stmt.order_by(FilingChunk.embedding.cosine_distance(query_embedding)).limit(k)


def deduplicate_parent_chunks(
    chunks: list[FilingChunk],
) -> tuple[list[tuple[str, str]], dict[str, list[str]]]:
    """Groups retrieved child chunks by their shared parent context (via
    chunk_metadata["parent_content"], falling back to the chunk's own
    content if no parent metadata is present), so multiple children under
    the same parent contribute one merged context block to the prompt
    instead of duplicating that parent's text once per child.

    Returns:
      - chunk_pairs: a list of (citation_id, parent_text) tuples in
        first-seen order, ready to pass to build_human_prompt.
      - citation_map: citation_id -> the real FilingChunk ids that were
        merged under it, for resolving a citation back to actual source
        chunks (e.g. for the citation-chip UI or training-data export) -
        the citation_id itself is a content hash, not a FilingChunk
        primary key, precisely because more than one real chunk can
        collapse into a single citation.
    """
    parent_to_children: dict[str, list[str]] = {}
    parent_text_by_hash: dict[str, str] = {}
    order: list[str] = []

    for chunk in chunks:
        parent_text = (
            chunk.chunk_metadata.get("parent_content", chunk.content)
            if chunk.chunk_metadata
            else chunk.content
        )

        citation_id = "sec-" + hashlib.md5(parent_text.encode()).hexdigest()[:8]

        if citation_id not in parent_to_children:
            parent_to_children[citation_id] = []
            parent_text_by_hash[citation_id] = parent_text
            order.append(citation_id)

        parent_to_children[citation_id].append(str(chunk.id))

    chunk_pairs = [(cid, parent_text_by_hash[cid]) for cid in order]
    return chunk_pairs, parent_to_children