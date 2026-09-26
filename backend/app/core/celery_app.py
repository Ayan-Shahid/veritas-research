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
    task_time_limit=300,
    task_soft_time_limit=240,
)

# autodiscover_tasks(["app.tasks"]) looks for a submodule literally named
# `tasks` inside each listed package (i.e. it tries to import
# app.tasks.tasks) — it does NOT import every module inside the app.tasks
# package. Our task lives in app/tasks/memo_tasks.py, so autodiscovery
# silently found nothing and the worker rejected every job with "Received
# unregistered task". Import the module directly instead, so the
# @celery_app.task decorator actually runs and registers the task when
# the worker process boots.
from app.tasks import memo_tasks  # noqa: E402,F401