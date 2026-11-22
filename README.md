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
- Node.js 20.19+ or 22.12+ (required by Vite 7) & npm
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

### Frontend commands

```bash
npm run dev       # Vite development server on http://localhost:5173
npm run build     # TypeScript check and production build
npm run lint      # ESLint
npm test          # Vitest and React Testing Library
npm run preview   # Serve the production build locally
```

`VITE_API_BASE_URL` defaults to `http://localhost:8000/api/v1` when it is not set. Access tokens are kept in application memory; refresh tokens are carried by the backend's HTTP-only cookie and are never read by frontend JavaScript.

### Account access

Open `http://localhost:5173/signup` to create an `INSPECTOR` account, then sign in. Public self-registration intentionally cannot create `ADMIN` accounts; administrator accounts remain provisioned through authenticated administrative user management. A self-registered inspector can log in immediately, but inspections must still be created and assigned by an administrator before they appear in the inspector workspace.

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
