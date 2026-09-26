"""SEC filing ingestion and chunking pipeline.

Uses sec2md to preserve table structures, regex to promote typographical
patterns into explicit Markdown headers (#, ##, ###), and LangChain splitters
to create Parent-Child chunks for vector retrieval.
"""
from __future__ import annotations

import re
from typing import Any
from bs4 import BeautifulSoup
import sec2md
from sec2md import Item10K, Item10Q
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter


def chunk_markdown_table(table_text: str, max_chars: int = 1200) -> list[str]:
    """Splits a Markdown table by rows. Dynamically tracks active column headers
    and forces a clean break when back-to-back tables are detected.
    """
    lines = table_text.strip().split("\n")

    if len(lines) <= 3 or len(table_text) <= max_chars:
        return [table_text]

    chunks = []
    current_chunk = []
    current_len = 0
    active_header_lines = []

    for i, line in enumerate(lines):
        stripped = line.strip()
        is_table_row = stripped.startswith('|') and stripped.endswith('|')
        is_separator = is_table_row and bool(re.match(r'^\|[\s\-\|:]+\|$', stripped))

        # Detect a NEW table starting mid-block
        if is_separator and i > 0:
            prev_line = lines[i - 1].strip()
            if prev_line.startswith('|') and prev_line.endswith('|'):
                new_header_lines = [lines[i - 1], line]

                # If current_chunk has data from a PRIOR table, force a clean break
                if len(current_chunk) > 1 and new_header_lines != active_header_lines:
                    # Pop the new table's header that was appended in the previous loop iteration
                    current_chunk.pop()
                    if current_chunk:
                        chunks.append("\n".join(current_chunk))

                    # Start a fresh chunk strictly for the new table
                    current_chunk = new_header_lines[:]
                    current_len = sum(len(x) + 1 for x in current_chunk)
                    active_header_lines = new_header_lines
                    continue  # Skip appending the separator again
                else:
                    active_header_lines = new_header_lines
        elif not is_table_row:
            active_header_lines = []

        line_len = len(line) + 1

        # Standard overflow check for long tables
        if current_len + line_len > max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            current_len = 0

            # Inject the active header at the top of the split chunk
            if active_header_lines and line not in active_header_lines:
                current_chunk.extend(active_header_lines)
                current_len += sum(len(hl) + 1 for hl in active_header_lines)

        current_chunk.append(line)
        current_len += line_len

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


def smart_format_splitter(parent_text: str, text_splitter) -> list[str]:
    """Extracts Markdown tables via regex and routes them to the table chunker,
    while sending standard prose to the LangChain character splitter.
    """
    # Break the parent text into isolated blocks on double newlines
    blocks = re.split(r'\n\s*\n', parent_text)

    child_chunks = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue

        # If it contains a markdown table pipe, route it to the smart table chunker
        if '|' in block and '\n|' in block:
            child_chunks.extend(chunk_markdown_table(block, max_chars=text_splitter._chunk_size))
        else:
            # Standard prose routing
            child_chunks.extend(text_splitter.split_text(block))

    return child_chunks



def enforce_sec_markdown_headers(text: str) -> str:
    """Promote SEC typographical headers into standard Markdown (#, ##, ###)."""
    # 1. Promote 'ITEM X.' to H1
    text = re.sub(
        r"^(ITEM\s+[0-9A-Z]+.*?)$",
        r"\n\n# \1\n\n",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    )

    # 2. Promote Financial Statements to H2 to prevent "Mega-Parent" context bloat.
    # Targets rows like "| Consolidated Statement of Income |" and injects a ## header above them.
    text = re.sub(
        r"^(\|\s*((?:Consolidated\s+)?Statements?\s+of\s+[A-Za-z\s\’\']+).*)$",
        r"\n\n## \2\n\n\1",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    )
    text = re.sub(
        r"^(\|\s*((?:Consolidated\s+)?Balance\s+Sheets?).*)$",
        r"\n\n## \2\n\n\1",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    )

    # 3. Promote 'NOTE X' to H2 to isolate footnotes and accounting policies
    text = re.sub(
        r"^(NOTE\s+[0-9]+.*?)$",
        r"\n\n## \1\n\n",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    )

    # 4. Promote italicized/bold risk headlines (*...*) to H3
    text = re.sub(r"^\*(.*?)\*\s*$", r"\n\n### \1\n\n", text, flags=re.MULTILINE)

    # 5. Promote short risk category lines to H2
    def promote_categories(match: re.Match) -> str:
        line = match.group(1).strip()
        if line and not line.startswith("#"):
            return f"\n\n## {line}\n\n"
        return line

    text = re.sub(r"^([A-Z][a-zA-Z\s,]{5,60})$", promote_categories, text, flags=re.MULTILINE)

    # 6. Clean up any excessive newlines created by the injections
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def parse_and_chunk_filing(
    doc_url: str,
    user_agent: str,
    filing_type: str = "10-K",
    child_chunk_size: int = 1200,
    child_chunk_overlap: int = 150,
) -> list[dict[str, Any]]:
    """Download SEC filing HTML, extract key Items into Markdown, and generate
    hierarchically-linked child chunks with parent contexts for pgvector storage.
    """
    # 1. Parse SEC filing directly into markdown pages
    pages = sec2md.parse_filing(doc_url, user_agent=user_agent)
    sections = sec2md.extract_sections(pages, filing_type=filing_type)

    if filing_type.upper() == "10-Q":
        target_items = [
            ("Item 1: Financial Statements", Item10Q.FINANCIAL_STATEMENTS_P1),
            ("Item 2: MD&A", Item10Q.MD_AND_A_P1),
            ("Item 1A: Risk Factors", Item10Q.RISK_FACTORS_P2),
        ]
    else:
        target_items = [
            ("Item 1: Business", Item10K.BUSINESS),
            ("Item 1A: Risk Factors", Item10K.RISK_FACTORS),
            ("Item 7: MD&A", Item10K.MD_AND_A),
        ]

    header_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[
            ("#", "sec_item"),
            ("##", "category"),
            ("###", "topic"),
        ]
    )

    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=child_chunk_overlap,
        separators=["\n\n", "\n", ". ", " "],
    )

    results: list[dict[str, Any]] = []

    for label, item_enum in target_items:
        sec = sec2md.get_section(sections, item_enum, filing_type=filing_type)
        if not sec:
            continue

        raw_md = sec.markdown()
        structured_md = enforce_sec_markdown_headers(raw_md)

        # Slice into parent sections by header
        parent_docs = header_splitter.split_text(structured_md)

        for p_idx, parent_doc in enumerate(parent_docs):
            parent_text = parent_doc.page_content.strip()
            parent_metadata = parent_doc.metadata

            # Slice the parent into small child chunks for precise vector matching
            child_pieces = smart_format_splitter(parent_text, child_splitter)

            for c_idx, child_text in enumerate(child_pieces):
                results.append(
                    {
                        "child_content": child_text,
                        "metadata": {
                            **parent_metadata,
                            "sec_item_label": label,
                            "parent_index": p_idx,
                            "child_index": c_idx,
                            "source_url": doc_url,
                            "parent_content": parent_text,  # <-- MOVE THIS HERE
                        },
                    }
                )

    return results