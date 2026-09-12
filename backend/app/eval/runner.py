"""Runs the eval harness: for each example, generate a memo against
its fixed chunk set, ground it, score it, and aggregate.

Deliberately bypasses retrieval and the DB — see app/eval/dataset.py
for why. This isolates the thing Week 5 cares about (generation +
grounding quality) from retrieval quality, which is a separate
concern with its own metrics later if needed.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.eval.dataset import EvalExample
from app.eval.scorers import citation_coverage, faithfulness_score, numeric_hallucination_rate
from app.services.grounding import strip_invalid_citations
from app.services.llm import generate_memo_draft


@dataclass
class ExampleResult:
    name: str
    citation_coverage: float
    numeric_hallucination_rate: float
    faithfulness_score: float
    invalid_citations_stripped: int


@dataclass
class EvalRunResult:
    model_name: str
    example_results: list[ExampleResult] = field(default_factory=list)

    @property
    def mean_citation_coverage(self) -> float:
        return _mean(r.citation_coverage for r in self.example_results)

    @property
    def mean_numeric_hallucination_rate(self) -> float:
        return _mean(r.numeric_hallucination_rate for r in self.example_results)

    @property
    def mean_faithfulness_score(self) -> float:
        return _mean(r.faithfulness_score for r in self.example_results)

    def as_summary_dict(self) -> dict:
        return {
            "model_name": self.model_name,
            "example_count": len(self.example_results),
            "mean_citation_coverage": round(self.mean_citation_coverage, 4),
            "mean_numeric_hallucination_rate": round(self.mean_numeric_hallucination_rate, 4),
            "mean_faithfulness_score": round(self.mean_faithfulness_score, 4),
            "examples": [
                {
                    "name": r.name,
                    "citation_coverage": round(r.citation_coverage, 4),
                    "numeric_hallucination_rate": round(r.numeric_hallucination_rate, 4),
                    "faithfulness_score": round(r.faithfulness_score, 4),
                    "invalid_citations_stripped": r.invalid_citations_stripped,
                }
                for r in self.example_results
            ],
        }


def _mean(values) -> float:
    values = list(values)
    return sum(values) / len(values) if values else 0.0


def run_eval(examples: list[EvalExample], model_name: str) -> EvalRunResult:
    result = EvalRunResult(model_name=model_name)

    for example in examples:
        chunk_pairs = [(c["id"], c["content"]) for c in example["chunks"]]
        chunk_lookup = {c["id"]: c["content"] for c in example["chunks"]}
        valid_ids = set(chunk_lookup)

        draft = generate_memo_draft(example["company_name"], example["ticker"], chunk_pairs)
        cleaned, invalid_count = strip_invalid_citations(draft, valid_ids)

        result.example_results.append(
            ExampleResult(
                name=example["name"],
                citation_coverage=citation_coverage(cleaned),
                numeric_hallucination_rate=numeric_hallucination_rate(cleaned, chunk_lookup),
                faithfulness_score=faithfulness_score(cleaned, chunk_lookup),
                invalid_citations_stripped=invalid_count,
            )
        )

    return result