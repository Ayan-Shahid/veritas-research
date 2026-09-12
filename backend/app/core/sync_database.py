"""Sync SQLAlchemy engine/session for use inside Celery tasks.

FastAPI request handlers use the async engine (app.core.database).
Celery workers run outside an event loop, so tasks use this sync
engine instead — same models, same Base, different driver
(psycopg3 instead of asyncpg).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

sync_engine = create_engine(settings.SYNC_DATABASE_URL, echo=settings.ENV == "local", future=True)
SyncSessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False, class_=Session)