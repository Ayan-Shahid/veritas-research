"""Loads an eval set for the memo-generation harness.

Each example is self-contained — its own company name/ticker and a
fixed list of chunks — rather than pointing at rows in the live
database. That decouples the harness from retrieval: a regression in
these scores means generation or grounding got worse, not that
retrieval happened to pick different chunks this run. See
app/eval/data/baseline_eval_set.json for the shape and starter
examples.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import TypedDict


class EvalChunk(TypedDict):
    id: str
    content: str


class EvalExample(TypedDict):
    name: str
    company_name: str
    ticker: str
    chunks: list[EvalChunk]


def load_eval_set(path: str | Path) -> list[EvalExample]:
    with open(path) as f:
        return json.load(f)