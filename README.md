# Fieldmark — Offline-First Field Inspection Management Application

Fieldmark is an offline-first field inspection application for teams whose inspectors work in areas with unreliable or unavailable internet access. Administrators manage users, sites, checklist templates, and inspection assignments. Inspectors can download assignments, complete them offline, and safely synchronize their work when connectivity returns.

The application preserves pending work locally, detects conflicting changes explicitly, and never uses silent last-write-wins for important inspection answers.

**Repository:** <https://github.com/06naresh/Fieldmark.git>

## Why Fieldmark

- **Offline-first:** Inspectors can open downloaded assignments and save answers without a network connection.
- **Durable local storage:** IndexedDB stores inspection records and synchronization operations across browser restarts.
- **Safe synchronization:** Push operations keep stable IDs and payloads for idempotent retry; pull changes apply only after authorized local persistence succeeds.
- **Explicit conflicts:** Stale or concurrent changes are preserved and presented for an authorized decision.
- **Role-based access:** The backend enforces `ADMIN` and `INSPECTOR` permissions; frontend controls are not treated as authorization.
- **Secure sessions:** Access tokens stay in memory. Refresh tokens use HTTP-only cookies, with CSRF cookie/header protection.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router |
| Frontend state/data | TanStack Query, Zustand, Dexie/IndexedDB, React Hook Form, Zod, Axios |
| Backend | Python, FastAPI, SQLAlchemy, Alembic, Pydantic |
| Authentication | JWT access tokens, HTTP-only refresh cookies, Argon2id password hashing, CSRF protection |
| Database | PostgreSQL (`field_inspection_db` locally; managed PostgreSQL in production) |
| Testing | pytest, HTTPX, Vitest, React Testing Library, Playwright |
| Deployment | Vercel Services, same-origin API routing, installable PWA shell |

## Repository Layout

```text
Fieldmark/
├── backend/
│   ├── app/                 # FastAPI routes, schemas, services, repositories, models
│   ├── alembic/             # Alembic migration environment and revisions
│   ├── scripts/             # Migration, admin bootstrap, and E2E seeding helpers
│   ├── tests/               # Backend test suite
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── e2e/                 # Playwright scenarios and fixtures
│   ├── public/              # PWA assets
│   ├── src/                 # React application
│   ├── tests/               # Frontend unit and component tests
│   ├── .env.example
│   └── package.json
├── docs/                    # Approved product and engineering documentation
├── scripts/                 # Production smoke checks
├── vercel.json              # Vercel Services routing, headers, and build hooks
└── progress-tracker.md      # Implementation history and handoff record
```

## Prerequisites

- Git
- Python 3.12 recommended (`pyproject.toml` allows Python 3.10+)
- Node.js 20.19+ or 22.12+ and npm
- PostgreSQL for local development
- Playwright Chromium browser, only if running E2E tests

## Clone the Repository

```bash
git clone https://github.com/06naresh/Fieldmark.git
cd Fieldmark
```

## Local Development Setup

### 1. Create development databases

Create two PostgreSQL databases: one for development and one for automated backend tests.

For example, from `psql`:

```sql
CREATE USER fieldmark_user WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE field_inspection_db OWNER fieldmark_user;
CREATE DATABASE field_inspection_test_db OWNER fieldmark_user;
```

Use a different password and never commit real credentials.

### 2. Configure and start the backend

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

Install dependencies and create the local environment file:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`. At minimum, set:

```dotenv
APP_ENV=development
SECRET_KEY=REPLACE_WITH_A_LONG_RANDOM_DEVELOPMENT_SECRET
DATABASE_URL=postgresql+psycopg://fieldmark_user:CHANGE_ME@localhost:5432/field_inspection_db
TEST_DATABASE_URL=postgresql+psycopg://fieldmark_user:CHANGE_ME@localhost:5432/field_inspection_test_db
FRONTEND_ORIGINS=http://localhost:5173
```

Apply migrations and start the API:

```bash
python -m alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://localhost:8000/api/v1`. Development API documentation is at `http://localhost:8000/docs`. Health endpoints are `http://localhost:8000/health` and `http://localhost:8000/health/ready`.

### 3. Configure and start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:5173>.

`frontend/.env.example` sets `VITE_API_BASE_URL=http://localhost:8000/api/v1`. The frontend does not require a separate manual override for normal local development.

## Accounts and First Login

Public signup intentionally creates only `INSPECTOR` accounts. Open <http://localhost:5173/signup> to create an inspector account.

To create the initial administrator, set the bootstrap environment variables and run the helper from `backend/` with the virtual environment active:

