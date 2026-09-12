"""Post-generation grounding check.

The prompt tells the model to only cite real chunk ids, but "tell the
model" is not a guarantee — this is the actual enforcement. Any claim
citing a chunk id that wasn't in the retrieved set gets its citation
stripped rather than trusted, since a fabricated citation is worse
than an uncited claim: it looks verified but isn't. This is a
placeholder for the fuller eval harness coming in Week 5-7; for now
it's a hard filter, not a score.
"""
from __future__ import annotations

from app.schemas.memo import MemoClaim, MemoGeneration


def strip_invalid_citations(
    memo: MemoGeneration, valid_chunk_ids: set[str]
) -> tuple[MemoGeneration, int]:
    invalid_count = 0

    def clean(claims: list[MemoClaim]) -> list[MemoClaim]:
        nonlocal invalid_count
        cleaned = []
        for claim in claims:
            kept_ids = [cid for cid in claim.citation_chunk_ids if cid in valid_chunk_ids]
            invalid_count += len(claim.citation_chunk_ids) - len(kept_ids)
            cleaned.append(MemoClaim(claim=claim.claim, citation_chunk_ids=kept_ids))
        return cleaned

    cleaned_memo = MemoGeneration(
        thesis=memo.thesis,
        financial_highlights=clean(memo.financial_highlights),
        risks=clean(memo.risks),
    )
    return cleaned_memo, invalid_count