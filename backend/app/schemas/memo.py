import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemoClaim(BaseModel):
    """One claim in the memo plus the chunk(s) it's grounded in.

    citation_chunk_ids being empty is meaningful, not an omission: it
    means the model made a claim it couldn't back with a retrieved
    chunk, which the grounding check in llm.py flags rather than
    silently drops.
    """

    claim: str
    citation_chunk_ids: list[str] = Field(default_factory=list)


class MemoGeneration(BaseModel):
    """The shape the LLM is asked to return, parsed straight out of
    its JSON response. This is also what gets stored as Memo.content."""

    thesis: str
    financial_highlights: list[MemoClaim]
    risks: list[MemoClaim]


class MemoUpdate(BaseModel):
    """What an analyst can change when editing a memo draft.

    Same shape as MemoGeneration deliberately — editing replaces the
    whole content blob rather than patching individual claims, which
    keeps this schema (and the version-snapshot logic in the route)
    simple. Citation ids on existing claims are preserved by the
    frontend re-sending them; nothing here re-validates a citation
    against a real chunk id on edit — that's still just the
    generation-time grounding check, not enforced on manual edits.
    """

    thesis: str
    financial_highlights: list[MemoClaim]
    risks: list[MemoClaim]


class MemoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    id: uuid.UUID
    company_id: uuid.UUID
    model_name: str
    status: str
    content: MemoGeneration
    source_chunk_ids: list[str]
    created_at: datetime
    updated_at: datetime


class MemoVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    memo_id: uuid.UUID
    content: MemoGeneration
    created_at: datetime


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    action: str
    target_type: str
    target_id: uuid.UUID
    company_id: uuid.UUID | None
    details: dict | None
    created_at: datetime


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_type: str
    company_id: uuid.UUID
    status: str
    memo_id: uuid.UUID | None
    error: str | None
    created_at: datetime
    updated_at: datetime