```bash
# macOS / Linux
export BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
export BOOTSTRAP_ADMIN_PASSWORD="CHANGE_ME"
export BOOTSTRAP_ADMIN_NAME="Fieldmark Administrator"
python -m scripts.bootstrap_admin

# Windows PowerShell
$env:BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="CHANGE_ME"
$env:BOOTSTRAP_ADMIN_NAME="Fieldmark Administrator"
python -m scripts.bootstrap_admin
```

The script never prints credentials and does not overwrite the password of an existing account. After signing in as an administrator, use user management to create or manage additional users.

## Typical Workflow

1. An administrator signs in and creates a site.
2. The administrator creates a checklist template.
3. The administrator assigns an inspection to an inspector.
4. The inspector signs in and explicitly downloads the assignment for offline use.
5. The inspector completes the inspection; answers and sync operations are saved locally.
6. The application synchronizes pending work when connectivity returns.
7. Authorized changes are pulled from the server, and conflicts are presented for explicit resolution.

## Frontend Commands

Run these from `frontend/`:

```bash
npm run dev           # Vite development server on http://localhost:5173
npm run build         # TypeScript check and production build
npm run preview       # Serve the production build locally
npm run lint          # ESLint with zero-warning policy
npm test              # Vitest unit and component tests
npm run typecheck:e2e # Type-check Playwright specs
npm run test:e2e      # Playwright E2E suite
npm run qa:frontend   # E2E typecheck, lint, unit tests, build, and E2E suite
```

The production build creates an installable PWA shell with a web manifest, generated icons, a versioned service worker, and a static-asset manifest. The service worker caches application resources only; inspection records, synchronization operations, and authenticated API responses are never placed in the service-worker cache. Serve `frontend/dist/` over HTTPS or localhost for installation and offline startup support.

## Testing

### Backend

From `backend/`, with the virtual environment active:

```bash
python -m pytest -q
python -m alembic check
```

Automated tests require `TEST_DATABASE_URL` to point to a separate PostgreSQL test database. Never point it at production.

### Frontend E2E

Install the Playwright browser once:

```bash
cd frontend
npx playwright install chromium
```

Then run:

```bash
npm run qa:frontend
```

Playwright builds the frontend, starts the backend and production preview, and seeds a test-only administrator through `backend/scripts/seed_e2e_admin.py`. The default test administrator is `admin.e2e@fieldmark.test`; override it with `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`.

Useful E2E overrides:

```bash
E2E_API_BASE_URL=http://localhost:8011/api/v1
E2E_BACKEND_PORT=8011
E2E_FRONTEND_ORIGIN=http://localhost:4173
E2E_BACKEND_PYTHON=/path/to/python
```

E2E tests write to the configured development PostgreSQL database through the seeding helper. Do not run them against a production database.

The CI quality gate is defined in `.github/workflows/qa.yml`. It runs backend tests and migration checks, frontend checks and unit tests, a dependency audit, the production build, and the Chromium E2E suite against PostgreSQL. Phase 13 results and resolved defects are recorded in `docs/phase13-qa-report.md`.

## Security Notes

- Never commit `.env` files, database URLs, JWT secrets, bootstrap credentials, or Vercel tokens.
- Production origins are derived from `FRONTEND_ORIGINS`, `PUBLIC_APP_URL`, and Vercel's injected `VERCEL_URL`; localhost origins are ignored in production.
- Production refresh and CSRF cookies are forced to `Secure`.
- Production API documentation is disabled.
- The backend is the final authority for authentication, authorization, validation, and version checks.

## Deployment

Fieldmark deploys to Vercel as one Services project so the browser, API, refresh cookie, and CSRF cookie share a single HTTPS origin. The root `vercel.json` defines:

- `/api/*`, `/health`, and `/health/ready` routing to the FastAPI service.
- All other paths routing to the Vite/PWA service with SPA fallback.
- PWA cache rules and baseline security headers.
- A backend build hook that applies Alembic migrations under a PostgreSQL advisory lock.

Production builds use the same-origin `/api/v1` API base from `frontend/.env.production`. Vercel project setup, environment variables, database provisioning, initial administrator bootstrap, health checks, backups, restoration, monitoring, rollback, and the release checklist are documented in `docs/deployment.md`.

After deployment, run non-destructive smoke checks:

```bash
python scripts/smoke_production.py https://<deployment-domain>
```

No real secrets belong in this repository. Enter them through Vercel environment variables or a secure secret manager.

## Documentation

Approved product and engineering specifications are located in `docs/`:

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
- `deployment.md`
