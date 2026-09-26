import pytest
from app.services.retrieval import deduplicate_parent_chunks


class MockFilingChunk:
    """Mocks the SQLAlchemy FilingChunk model."""

    def __init__(self, chunk_id: str, content: str, parent_content: str = None):
        self.id = chunk_id
        self.content = content
        self.chunk_metadata = {"parent_content": parent_content} if parent_content else {}


def test_deduplicate_parent_chunks_merges_identical_parents():
    chunks = [
        MockFilingChunk(chunk_id="child-1", content="Row 1", parent_content="Parent Table A"),
        MockFilingChunk(chunk_id="child-2", content="Row 2", parent_content="Parent Table A"),
        MockFilingChunk(chunk_id="child-3", content="Prose 1", parent_content="Parent Paragraph B"),
    ]

    chunk_pairs, hash_map = deduplicate_parent_chunks(chunks)

    # 3 children should merge into 2 unique parent blocks
    assert len(chunk_pairs) == 2

    hash_a = chunk_pairs[0][0]
    hash_b = chunk_pairs[1][0]

    # Verify hashes are formatted correctly for the LLM prompt
    assert hash_a.startswith("sec-")
    assert hash_b.startswith("sec-")

    # Verify the parent text was extracted correctly
    assert chunk_pairs[0][1] == "Parent Table A"
    assert chunk_pairs[1][1] == "Parent Paragraph B"

    # Verify the lookup map tracks the underlying child UUIDs correctly
    assert "child-1" in hash_map[hash_a]
    assert "child-2" in hash_map[hash_a]
    assert "child-3" in hash_map[hash_b]


def test_deduplicate_parent_chunks_falls_back_to_content():
    chunks = [
        MockFilingChunk(chunk_id="child-1", content="Fallback Content", parent_content=None),
    ]

    chunk_pairs, hash_map = deduplicate_parent_chunks(chunks)

    assert len(chunk_pairs) == 1
    assert chunk_pairs[0][1] == "Fallback Content"