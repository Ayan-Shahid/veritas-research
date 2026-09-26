"""Exports approved memos + their source chunks into an SFT-ready
JSONL dataset for fine-tuning an open-source model to replicate (and
eventually improve on) the Claude-generated, analyst-approved memo
format.

Reads every Memo with status="approved", reconstructs the parent-level
context blocks using the memo's citation_map, rebuilds the exact system+user
prompt via app.services.memo_prompt, and pairs it with the memo's *current*
content as the target completion.

Writes JSONL in a standard chat-SFT shape:
    {"messages": [{"role": "system", ...}, {"role": "user", ...}, {"role": "assistant", ...}]}

Usage:
    python scripts/export_training_data.py [--min-examples N]
"""
from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.sync_database import SyncSessionLocal  # noqa: E402
from app.models.company import Company  # noqa: E402
from app.models.filing_chunk import FilingChunk  # noqa: E402
from app.models.memo import Memo  # noqa: E402
from app.services.memo_prompt import SYSTEM_PROMPT, build_human_prompt  # noqa: E402

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "training"


def export(min_examples: int = 1) -> Path:
    with SyncSessionLocal() as db:
        memos = (
            db.execute(select(Memo).where(Memo.status == "approved").order_by(Memo.created_at))
            .scalars()
            .all()
        )

        if len(memos) < min_examples:
            raise SystemExit(
                f"Only {len(memos)} approved memo(s) found, need at least {min_examples}. "
                "Approve more memos in the review UI before exporting training data."
            )

        examples = []
        skipped = 0
        for memo in memos:
            # Skip old memos generated before the citation_map architecture
            if not memo.citation_map:
                skipped += 1
                continue

            company = db.get(Company, memo.company_id)

            chunk_pairs = []
            valid_reconstruction = True

            # Reconstruct the context using the citation hashes
            for citation_id, child_ids in memo.citation_map.items():
                if not child_ids:
                    valid_reconstruction = False
                    break

                # We only need the first child to retrieve the shared parent_content
                first_child_uuid = uuid.UUID(child_ids[0])
                chunk = db.get(FilingChunk, first_child_uuid)

                if not chunk:
                    valid_reconstruction = False
                    break

                parent_text = (
                    chunk.chunk_metadata.get("parent_content", chunk.content)
                    if chunk.chunk_metadata else chunk.content
                )
                chunk_pairs.append((citation_id, parent_text))

            if not valid_reconstruction or not chunk_pairs:
                # Chunks were deleted/re-ingested since this memo was
                # generated (ingestion is delete-then-recreate) — skip
                skipped += 1
                continue

            user_prompt = build_human_prompt(company.name, company.ticker, chunk_pairs)

            examples.append(
                {
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                        {"role": "assistant", "content": json.dumps(memo.content)},
                    ]
                }
            )

    if not examples:
        raise SystemExit("No approved memos had resolvable source chunks — nothing to export.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    dataset_version = f"sft-{timestamp}-{len(examples)}ex"
    out_path = OUTPUT_DIR / f"{dataset_version}.jsonl"

    with open(out_path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")

    print(f"Wrote {len(examples)} training example(s) to {out_path}")
    if skipped:
        print(f"Skipped {skipped} approved memo(s) due to missing or stale source chunks.")
    print(f"dataset_version: {dataset_version}")
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-examples", type=int, default=1)
    args = parser.parse_args()
    export(min_examples=args.min_examples)