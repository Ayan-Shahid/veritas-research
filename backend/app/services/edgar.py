"""Thin async client around SEC EDGAR's public JSON APIs.

No API key is required, but SEC requires a descriptive User-Agent
(name + contact email) on every request or it will reject you.
Set EDGAR_USER_AGENT in .env.

Week 1 scope: ticker->CIK lookup + recent filing metadata.
Week 2 adds: fetching the actual document text and chunking it.
"""
from __future__ import annotations

from datetime import datetime

import httpx

from app.core.config import settings

SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data"


class EdgarClient:
    def __init__(self) -> None:
        self._headers = {"User-Agent": settings.EDGAR_USER_AGENT}

    async def lookup_cik(self, ticker: str) -> str | None:
        """Resolve a ticker (e.g. 'AAPL') to a zero-padded 10-digit CIK."""
        async with httpx.AsyncClient(headers=self._headers, timeout=15.0) as client:
            resp = await client.get(SEC_TICKERS_URL)
            resp.raise_for_status()
            data = resp.json()

        ticker_upper = ticker.upper()
        for entry in data.values():
            if entry["ticker"].upper() == ticker_upper:
                return str(entry["cik_str"]).zfill(10)
        return None

    async def get_recent_filings(
        self,
        cik: str,
        forms: tuple[str, ...] = ("10-K", "10-Q"),
        limit: int = 8,
    ) -> list[dict]:
        """Return recent filing metadata for the given CIK, newest first."""
        padded_cik = cik.zfill(10)
        url = SEC_SUBMISSIONS_URL.format(cik=padded_cik)

        async with httpx.AsyncClient(headers=self._headers, timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        recent = data["filings"]["recent"]
        report_dates = recent.get("reportDate", [])
        results: list[dict] = []

        for i in range(len(recent["accessionNumber"])):
            form = recent["form"][i]
            if form not in forms:
                continue

            accession_no_dashes = recent["accessionNumber"][i].replace("-", "")
            primary_doc = recent["primaryDocument"][i]
            doc_url = f"{SEC_ARCHIVES_BASE}/{int(cik)}/{accession_no_dashes}/{primary_doc}"

            report_date_raw = report_dates[i] if i < len(report_dates) else None

            results.append(
                {
                    "accession_number": recent["accessionNumber"][i],
                    "form_type": form,
                    "filing_date": datetime.strptime(recent["filingDate"][i], "%Y-%m-%d").date(),
                    "period_of_report": (
                        datetime.strptime(report_date_raw, "%Y-%m-%d").date()
                        if report_date_raw
                        else None
                    ),
                    "primary_document_url": doc_url,
                }
            )
            if len(results) >= limit:
                break

        return results

    async def fetch_document_text(self, doc_url: str) -> str:
        """Fetch the raw filing document HTML/text. Cleanup + chunking is Week 2."""
        async with httpx.AsyncClient(headers=self._headers, timeout=30.0) as client:
            resp = await client.get(doc_url)
            resp.raise_for_status()
            return resp.text
