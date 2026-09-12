"""Run the memo-generation eval harness and print + persist results.

Usage:
    python scripts/run_eval.py [path/to/eval_set.json]

Defaults to app/eval/data/baseline_eval_set.json. Each run is also
saved to the eval_runs table so results are comparable over time —
from Week 6-7 on, this is how the fine-tuned model's scores get
compared against this API-model baseline.

This makes real Anthropic API calls: one generation call per example,
plus one LLM-judge call per cited claim for faithfulness_score. Costs
real money and takes a minute or two for the baseline set. Deliberately
NOT run in CI for that reason — see backend/tests/test_scorers.py for
the deterministic, free unit tests that ARE run in CI.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # noqa: E402
from app.core.sync_database import SyncSessionLocal  # noqa: E402
from app.eval.dataset import load_eval_set  # noqa: E402
from app.eval.runner import run_eval  # noqa: E402
from app.models.eval_run import EvalRun  # noqa: E402

DEFAULT_EVAL_SET = Path(__file__).resolve().parent.parent / "app/eval/data/baseline_eval_set.json"


def main() -> None:
    eval_set_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_EVAL_SET
    examples = load_eval_set(eval_set_path)

    print(
        f"Running eval set '{eval_set_path.name}' ({len(examples)} examples) "
        f"against {settings.ANTHROPIC_MODEL}..."
    )

    result = run_eval(examples, model_name=settings.ANTHROPIC_MODEL)
    summary = result.as_summary_dict()

    print(json.dumps(summary, indent=2))

    with SyncSessionLocal() as db:
        db.add(
            EvalRun(
                eval_set_name=eval_set_path.name,
                model_name=result.model_name,
                metrics=summary,
            )
        )
        db.commit()

    print("\nSaved to eval_runs.")


if __name__ == "__main__":
    main()