"""CompanyCreate is the only thing standing between form input and fixed-width columns."""
import pytest
from pydantic import ValidationError

from app.schemas.company import CompanyCreate


def make(**kw):
    return CompanyCreate(**{"ticker": "AAPL", "name": "Apple Inc.", "cik": "0000320193", **kw})


def test_normalises_ticker_and_pads_cik():
    c = make(ticker=" brk.b ", cik="320193", sector="  ")
    assert (c.ticker, c.cik, c.sector) == ("BRK.B", "0000320193", None)


@pytest.mark.parametrize("ticker", ["", "A" * 11, "AAPL'; DROP", "<script>", "AB CD", ".AAPL"])
def test_rejects_bad_tickers(ticker):
    with pytest.raises(ValidationError):
        make(ticker=ticker)


@pytest.mark.parametrize("cik", ["", "abc", "12345678901", "1 OR 1=1", "-1", "1.5"])
def test_rejects_bad_ciks(cik):
    with pytest.raises(ValidationError):
        make(cik=cik)


def test_rejects_blank_and_oversized_text():
    with pytest.raises(ValidationError):
        make(name="   ")
    with pytest.raises(ValidationError):
        make(name="x" * 256)
    with pytest.raises(ValidationError):
        make(sector="x" * 101)
