"""Reads a training run's metadata JSON (written by
training/train_lora.py) and registers it with the Veritas API's
fine_tune_runs table over HTTP.

Deliberately HTTP, not a direct DB write like scripts/run_eval.py —
the training run itself typically happens on a GPU box (rented GPU or
Colab) with no network path to Postgres, only to wherever the API is
reachable. Run this from your local machine or the GPU box, pointed
at the API's URL.

Usage:
    python scripts/record_finetune_run.py path/to/training_run_metadata.json [--api-url URL]
"""
from __future__ import annotations

import argparse
import json

import httpx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("metadata_path")
    parser.add_argument("--api-url", default="http://localhost:8000")
    args = parser.parse_args()

    with open(args.metadata_path) as f:
        metadata = json.load(f)

    response = httpx.post(f"{args.api_url}/fine-tune-runs", json=metadata, timeout=30.0)
    response.raise_for_status()

    print("Registered fine-tune run:")
    print(json.dumps(response.json(), indent=2))


if __name__ == "__main__":
    main()