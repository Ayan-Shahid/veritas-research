import re
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

from app.schemas.memo import MemoGeneration
from app.services.llm import get_llm

# ==========================================
# Pure Data Scorers (Run in CI)
# ==========================================

def citation_coverage(memo: MemoGeneration) -> float:
    """Calculates the percentage of claims that cite at least one chunk."""
    claims = memo.financial_highlights + memo.risks
    if not claims:
        return 0.0

    cited_claims = sum(1 for c in claims if len(c.citation_chunk_ids) > 0)
    return cited_claims / len(claims)


def numeric_hallucination_rate(memo: MemoGeneration, chunk_lookup: dict[str, str]) -> float:
    """
    Checks if numbers present in the claims actually appear in the cited text.
    Returns the percentage of claims with numbers that contain a hallucination.
    """
    claims = memo.financial_highlights + memo.risks
    if not claims:
        return 0.0

    hallucinated_claims = 0
    claims_with_numbers = 0

    for claim in claims:
        # Extract sequences of digits, optionally with decimals
        numbers = re.findall(r'\d+(?:\.\d+)?', claim.claim)
        if not numbers:
            continue

        claims_with_numbers += 1

        # Build the combined text of all cited chunks
        context = " ".join([chunk_lookup.get(cid, "") for cid in claim.citation_chunk_ids])

        # If any extracted number is completely missing from the context, it's a hallucination
        has_hallucination = any(num not in context for num in numbers)
        if has_hallucination:
            hallucinated_claims += 1

    if claims_with_numbers == 0:
        return 0.0

    return hallucinated_claims / claims_with_numbers


# ==========================================
# LLM-Based Scorers (Run locally/in evaluation scripts)
# ==========================================

class FaithfulnessResult(BaseModel):
    is_faithful: bool = Field(
        description="True if the claim is completely supported by the context, False if it contains unsupported claims, outside knowledge, or contradictions."
    )

EVAL_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert financial fact-checker. Determine if the provided claim is fully "
        "supported by the provided filing context. Do not use outside knowledge."
    ),
    (
        "human",
        "Context:\n{context}\n\nClaim:\n{claim}"
    )
])

def faithfulness_score(memo: MemoGeneration, chunk_lookup: dict[str, str]) -> float:
    """
    Uses LangChain to evaluate whether every claim is factually grounded in its cited chunks.
    Returns the percentage of fully faithful claims.
    """
    claims = memo.financial_highlights + memo.risks
    if not claims:
        return 0.0

    # Initialize the LangChain structured evaluator
    llm = get_llm().with_structured_output(FaithfulnessResult)
    evaluator_chain = EVAL_PROMPT | llm

    supported_count = 0

    for claim in claims:
        if not claim.citation_chunk_ids:
            continue

        context = "\n\n".join([chunk_lookup.get(cid, "") for cid in claim.citation_chunk_ids])
        if not context:
            continue

        # Invoke LangChain with our specialized evaluator prompt
        result = evaluator_chain.invoke({
            "context": context,
            "claim": claim.claim
        })

        if result.is_faithful:
            supported_count += 1

    return supported_count / len(claims)