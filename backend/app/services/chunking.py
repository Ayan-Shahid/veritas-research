"""SEC filing parsing and chunking: sec2md item extraction, header-boundary
detection, table-aware chunking, and a hybrid strategy for parent blocks
that have no usable typographic structure (LLM semantic splitting, gated
by a strict verbatim check, falling back to a bounded mechanical split).

Pipeline: sec2md.parse_filing -> enforce_sec_markdown_headers ->
MarkdownHeaderTextSplitter (parent boundaries) -> process_mega_parent
(handles any parent over MEGA_PARENT_THRESHOLD) -> child chunks with
embeddable text + metadata pointing back to their parent context.
"""
from __future__ import annotations

import re
from typing import Any

import anthropic
import sec2md
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from sec2md import Item10Q, Item10K

from app.core.config import settings

# Trigger for "this parent needs special handling" - independent of the
# LLM preprocessing cutoff below. Anything under this is used as-is.
MEGA_PARENT_THRESHOLD = 8000

# Claude Haiku 4.5 (claude-haiku-4-5-20251001) has a real 64,000-token max
# output. Verify this against docs.claude.com before relying on it - model
# specs change. At ~4 chars/token for English prose, echoing back text
# plus inserted headers keeps us safely under 64K tokens up to roughly
# 150,000 characters; the buffer accounts for header-insertion overhead
# and tokenizer variance rather than pushing right up to the ceiling.
LLM_PREPROCESSING_MAX_CHARS = 150_000
LLM_PREPROCESSING_MODEL = "claude-haiku-4-5-20251001"
LLM_PREPROCESSING_MAX_OUTPUT_TOKENS = 60_000  # ~4K token margin under the real ceiling

_client: anthropic.Anthropic | None = None


def _get_preprocessing_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


# ---------------------------------------------------------------------------
# Header promotion
# ---------------------------------------------------------------------------

def enforce_sec_markdown_headers(text: str) -> str:
    """Promotes SEC filing structural conventions to real markdown headers
    so MarkdownHeaderTextSplitter can find parent boundaries: ITEM lines
    to H1, named financial statement titles and NOTE headings to H2,
    bolded/italicized risk headlines to H3, and short capitalized
    category-like lines to H2.
    """
    text = re.sub(
        r"^(ITEM\s+[0-9A-Z]+.*?)$",
        r"# \1",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    )

    # Named statement titles, whether they appear as a bare line or as a
    # pipe-wrapped table row - both patterns show up across different
    # filings' sec2md output.
    text = re.sub(
        r"^(\|?\s*((?:Consolidated\s+)?Statements?\s+of\s+[A-Za-z\s\u2019']+).*)$",
        r"\n\n## \2\n\n\1",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        r"^(\|?\s*((?:Consolidated\s+)?Balance\s+Sheets?)\b.*)$",
        r"\n\n## \2\n\n\1",
        text,
        flags=re.MULTILINE,
    )

    text = re.sub(
        r"^(NOTE\s+[0-9]+.*?)$",
        r"\n\n## \1\n\n",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    )

    # Whole-line italics/bold - SEC risk factors commonly bold the headline
    # sentence of each risk paragraph.
    text = re.sub(r"^\*(.*?)\*\s*$", r"\n\n### \1\n\n", text, flags=re.MULTILINE)

    def promote_categories(match: re.Match) -> str:
        line = match.group(1).strip()
        if line and not line.startswith("#"):
            return f"\n\n## {line}\n\n"
        return line

    text = re.sub(r"^([A-Z][a-zA-Z\s,]{5,60})$", promote_categories, text, flags=re.MULTILINE)

    return text


# ---------------------------------------------------------------------------
# Table detection + prose/table splitting within one parent block
# ---------------------------------------------------------------------------

_TABLE_PATTERN = re.compile(r"(?:^[ \t]*\|.*\|[ \t]*(?:\n|$)){2,}", re.MULTILINE)


def smart_format_splitter(
    parent_text: str, child_splitter: RecursiveCharacterTextSplitter
) -> list[str]:
    """Splits a parent block into child chunks, routing table regions to
    chunk_markdown_table and everything else to the standard recursive
    text splitter, so tables and prose never get chunked as if they were
    the same kind of content."""
    children: list[str] = []
    last_end = 0

    for match in _TABLE_PATTERN.finditer(parent_text):
        pre_text = parent_text[last_end : match.start()].strip()
        if pre_text:
            children.extend(child_splitter.split_text(pre_text))

        table_text = match.group(0).strip()
        children.extend(chunk_markdown_table(table_text, max_chars=child_splitter._chunk_size))

        last_end = match.end()

    tail_text = parent_text[last_end:].strip()
    if tail_text:
        children.extend(child_splitter.split_text(tail_text))

    if not children and parent_text.strip():
        children = child_splitter.split_text(parent_text.strip())

    return children


