from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    chunks,
    companies,
    eval_runs,
    filings,
    fine_tune_runs,
    health,
    memos,
    organizations,
    watchlist, notifications,
)
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(companies.router, tags=["companies"])
app.include_router(filings.router, tags=["filings"])
app.include_router(organizations.router, tags=["organizations"])
app.include_router(watchlist.router, tags=["watchlist"])
app.include_router(memos.router, tags=["memos"])
app.include_router(chunks.router, tags=["chunks"])
app.include_router(eval_runs.router, tags=["eval"])
app.include_router(fine_tune_runs.router, tags=["fine-tuning"])

app.include_router(notifications.router, tags=["notifications"])


@app.get("/")
async def root():
    return {"service": settings.PROJECT_NAME, "status": "running"}