import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_owned_company
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyRead
from app.services.embeddings import embed_text
from app.services.memo_prompt import build_human_prompt, SYSTEM_PROMPT
from app.services.retrieval import build_top_chunks_query, deduplicate_parent_chunks

router = APIRouter()


@router.get("/companies", response_model=list[CompanyRead])
async def list_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Company)
        .where(Company.user_id == current_user.id)
        .order_by(Company.ticker)
    )
    return result.scalars().all()


@router.post("/companies", response_model=CompanyRead, status_code=201)
async def create_company(
    payload: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ticker and CIK arrive normalised (upper-case ticker, 10-digit CIK) from CompanyCreate.
    # Scoped per user - two users researching the same real-world company is expected and fine;
    # only a duplicate within one account is rejected. CIKs are compared without leading zeros so
    # rows saved before CIKs were zero-padded still count as duplicates.
    duplicate = await db.execute(
        select(Company.ticker, Company.cik)
        .where(
            Company.user_id == current_user.id,
            or_(Company.ticker == payload.ticker, func.ltrim(Company.cik, "0") == payload.cik.lstrip("0")),
        )
        .limit(1)
    )
    clash = duplicate.first()
    if clash is not None:
        field = "ticker" if clash.ticker == payload.ticker else "CIK"
        raise HTTPException(status_code=409, detail=f"You already track a company with this {field} ({clash.ticker})")

    company = Company(user_id=current_user.id, **payload.model_dump())
    db.add(company)
    try:
        await db.commit()
    except IntegrityError:
        # A concurrent request inserted the same ticker/CIK between the check and the insert.
        await db.rollback()
        raise HTTPException(status_code=409, detail="You already track this company") from None
    await db.refresh(company)
    return company


@router.get("/companies/{company_id}", response_model=CompanyRead)
async def get_company(company: Company = Depends(get_owned_company)):
    return company


@router.get("/companies/{company_id}/preview-prompt")
async def preview_memo_prompt(
    company: Company = Depends(get_owned_company),
    db: AsyncSession = Depends(get_db),
):
    # company is already ownership-checked by the dependency - this route
    # previously did its own unscoped db.get(Company, company_id), which
    # meant any authenticated user could preview (and see the estimated
    # cost/token count of) another user's retrieval for any company_id they
    # guessed. Fixed by routing through get_owned_company like everything else.
    fin_task = asyncio.to_thread(embed_text,
                                 "Financial statements, income statement, balance sheet, net interest income, cash flows")
    risk_task = asyncio.to_thread(embed_text,
                                  "Material risk factors, credit risk, market volatility, liquidity, regulatory concerns")
    fin_emb, risk_emb = await asyncio.gather(fin_task, risk_task)

    half_k = settings.MEMO_RETRIEVAL_TOP_K // 2

    stmt_fin = build_top_chunks_query(company.id, fin_emb, half_k)
    stmt_risk = build_top_chunks_query(company.id, risk_emb, half_k)

    fin_result = await db.execute(stmt_fin)
    risk_result = await db.execute(stmt_risk)

    financial_chunks = fin_result.scalars().all()
    risk_chunks = risk_result.scalars().all()

    combined_chunks = list({c.id: c for c in financial_chunks + risk_chunks}.values())

    if not combined_chunks:
        raise HTTPException(status_code=404, detail="No chunks found. Ingest filing first.")

    chunk_pairs, hash_to_children = deduplicate_parent_chunks(combined_chunks)

    human_prompt = build_human_prompt(company.name, company.ticker, chunk_pairs)
    full_prompt_for_preview = f"=== SYSTEM MESSAGE ===\n{SYSTEM_PROMPT}\n\n=== HUMAN MESSAGE ===\n{human_prompt}"

    char_count = len(full_prompt_for_preview)
    est_tokens = char_count // 4

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