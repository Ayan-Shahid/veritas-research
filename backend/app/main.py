from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import companies, filings, health
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


@app.get("/")
async def root():
    return {"service": settings.PROJECT_NAME, "status": "running"}
