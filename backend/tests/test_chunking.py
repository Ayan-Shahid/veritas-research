import pytest
from app.services.chunking import (
    chunk_markdown_table,
    enforce_sec_markdown_headers,
    smart_format_splitter,
)


class MockLangChainSplitter:
    """Mock splitter that just returns the exact text passed to it to isolate tests."""

    def __init__(self, chunk_size: int = 1200):
        self._chunk_size = chunk_size

    def split_text(self, text: str) -> list[str]:
        return [text]


def test_enforce_sec_markdown_headers_promotes_items():
    text = "ITEM 1A. RISK FACTORS\nSome underlying text."
    result = enforce_sec_markdown_headers(text)

    assert result.startswith("# ITEM 1A. RISK FACTORS")
    assert "Some underlying text." in result


def test_enforce_sec_markdown_headers_promotes_italic_topics():
    text = "*Fluctuations in Foreign Currencies*\nRisk description here."
    result = enforce_sec_markdown_headers(text)

    assert "### Fluctuations in Foreign Currencies" in result


def test_enforce_sec_markdown_headers_promotes_capitalized_categories():
    text = "MACROECONOMIC RISKS\nRisk description here."
    result = enforce_sec_markdown_headers(text)

    assert "## MACROECONOMIC RISKS" in result


def test_chunk_markdown_table_leaves_short_tables_intact():
    table = "| Header |\n| --- |\n| Data |"
    chunks = chunk_markdown_table(table, max_chars=1200)

    assert len(chunks) == 1
    assert chunks[0] == table


def test_chunk_markdown_table_splits_long_tables_with_headers():
    table = "| Year | Revenue |\n| --- | --- |\n| 2025 | $100M |\n| 2026 | $120M |\n| 2027 | $150M |"

    # Set a highly constrained max_chars so it is forced to split after the first data row
    chunks = chunk_markdown_table(table, max_chars=40)

    assert len(chunks) == 3

    # Verify the first chunk contains the header and first row
    assert "| Year | Revenue |" in chunks[0]
    assert "| 2025 | $100M |" in chunks[0]

    # Verify the second chunk retains the header but has the second row
    assert "| Year | Revenue |" in chunks[1]
    assert "| --- | --- |" in chunks[1]
    assert "| 2026 | $120M |" in chunks[1]
    assert "| 2025" not in chunks[1]


def test_smart_format_splitter_isolates_tables_from_prose():
    parent_text = (
        "This is the introductory prose before the table.\n\n"
        "| Metric | Value |\n| --- | --- |\n| Sales | 100 |\n\n"
        "This is the concluding prose after the table."
    )
    splitter = MockLangChainSplitter(chunk_size=1200)
    results = smart_format_splitter(parent_text, splitter)

    assert len(results) == 3
    assert results[0] == "This is the introductory prose before the table."
    assert "| Metric | Value |" in results[1]
    assert results[2] == "This is the concluding prose after the table."