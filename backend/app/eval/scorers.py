"""Scoring functions for the memo-generation eval harness.

Three scorers, each answering a different question about a generated
memo. None needs a "gold" expected memo to compare against — they
check each claim against the chunks the run itself cited, which is
what "grounded" actually means for this product:

- citation_coverage: what fraction of claims cite at least one chunk?
- numeric_hallucination_rate: of the numbers in the memo's claims,
  what fraction don't appear in their cited chunk's text?
- faithfulness_score: an LLM-judge estimate of whether each cited
  claim is actually supported by its citation, not just whether a
  citation is present.
"""
from __future__ import annotations

import json
import re

from app.core.config import settings
from app.schemas.memo import MemoClaim, MemoGeneration
from app.services.llm import get_client

# Matches number-like tokens: $1,234.5 / 12% / 1234 / 3.5
_NUMBER_PATTERN = re.compile(r"\$?\d[\d,]*\.?\d*%?")


def _all_claims(memo: MemoGeneration) -> list[MemoClaim]:
    return memo.financial_highlights + memo.risks


def citation_coverage(memo: MemoGeneration) -> float:
    """Fraction of claims (across financial_highlights + risks) that
    have at least one citation."""
    claims = _all_claims(memo)
    if not claims:
        return 0.0
    cited = sum(1 for c in claims if c.citation_chunk_ids)
    return cited / len(claims)


def numeric_hallucination_rate(memo: MemoGeneration, chunk_lookup: dict[str, str]) -> float:
    """Fraction of numbers in claims that do NOT appear verbatim in
    any of that claim's cited chunk(s).

    Crude but honest: extracts number-like tokens ($1.2B, 12%, 3,400)
    from each claim and checks for the same token string in the cited
    chunk text. False positives happen (e.g. the model reformats
    "12.0%" as "12%") — this is a coarse signal to track over time,
    not a certified fact-checker.
    """
    claims = _all_claims(memo)
    numbers_checked = 0
    numbers_hallucinated = 0

    for claim in claims:
        numbers = _NUMBER_PATTERN.findall(claim.claim)
        if not numbers:
            continue

        cited_text = " ".join(chunk_lookup.get(cid, "") for cid in claim.citation_chunk_ids)

        for number in numbers:
            numbers_checked += 1
            if number not in cited_text:
                numbers_hallucinated += 1

    if numbers_checked == 0:
        return 0.0
    return numbers_hallucinated / numbers_checked


_JUDGE_SYSTEM_PROMPT = """You are grading whether a claim is supported by a source \
excerpt. Respond with ONLY a JSON object: {"supported": true or false, "reason": "one \
short sentence"}. "supported" is true only if the excerpt directly backs the claim — \
not just related to it, but actually stating or implying it."""


def faithfulness_score(memo: MemoGeneration, chunk_lookup: dict[str, str]) -> float:
    """LLM-judge: for each cited claim, ask Claude whether the cited
    chunk(s) actually support it. Returns the fraction judged
    "supported".

    Uncited claims are excluded — that's what citation_coverage
    measures. This scorer is about the quality of citations that
    exist, not their presence. Makes one API call per cited claim, so
    it's the slowest and only non-free scorer here — that's why it's
    not run in CI (see backend/tests/test_scorers.py for what is).
    """
    claims = [c for c in _all_claims(memo) if c.citation_chunk_ids]
    if not claims:
        return 0.0

    client = get_client()
    supported_count = 0

    for claim in claims:
        cited_text = "\n\n".join(chunk_lookup.get(cid, "") for cid in claim.citation_chunk_ids)
        user_prompt = f"Claim: {claim.claim}\n\nSource excerpt(s):\n{cited_text}"

        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=150,
            system=_JUDGE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = "".join(b.text for b in response.content if b.type == "text")

        try:
            verdict = json.loads(raw)
            if verdict.get("supported"):
                supported_count += 1
        except json.JSONDecodeError:
            # An unparseable judge response counts as "not supported"
            # rather than crashing the whole eval run over one bad call.
            pass

    return supported_count / len(claims)