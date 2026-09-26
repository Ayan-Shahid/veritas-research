import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FineTuneRun(Base):
    """Records a completed (or failed) fine-tuning run, reported in
    after the fact by scripts/record_finetune_run.py.

    Training itself happens outside this app — on a rented GPU or
    Colab, per training/train_lora.py — so this table is a log of
    finished runs, not a live progress tracker. eval_run_id links to
    the eval_runs row (Week 5's harness) once this fine-tuned model
    has been evaluated, which is how Week 7 compares it against the
    Claude API baseline.
    """

    __tablename__ = "fine_tune_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_version: Mapped[str] = mapped_column(String(255), nullable=False)
    base_model: Mapped[str] = mapped_column(String(255), nullable=False)
    hyperparams: Mapped[dict] = mapped_column(JSON, nullable=False)
    # "completed" | "failed"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    adapter_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    eval_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("eval_runs.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)