def chunk_markdown_table(table_text: str, max_chars: int = 1200) -> list[str]:
    """Splits a markdown table by rows, re-attaching the active header to
    every split-off piece. Dynamically tracks the active header via the
    most recently seen |---|---| separator rather than assuming the first
    two lines of the input are always THE header - handles the case where
    table_text contains more than one table back-to-back (e.g. a filing's
    income statement immediately followed by its comprehensive income
    statement with no prose in between). Forces a clean chunk break the
    moment a new table's separator is seen, so an old and new table's
    headers can never end up stacked in the same chunk.
    """
    lines = table_text.strip().split("\n")

    if len(lines) <= 3 or len(table_text) <= max_chars:
        return [table_text]

    chunks: list[str] = []
    current_chunk: list[str] = []
    current_len = 0
    active_header_lines: list[str] = []

    for i, line in enumerate(lines):
        stripped = line.strip()
        is_table_row = stripped.startswith("|") and stripped.endswith("|")
        is_separator = is_table_row and bool(re.match(r"^\|[\s\-\|:]+\|$", stripped))

        if is_separator and i > 0:
            prev_line = lines[i - 1].strip()
            if prev_line.startswith("|") and prev_line.endswith("|"):
                new_header_lines = [lines[i - 1], line]

                if len(current_chunk) > 1 and new_header_lines != active_header_lines:
                    # A new table just started mid-chunk: sever here rather
                    # than let the new header get silently appended after
                    # the old table's trailing rows.
                    current_chunk.pop()  # drop the header line appended last iteration
                    if current_chunk:
                        chunks.append("\n".join(current_chunk))
                    current_chunk = new_header_lines[:]
                    current_len = sum(len(x) + 1 for x in current_chunk)
                    active_header_lines = new_header_lines
                    continue
                else:
                    active_header_lines = new_header_lines
        elif not is_table_row:
            active_header_lines = []

        line_len = len(line) + 1

        # A chunk holding only the (re-attached) header, with no data row yet, is useless on
        # its own — never flush it until at least one real row has been added, even if that
        # means this one chunk runs over max_chars.
        header_only = bool(active_header_lines) and current_chunk == active_header_lines

        if current_len + line_len > max_chars and current_chunk and not header_only:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            current_len = 0
            if active_header_lines and line not in active_header_lines:
                current_chunk.extend(active_header_lines)
                current_len += sum(len(hl) + 1 for hl in active_header_lines)

        current_chunk.append(line)
        current_len += line_len

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


# ---------------------------------------------------------------------------
# Verbatim safety gate
# ---------------------------------------------------------------------------

