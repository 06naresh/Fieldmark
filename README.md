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
npm run dev           # Vite development server on http://localhost:5173
npm run build         # TypeScript check and production build
npm run lint          # ESLint
npm test              # Vitest and React Testing Library
npm run preview       # Serve the production build locally
npm run typecheck:e2e # Type-check Playwright specs
npm run test:e2e      # Playwright end-to-end suite
npm run qa:frontend   # E2E typecheck, lint, unit tests, build, and E2E suite
```

`VITE_API_BASE_URL` defaults to `http://localhost:8000/api/v1` when it is not set. Access tokens are kept in application memory; refresh tokens are carried by the backend's HTTP-only cookie and are never read by frontend JavaScript.

### Account access

Open `http://localhost:5173/signup` to create an `INSPECTOR` account, then sign in. Public self-registration intentionally cannot create `ADMIN` accounts; administrator accounts remain provisioned through authenticated administrative user management. A self-registered inspector can log in immediately, but inspections must still be created and assigned by an administrator before they appear in the inspector workspace.

### Production PWA shell

`npm run build` produces an installable offline shell with a web manifest, generated icons, a versioned service worker, and a static-asset manifest. The service worker caches application resources only; inspection records, sync operations, and authenticated API responses are never placed in the service-worker cache. Serve the `dist/` directory over HTTPS (or localhost) for installation and offline startup support.

### Quality assurance

E2E tests require the production build, a running PostgreSQL database, and backend dependencies. `npm run qa:frontend` performs the frontend build before starting Playwright; Playwright starts the FastAPI backend and production preview automatically. `E2E_API_BASE_URL`, `E2E_BACKEND_PORT`, and `E2E_FRONTEND_ORIGIN` can override the default `http://localhost:8000/api/v1`, port `8000`, and preview origin `http://localhost:4173`. `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` control the test-only administrator seeded by `backend/scripts/seed_e2e_admin.py`.

The CI quality gate is defined in `.github/workflows/qa.yml`. It runs backend tests and migration checks, frontend checks and unit tests, a dependency audit, the production build, and the Chromium E2E suite against a PostgreSQL service. Phase 13 results and resolved defects are recorded in `docs/phase13-qa-report.md`.

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
- `phase13-qa-report.md`
