"""Redis cache-aside for retrieved chunk sets.

What's cached is the *set of chunk ids* top-k retrieval returned for a
company, not the chunk content or the generated memo. Content still
comes from Postgres on a cache hit — what the cache saves is the
pgvector similarity search itself, which is the expensive part.
Invalidated whenever a filing is (re-)ingested for the company, since
new chunks can change which ones rank in the top-k.
"""
from __future__ import annotations

import json
import uuid

import redis

from app.core.config import settings

_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def _chunk_cache_key(company_id: uuid.UUID) -> str:
    return f"chunks:company:{company_id}"


def get_cached_chunk_ids(company_id: uuid.UUID) -> list[str] | None:
    raw = get_redis().get(_chunk_cache_key(company_id))
    return json.loads(raw) if raw else None


def set_cached_chunk_ids(company_id: uuid.UUID, chunk_ids: list[str]) -> None:
    get_redis().set(
        _chunk_cache_key(company_id), json.dumps(chunk_ids), ex=settings.MEMO_CACHE_TTL_SECONDS
    )


def invalidate_chunk_cache(company_id: uuid.UUID) -> None:
    get_redis().delete(_chunk_cache_key(company_id))