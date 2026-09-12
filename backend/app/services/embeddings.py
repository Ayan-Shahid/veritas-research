"""Local embedding generation via sentence-transformers.

Runs on CPU with no external API key, which keeps the ingestion
pipeline runnable end-to-end without any paid dependency. The model
is loaded once per process (module-level singleton) since loading it
per-request would dominate latency.
"""
from __future__ import annotations

from functools import lru_cache

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model():
    # Imported lazily so importing this module doesn't force a torch
    # import (and the multi-second model load) for code paths — like
    # most tests — that never call embed_texts().
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of strings, returning one 384-dim vector per input."""
    if not texts:
        return []

    model = _get_model()
    vectors = model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
    return vectors.tolist()


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]