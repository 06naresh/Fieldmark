# Fieldmark — Offline-First Field Inspection Management Application

Fieldmark is an offline-first field inspection management application designed for organizations whose field inspectors perform inspections in environments with unreliable or unavailable internet connectivity.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Zustand, Dexie.js (IndexedDB), React Hook Form, Zod, Axios.
- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, Pydantic, JWT Authentication (Argon2id for passwords).
- **Database:** PostgreSQL (`field_inspection_db` in development; Neon PostgreSQL in production).
- **Testing:** pytest, HTTPX, Vitest, React Testing Library, Playwright.

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm / pnpm / yarn
- PostgreSQL (Local PostgreSQL or pgAdmin for development)

### Setup Backend
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Unix:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your local PostgreSQL DATABASE_URL and TEST_DATABASE_URL.
# Synchronization batch and pull limits can be tuned with SYNC_MAX_BATCH_SIZE
# and SYNC_MAX_PULL_LIMIT.
```

### Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Documentation

Full architectural specifications are located in `docs/`:
- `PRD.md`
- `architecture.md`
- `database-design.md`
- `api-contracts.md`
- `offline-sync-design.md`
- `security-design.md`
- `frontend-design.md`
- `development-phases.md`
- `testing-strategy.md`
