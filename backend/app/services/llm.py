"""Calls the Claude API to generate a memo draft from retrieved chunks.

Kept as a single narrow function so the rest of the app doesn't care
which model is behind it — swapping in the fine-tuned model server in
Week 6-7 means changing this file, not every call site. Failures here
(bad JSON, API error) propagate up to the Celery task, which records
them on the Job row rather than swallowing them.
"""
from __future__ import annotations

import json

import anthropic

from app.core.config import settings
from app.schemas.memo import MemoGeneration
from app.services.memo_prompt import SYSTEM_PROMPT, build_memo_prompt

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    """Shared Anthropic client, reused by the eval harness (app/eval/scorers.py)
    for its LLM-judge calls so both generation and judging go through the
    same client setup."""
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def generate_memo_draft(
    company_name: str, ticker: str, chunks: list[tuple[str, str]]
) -> MemoGeneration:
    """chunks is a list of (chunk_id, content) tuples, in retrieval order."""
    prompt = build_memo_prompt(company_name, ticker, chunks)

    response = get_client().messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = "".join(block.text for block in response.content if block.type == "text")

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Model did not return valid JSON: {exc}\n\nRaw output:\n{raw_text[:500]}"
        ) from exc

    return MemoGeneration.model_validate(parsed)