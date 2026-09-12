"""Splits filing text into overlapping chunks for embedding + retrieval.

Deliberately dependency-free (no langchain) so the splitting logic is
transparent: it tries to break on paragraph boundaries first, falls
back to sentences, and only hard-cuts on characters as a last resort.
Overlap keeps a claim that straddles a chunk boundary retrievable from
either side.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def html_to_text(html: str) -> str:
    """Strip an SEC filing's HTML down to plain, whitespace-normalized text."""
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    # Collapse runs of blank lines/spaces left behind by table-heavy filings.
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 150) -> list[str]:
    """Split text into chunks of roughly `chunk_size` characters.

    chunk_overlap characters are repeated at the start of the next chunk
    so semantic search doesn't lose a claim that falls right on a
    boundary.
    """
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    paragraphs = [p.strip() for p in _PARAGRAPH_SPLIT.split(text) if p.strip()]

    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        candidate = f"{current}\n\n{paragraph}" if current else paragraph

        if len(candidate) <= chunk_size:
            current = candidate
            continue

        if current:
            chunks.append(current)
            current = current[-chunk_overlap:] if chunk_overlap else ""

        if len(paragraph) <= chunk_size:
            current = f"{current}\n\n{paragraph}".strip() if current else paragraph
        else:
            # A single paragraph longer than chunk_size: split on sentences.
            for piece in _chunk_long_paragraph(paragraph, chunk_size, chunk_overlap):
                if current and len(current) + len(piece) + 2 <= chunk_size:
                    current = f"{current}\n\n{piece}"
                else:
                    if current:
                        chunks.append(current)
                    current = piece

    if current:
        chunks.append(current)

    return chunks


def _chunk_long_paragraph(paragraph: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(paragraph) if s.strip()]
    pieces: list[str] = []
    current = ""

    for sentence in sentences:
        candidate = f"{current} {sentence}".strip()

        if len(candidate) <= chunk_size:
            current = candidate
            continue

        if current:
            pieces.append(current)
            current = current[-chunk_overlap:] if chunk_overlap else ""

        if len(sentence) <= chunk_size:
            current = f"{current} {sentence}".strip()
        else:
            # A single sentence longer than chunk_size (rare — dense
            # tables/footnotes): hard-cut on characters.
            for i in range(0, len(sentence), chunk_size - chunk_overlap):
                pieces.append(sentence[i : i + chunk_size])
            current = ""

    if current:
        pieces.append(current)

    return pieces