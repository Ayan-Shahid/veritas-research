from app.services.chunking import chunk_text, html_to_text


def test_html_to_text_strips_tags_and_scripts():
    html = """
    <html>
      <head><style>body { color: red; }</style></head>
      <body>
        <script>alert('x')</script>
        <p>Revenue grew 12% year over year.</p>
        <p>Operating margin held steady at 24%.</p>
      </body>
    </html>
    """
    text = html_to_text(html)

    assert "Revenue grew 12%" in text
    assert "color: red" not in text
    assert "alert(" not in text


def test_chunk_text_respects_paragraph_boundaries_when_it_fits():
    text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    chunks = chunk_text(text, chunk_size=1000, chunk_overlap=50)

    assert len(chunks) == 1
    assert "First paragraph." in chunks[0]
    assert "Third paragraph." in chunks[0]


def test_chunk_text_splits_when_over_size():
    paragraph = "Sentence one. " * 50  # comfortably over a small chunk_size
    text = f"{paragraph}\n\n{paragraph}"

    chunks = chunk_text(text, chunk_size=200, chunk_overlap=40)

    assert len(chunks) > 1
    assert all(len(c) <= 200 + 40 for c in chunks)  # small slack for overlap join


def test_chunk_text_overlap_smaller_than_chunk_size_is_required():
    import pytest

    with pytest.raises(ValueError):
        chunk_text("some text", chunk_size=100, chunk_overlap=100)


def test_chunk_text_handles_empty_input():
    assert chunk_text("") == []