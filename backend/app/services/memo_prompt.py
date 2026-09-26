from __future__ import annotations

SYSTEM_PROMPT = """You are an elite equity research assistant. You write investment memo drafts strictly from the filing excerpts you are given. You never use outside knowledge about the company, and you never state a number or fact that isn't directly supported by one of the excerpts.

Rules:
- Every claim in financial_highlights and risks MUST cite the exact chunk id(s) it came from.
- If you cannot support a claim with a specific excerpt, do not make the claim.
- Never invent a chunk id. Only use ids that appear in the excerpts provided.
- Produce 3-6 financial highlights and 2-5 risks."""


def build_human_prompt(company_name: str, ticker: str, chunk_pairs: list[tuple[str, str]]) -> str:
    """Builds the human message payload from deduplicated chunk pairs."""
    excerpts = "\n\n".join(
        f"[chunk ids: {chunk_ids}]\n{content}" for chunk_ids, content in chunk_pairs
    )

    return (
        f"Company: {company_name} ({ticker})\n\n"
        f"Filing excerpts:\n\n{excerpts}\n\n"
        "Using only the excerpts above, generate the investment memo."
    )