def verify_verbatim(original_text: str, augmented_text: str) -> bool:
    """Strips LLM-injected ### headers from augmented_text and verifies
    the remaining characters are identical to the original, ignoring
    whitespace differences. This is the non-negotiable gate on
    llm_semantic_header_injection: if the model paraphrased, dropped, or
    altered a single word while "just adding headers," this must return
    False so the caller falls back to mechanical splitting instead of
    corrupting the source text a citation will later point to.
    """
    stripped_augmented = re.sub(r"\n*###[^\n]*\n*", "\n", augmented_text).strip()

    def canonicalize(text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    return canonicalize(original_text) == canonicalize(stripped_augmented)


def call_llm_for_preprocessing(prompt: str) -> str:
    """Raw text completion for the header-injection pre-processing pass.
    Not using structured output (app.services.llm's ChatAnthropic setup)
    since this just needs plain text back, not a validated schema.
    """
    client = _get_preprocessing_client()
    response = client.messages.create(
        model=LLM_PREPROCESSING_MODEL,
        max_tokens=LLM_PREPROCESSING_MAX_OUTPUT_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(block.text for block in response.content if block.type == "text")


def llm_semantic_header_injection(text: str) -> str | None:
    """Asks a fast/cheap model to insert ### headers at natural topic
    transitions in a block of prose that has no typographic structure of
    its own (e.g. a risk factors section formatted as continuous bulleted
    prose with no bolded headline per risk). Returns the augmented text
    only if it passes verify_verbatim; returns None otherwise (API error,
    over the size cutoff, or the model altered the source text), so the
    caller can fall back to a bounded mechanical split.
    """
    if len(text) > LLM_PREPROCESSING_MAX_CHARS:
        return None

    prompt = (
        "You are an SEC filing text processor. I will provide a long block of text. "
        "Your ONLY job is to insert '### [Topic Name]' headers at natural topic "
        "transitions. You MUST output the exact original text word-for-word, "
        "letter-for-letter, with nothing summarized, paraphrased, or dropped. Do not "
        "wrap your response in a code fence or add any commentary before or after "
        "the text.\n\nTEXT:\n" + text
    )

    try:
        augmented_text = call_llm_for_preprocessing(prompt)
    except Exception:
        # Any API failure (rate limit, timeout, etc.) falls back to
        # mechanical splitting rather than blocking ingestion.
        return None

    if verify_verbatim(text, augmented_text):
        return augmented_text

    return None


# ---------------------------------------------------------------------------
# Mega-parent handling
# ---------------------------------------------------------------------------

def process_mega_parent(
    parent_text: str, parent_metadata: dict, child_splitter: RecursiveCharacterTextSplitter
) -> list[dict]:
    """Breaks down a parent block using the hybrid approach:
      1. Tables are routed to chunk_markdown_table; each resulting piece
         IS its own parent (already bounded and self-contained - no
         further expansion needed).
      2. Small-enough prose sub-blocks are chunked normally, scoped to
         themselves.
      3. Oversized prose tries LLM semantic header injection; on success,
         each resulting semantic section becomes its own parent.
      4. If the LLM pass isn't attempted or fails the verbatim check,
         falls back to a bounded, zero-overlap mechanical split - zero
         overlap specifically to prevent the same text being eligible for
         double-injection into a prompt if two of its children both get
         retrieved.
    """
    if len(parent_text) <= MEGA_PARENT_THRESHOLD:
        child_texts = smart_format_splitter(parent_text, child_splitter)
        return [{"text": c, "parent": parent_text, "meta": parent_metadata} for c in child_texts]

    results: list[dict] = []
    blocks = re.split(r"\n\s*\n", parent_text)

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        if "|" in block and "\n|" in block:
            child_texts = chunk_markdown_table(block, max_chars=child_splitter._chunk_size)
            for c in child_texts:
                # Each table piece is its own parent: chunk_markdown_table
                # already re-attaches the correct header to it, so there's
                # nothing further to expand. Attaching the whole un-split
                # block here instead would reintroduce the exact bloat
                # this function exists to fix, just for tables.
                results.append({"text": c, "parent": c, "meta": parent_metadata})
            continue

        if len(block) <= MEGA_PARENT_THRESHOLD:
            child_texts = child_splitter.split_text(block)
            for c in child_texts:
                results.append({"text": c, "parent": block, "meta": parent_metadata})
            continue

        augmented_block = llm_semantic_header_injection(block)

        if augmented_block:
            semantic_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=[("###", "topic")])
            new_semantic_parents = semantic_splitter.split_text(augmented_block)

            for sem_parent in new_semantic_parents:
                sem_text = sem_parent.page_content.strip()
                if not sem_text:
                    continue
                child_texts = child_splitter.split_text(sem_text)
                for c in child_texts:
                    results.append({"text": c, "parent": sem_text, "meta": parent_metadata})
        else:
            mechanical_parent_splitter = RecursiveCharacterTextSplitter(
                chunk_size=6000, chunk_overlap=0
            )
            mechanical_parents = mechanical_parent_splitter.split_text(block)

            for mech_parent in mechanical_parents:
                child_texts = child_splitter.split_text(mech_parent)
                for c in child_texts:
                    results.append({"text": c, "parent": mech_parent, "meta": parent_metadata})

    return results


# ---------------------------------------------------------------------------
# Top-level orchestration
# ---------------------------------------------------------------------------

def parse_and_chunk_filing(
    doc_url: str,
    user_agent: str,
    filing_type: str = "10-K",
    child_chunk_size: int = 1200,
    child_chunk_overlap: int = 150,
) -> list[dict[str, Any]]:
    """Download SEC filing HTML, extract key Items into Markdown, and
    generate hierarchically-linked child chunks with parent contexts for
    pgvector storage.
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

            # Slice the parent into child chunks, routing any oversized
            # parent (mega-tables, structureless prose sections) through
            # the hybrid table/LLM-semantic/mechanical handling instead of
            # the flat splitter, which had no size ceiling of its own.
            processed_chunks = process_mega_parent(parent_text, parent_metadata, child_splitter)

            for c_idx, chunk_data in enumerate(processed_chunks):
                results.append(
                    {
                        "child_content": chunk_data["text"],
                        "metadata": {
                            **chunk_data["meta"],
                            "sec_item_label": label,
                            "parent_index": p_idx,
                            "child_index": c_idx,
                            "source_url": doc_url,
                            "parent_content": chunk_data["parent"],
                        },
                    }
                )

    return results