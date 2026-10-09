import logging
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import settings
from app.schemas.memo import MemoGeneration
from app.services.memo_prompt import SYSTEM_PROMPT, build_human_prompt

logger = logging.getLogger(__name__)

def get_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model=settings.ANTHROPIC_MODEL,
        anthropic_api_key=settings.ANTHROPIC_API_KEY,
        max_tokens=6000,
    )

def generate_memo_draft(
    company_name: str, ticker: str, context_chunks: list[tuple[str, str]]
) -> MemoGeneration:
    llm = get_llm()
    structured_llm = llm.with_structured_output(MemoGeneration, method="json_schema")

    # 1. Delegate to the unified prompt builder
    human_content = build_human_prompt(company_name, ticker, context_chunks)

    # 2. Map cleanly into LangChain's structure
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{human_content}"),
    ])

    chain = prompt_template | structured_llm

    logger.info("Invoking LangChain Anthropic chain for %s (%s)", company_name, ticker)
    
    return chain.invoke({"human_content": human_content})