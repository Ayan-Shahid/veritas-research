"""Tests for the two pure scorers in app/eval/scorers.py.

faithfulness_score is deliberately not tested here — it makes a real
Anthropic API call per claim, so it's exercised only via
scripts/run_eval.py, not in CI. citation_coverage and
numeric_hallucination_rate are plain functions over data already in
hand, so they're free to test on every push.
"""
from app.eval.scorers import citation_coverage, numeric_hallucination_rate
from app.schemas.memo import MemoClaim, MemoGeneration


def _memo(highlights, risks) -> MemoGeneration:
    return MemoGeneration(thesis="test thesis", financial_highlights=highlights, risks=risks)


def test_citation_coverage_mixed():
    memo = _memo(
        highlights=[
            MemoClaim(claim="Revenue grew 12%", citation_chunk_ids=["c1"]),
            MemoClaim(claim="Margins expanded", citation_chunk_ids=[]),
        ],
        risks=[MemoClaim(claim="Competition rising", citation_chunk_ids=["c2"])],
    )
    assert citation_coverage(memo) == 2 / 3


def test_citation_coverage_empty_memo():
    memo = _memo(highlights=[], risks=[])
    assert citation_coverage(memo) == 0.0


def test_citation_coverage_fully_cited():
    memo = _memo(
        highlights=[MemoClaim(claim="X", citation_chunk_ids=["c1"])],
        risks=[MemoClaim(claim="Y", citation_chunk_ids=["c2"])],
    )
    assert citation_coverage(memo) == 1.0


def test_numeric_hallucination_rate_no_hallucination():
    memo = _memo(
        highlights=[MemoClaim(claim="Revenue grew 12%", citation_chunk_ids=["c1"])],
        risks=[],
    )
    chunk_lookup = {"c1": "Revenue grew 12% year over year to $4.2B."}
    assert numeric_hallucination_rate(memo, chunk_lookup) == 0.0


def test_numeric_hallucination_rate_detects_fabricated_number():
    memo = _memo(
        highlights=[MemoClaim(claim="Revenue grew 99%", citation_chunk_ids=["c1"])],
        risks=[],
    )
    chunk_lookup = {"c1": "Revenue grew 12% year over year to $4.2B."}
    assert numeric_hallucination_rate(memo, chunk_lookup) == 1.0


def test_numeric_hallucination_rate_ignores_claims_without_numbers():
    memo = _memo(
        highlights=[MemoClaim(claim="Margins expanded due to cost discipline", citation_chunk_ids=["c1"])],
        risks=[],
    )
    chunk_lookup = {"c1": "Some unrelated text with no numbers."}
    assert numeric_hallucination_rate(memo, chunk_lookup) == 0.0


def test_numeric_hallucination_rate_no_claims_at_all():
    memo = _memo(highlights=[], risks=[])
    assert numeric_hallucination_rate(memo, {}) == 0.0