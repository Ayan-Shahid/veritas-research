"""Reads a training run's metadata JSON (written by
training/train_lora.py) and registers it with the Veritas API's
fine_tune_runs table over HTTP.

Deliberately HTTP, not a direct DB write like scripts/run_eval.py —
the training run itself typically happens on a GPU box (rented GPU or
Colab) with no network path to Postgres, only to wherever the API is
reachable. Run this from your local machine or the GPU box, pointed
at the API's URL.

Usage:
    VERITAS_SERVICE_TOKEN=... python scripts/record_finetune_run.py path/to/training_run_metadata.json [--api-url URL]

The endpoint requires the API's SERVICE_API_TOKEN, sent as the X-Service-Token header. Pass it
via the VERITAS_SERVICE_TOKEN environment variable (preferred: it stays out of shell history and
the process list) or --service-token.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import httpx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("metadata_path")
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--service-token", default=os.environ.get("VERITAS_SERVICE_TOKEN"))
    args = parser.parse_args()
    if not args.service_token:
        sys.exit("Set VERITAS_SERVICE_TOKEN (the API's SERVICE_API_TOKEN) or pass --service-token.")

    with open(args.metadata_path) as f:
        metadata = json.load(f)

    response = httpx.post(
        f"{args.api_url}/fine-tune-runs",
        json=metadata,
        headers={"X-Service-Token": args.service_token},
        timeout=30.0,
    )
    response.raise_for_status()

    print("Registered fine-tune run:")
    print(json.dumps(response.json(), indent=2))


if __name__ == "__main__":
    main()