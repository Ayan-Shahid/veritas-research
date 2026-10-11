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
    notifications,
    users,
)
from app.core.config import settings

# The interactive docs and the OpenAPI schema map every route and field; production hides them
# (set API_DOCS_ENABLED=true to turn them back on).
_docs = settings.docs_enabled
app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/docs" if _docs else None,
    redoc_url="/redoc" if _docs else None,
    openapi_url="/openapi.json" if _docs else None,
)

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
app.include_router(users.router, tags=["users"])
app.include_router(memos.router, tags=["memos"])
app.include_router(chunks.router, tags=["chunks"])
app.include_router(eval_runs.router, tags=["eval"])
app.include_router(fine_tune_runs.router, tags=["fine-tuning"])

app.include_router(notifications.router, tags=["notifications"])


@app.get("/")
async def root():
    return {"service": settings.PROJECT_NAME, "status": "running"}