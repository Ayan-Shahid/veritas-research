"""Builds the prompt sent to the LLM for memo generation.

The prompt is deliberately strict about two things: (1) only using
facts present in the provided excerpts, and (2) citing a chunk id for
every factual claim, leaving citation_chunk_ids empty rather than
inventing an id when a claim can't be grounded. Both are enforced
again on the way back out in app/services/grounding.py — the prompt
is the first line of defense, not the only one.
"""
from __future__ import annotations

SYSTEM_PROMPT = """You are an equity research assistant. You write investment memo \
drafts strictly from the filing excerpts you are given. You never use outside \
knowledge about the company, and you never state a number or fact that isn't \
directly supported by one of the excerpts.

Respond with ONLY a JSON object (no markdown fences, no preamble) matching this \
shape:

{
  "thesis": "2-3 sentence investment thesis grounded in the excerpts",
  "financial_highlights": [
    {"claim": "a specific financial fact or trend", "citation_chunk_ids": ["<chunk id>"]}
  ],
  "risks": [
    {"claim": "a specific risk factor", "citation_chunk_ids": ["<chunk id>"]}
  ]
}

Rules:
- Every claim in financial_highlights and risks must cite the chunk id(s) it came from.
- If you cannot support a claim with a specific excerpt, do not make the claim.
- Never invent a chunk id. Only use ids that appear in the excerpts below.
- Produce 3-6 financial_highlights and 2-5 risks.
"""


def build_memo_prompt(company_name: str, ticker: str, chunks: list[tuple[str, str]]) -> str:
    """chunks is a list of (chunk_id, content) tuples, in retrieval order."""
    excerpts = "\n\n".join(
        f"[chunk id: {chunk_id}]\n{content}" for chunk_id, content in chunks
    )

    return (
        f"Company: {company_name} ({ticker})\n\n"
        f"Filing excerpts:\n\n{excerpts}\n\n"
        "Using only the excerpts above, produce the JSON memo described in your "
        "instructions."
    )