# Veritas Research

AI-powered equity research copilot for boutique investment firms. A
fine-tuned LLM generates citation-grounded investment memos from SEC
filings, earnings transcripts, and market data — every number in the
output traces back to a source document.

Full-stack: Next.js (web) + Flutter (mobile) + FastAPI (backend) +
PostgreSQL/pgvector, containerized on Kubernetes with CI/CD and an
MLOps evaluation pipeline comparing fine-tuned vs. baseline models.

**Suggested GitHub repo name:** `veritas-research`
**Description (for the repo "About" field):** AI research copilot for
investment teams — fine-tuned LLM generates citation-grounded equity
research memos from SEC filings & transcripts. Next.js + Flutter +
FastAPI + Postgres + Kubernetes.

## Status: Week 1 of 12

This is the foundation phase. Scope for this week:

- FastAPI skeleton with async SQLAlchemy + Alembic migrations
- Postgres schema v1: `users`, `companies`, `filings` (each row owned by a user)
- SEC EDGAR ingestion (ticker → CIK lookup, recent 10-K/10-Q metadata)
- Next.js shell: landing page, login page (UI only, not wired to auth
  yet), dashboard page reading live company data from the API
- Docker Compose for local dev (api + postgres + redis + frontend)
- GitHub Actions CI: lint + test on every push (no deploy yet)

Not yet built (coming in later weeks per the roadmap): chunking +
embeddings, RAG memo generation, Celery task queue, fine-tuning,
evaluation harness, Flutter app, Google Drive/email integrations,
Kubernetes manifests, ingress/load balancing.

## Project structure

```
veritas-research/
├── backend/
│   ├── app/
│   │   ├── core/        # settings, DB engine/session
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic request/response schemas
│   │   ├── api/routes/  # FastAPI routers
│   │   ├── services/    # external integrations (EDGAR, etc.)
│   │   └── main.py
│   ├── alembic/         # DB migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/              # Next.js App Router pages
│   ├── package.json
│   └── Dockerfile
├── .github/workflows/ci.yml
├── docker-compose.yml
└── .env.example
```

## Running locally

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000 (docs at `/docs`)
- Frontend: http://localhost:3000

Then run migrations once the containers are up:

```bash
docker compose exec api alembic upgrade head
```

### Option B — run services natively

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # edit DATABASE_URL to point at your local Postgres
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Trying it out

```bash
# Add a company (Apple's CIK is 0000320193)
curl -X POST http://localhost:8000/companies \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL", "name": "Apple Inc.", "cik": "0000320193"}'

# Pull its recent 10-K/10-Q filing metadata from SEC EDGAR
curl -X POST http://localhost:8000/companies/{company_id}/filings/sync
```

Visit http://localhost:3000/companies to see your companies populated
from the live API.

## Tests & linting

```bash
cd backend
ruff check .
pytest -v
```

## License

MIT (or your choice — update before publishing).
