from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "veritas",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    # Memo generation calls an LLM API — give it real headroom rather
    # than the Celery default of no limit (which can hide a hung task).
    task_time_limit=300,
    task_soft_time_limit=240,
)

# Ensures @celery_app.task-decorated functions in this module are
# registered when the worker boots (celery -A app.core.celery_app worker).
celery_app.autodiscover_tasks(["app.tasks"])