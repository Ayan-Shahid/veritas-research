import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyRead
from app.services.embeddings import embed_text
from app.services.memo_prompt import build_human_prompt, SYSTEM_PROMPT
from app.services.retrieval import build_top_chunks_query, deduplicate_parent_chunks

router = APIRouter()


@router.get("/companies", response_model=list[CompanyRead])
async def list_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).order_by(Company.ticker))
    return result.scalars().all()


@router.post("/companies", response_model=CompanyRead, status_code=201)
async def create_company(payload: CompanyCreate, db: AsyncSession = Depends(get_db)):
    # .strip() matters here — without it, "AAPL" and "AAPL " (a stray
    # space from a copy-paste) pass this check as different tickers and
    # silently create a second row for the same real company, each with
    # its own separate filing/chunk/memo history.
    normalized_ticker = payload.ticker.strip().upper()

    existing = await db.execute(select(Company).where(Company.ticker == normalized_ticker))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Company {normalized_ticker} already exists")

    data = payload.model_dump()
    data["ticker"] = normalized_ticker
    company = Company(**data)
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.get("/companies/{company_id}", response_model=CompanyRead)
async def get_company(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("/companies/{company_id}/preview-prompt")
async def preview_memo_prompt(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Dry-run the retrieval and prompt assembly pipeline without calling Claude."""

    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # 1. Generate query embeddings concurrently
    fin_task = asyncio.to_thread(embed_text,
                                 "Financial statements, income statement, balance sheet, net interest income, cash flows")
    risk_task = asyncio.to_thread(embed_text,
                                  "Material risk factors, credit risk, market volatility, liquidity, regulatory concerns")
    fin_emb, risk_emb = await asyncio.gather(fin_task, risk_task)

    half_k = settings.MEMO_RETRIEVAL_TOP_K // 2

    # 2. Retrieve top-k child chunks via pgvector (Partitioned)
    stmt_fin = build_top_chunks_query(company.id, fin_emb, half_k)
    stmt_risk = build_top_chunks_query(company.id, risk_emb, half_k)

    fin_result = await db.execute(stmt_fin)
    risk_result = await db.execute(stmt_risk)

    financial_chunks = fin_result.scalars().all()
    risk_chunks = risk_result.scalars().all()

    # Combine and deduplicate overlapping child chunks
    combined_chunks = list({c.id: c for c in financial_chunks + risk_chunks}.values())

    if not combined_chunks:
        raise HTTPException(status_code=404, detail="No chunks found. Ingest filing first.")

    # 3. Use the centralized deduplication
    chunk_pairs, hash_to_children = deduplicate_parent_chunks(combined_chunks)

    # 4. Build the final prompt exactly as the LLM will see it
    human_prompt = build_human_prompt(company.name, company.ticker, chunk_pairs)
    full_prompt_for_preview = f"=== SYSTEM MESSAGE ===\n{SYSTEM_PROMPT}\n\n=== HUMAN MESSAGE ===\n{human_prompt}"

    # 5. Estimate tokens and API cost
    char_count = len(full_prompt_for_preview)
    est_tokens = char_count // 4

    # Using September 2026 pricing for standard input tokens
    est_cost_sonnet_5 = (est_tokens / 1_000_000) * 2.00
    est_cost_opus_5_5 = (est_tokens / 1_000_000) * 4.00

    return {
        "company": company.ticker,
        "chunks_retrieved": len(combined_chunks),
        "unique_parent_blocks": len(chunk_pairs),
        "estimated_input_tokens": est_tokens,
        "estimated_cost": {
            "claude_sonnet_5": f"${est_cost_sonnet_5:.4f}",
            "claude_opus_5_5": f"${est_cost_opus_5_5:.4f}"
        },
        "prompt_preview": full_prompt_for_preview,
        "TOP K": settings.MEMO_RETRIEVAL_TOP_K,
    }