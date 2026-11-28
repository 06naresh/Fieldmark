# Fieldmark — Offline-First Field Inspection Management

Fieldmark is an offline-first field inspection management application designed for organizations whose employees perform inspections in locations with unreliable or unavailable internet connectivity.

Administrators can manage users, sites, checklist templates, and inspection assignments. Inspectors can download their assigned inspections, complete them offline, and synchronize their work with the server when connectivity is restored.

The application uses persistent browser storage to protect work across refreshes and restarts. It also detects conflicting updates and supports explicit conflict handling instead of silently overwriting inspection answers.

**Repository:** https://github.com/06naresh/Fieldmark

---

## Table of Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [High-Level Design (HLD)](#high-level-design-hld)
- [Low-Level Design (LLD)](#low-level-design-lld)
- [Application Workflow](#application-workflow)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [User Accounts](#user-accounts)
- [Running Tests](#running-tests)
- [Security](#security)
- [Deployment](#deployment)
- [Project Documentation](#project-documentation)

---

## Key Features

- **Offline-first inspections:** Inspectors can access previously downloaded assignments and save answers without an active internet connection.
- **Persistent local storage:** IndexedDB, managed through Dexie, stores offline inspection data and pending synchronization operations.
- **Reliable synchronization:** Pending changes are uploaded when connectivity returns. Stable operation identifiers support safe retries and idempotent processing.
- **Conflict detection:** Concurrent or stale updates are detected and preserved for explicit resolution rather than silently overwritten.
- **Role-based access control:** The backend enforces `ADMIN` and `INSPECTOR` permissions.
- **Secure authentication:** JWT access tokens, HTTP-only refresh cookies, Argon2id password hashing, and CSRF protection.
- **Progressive Web App:** The application shell and approved static resources can be cached to support offline application loading.
- **Testing support:** Backend tests, frontend unit tests, and browser-based end-to-end tests.

---

## Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| Frontend | React, TypeScript, Vite | User interface and frontend development |
| UI and styling | Tailwind CSS, shadcn/ui | Responsive design and reusable components |
| Routing | React Router | Client-side navigation |
| Server state | TanStack Query | API data fetching and server-state management |
| Client state | Zustand | Application and UI state |
| Local database | IndexedDB, Dexie.js | Persistent offline data storage |
| Forms and validation | React Hook Form, Zod | Form handling and validation |
| HTTP communication | Axios | Frontend-to-backend API requests |
| Backend | Python, FastAPI | REST API and business logic |
| Backend validation | Pydantic | Request and response validation |
| ORM | SQLAlchemy | Relational database operations |
| Migrations | Alembic | Database schema versioning |
| Database | PostgreSQL | Central persistent application data |
| Authentication | JWT, Argon2id, HTTP-only cookies | Authentication and session security |
| CSRF protection | CSRF cookie/header validation | Protection for cookie-authenticated requests |
| Backend testing | pytest, HTTPX | Unit and API integration testing |
| Frontend testing | Vitest, React Testing Library | Unit and component testing |
| E2E testing | Playwright | Browser workflow testing |
| Deployment | Vercel Services | Frontend and backend deployment |

---

## System Architecture

Fieldmark follows a **client-server architecture with an offline-first frontend**.

The frontend communicates with the backend through REST APIs. It does not connect directly to PostgreSQL. When the inspector is offline, the frontend uses IndexedDB to read and save locally available inspection data. The synchronization engine transfers pending changes to the backend when connectivity becomes available.

### High-Level Architecture Diagram

```mermaid
flowchart TB
    USER["Administrator / Inspector"]

    subgraph CLIENT["Frontend - React + TypeScript"]
        UI["Pages and UI Components"]
        STATE["Application State"]
        API["API Client - Axios"]
        OFFLINE["Offline Data Layer"]
        SYNC["Synchronization Engine"]
        PWA["PWA / Service Worker"]
    end

    subgraph BROWSER["Browser Storage"]
        IDB[("IndexedDB - Dexie")]
        CACHE[("Cache Storage")]
    end

    subgraph SERVER["Backend - FastAPI"]
        AUTH["Authentication and Authorization"]
        ROUTES["REST API Routes"]
        SERVICES["Business Services"]
        SYNCSVC["Synchronization Services"]
        VALIDATION["Validation and Conflict Detection"]
        REPOSITORIES["Repositories / Data Access"]
    end

    DB[("PostgreSQL")]

    USER --> UI
    UI --> STATE
    STATE --> API
    STATE --> OFFLINE
    OFFLINE --> IDB
    SYNC --> IDB
    SYNC --> API
    PWA --> CACHE

    API --> ROUTES
    ROUTES --> AUTH
    ROUTES --> SERVICES
    ROUTES --> SYNCSVC
    SERVICES --> VALIDATION
    SYNCSVC --> VALIDATION
    VALIDATION --> REPOSITORIES
    REPOSITORIES --> DB
```

### Main Architecture Components

| Component | Responsibility |
|---|---|
| React frontend | Displays dashboards, inspection forms, sites, templates, users, and synchronization status |
| Application state | Manages UI state and application interactions |
| API client | Sends authenticated HTTP requests to FastAPI |
| Offline data layer | Reads and writes locally persisted records |
| IndexedDB / Dexie | Stores downloaded data, inspection answers, and pending operations |
| Synchronization engine | Pushes local changes and pulls server-side changes |
| Service worker | Caches the application shell and approved static assets |
| FastAPI backend | Handles authentication, business logic, validation, and synchronization |
| PostgreSQL | Stores authoritative shared application data |

---

## High-Level Design (HLD)

HLD describes the overall structure of the system, its major components, and how they communicate.

### 1. Architectural Style

Fieldmark uses:

- Client-server architecture.
- Offline-first frontend architecture.
- REST-based communication.
- Layered backend organization.
- Local-first persistence for offline inspection work.

### 2. Major Modules

**Authentication and User Management**
- User login and logout.
- Session restoration and token refresh.
- Administrator and inspector roles.
- Backend-enforced authorization.

**Site Management**
- Create and manage inspection sites.
- Maintain site information.
- Make authorized site information available to inspectors.

**Checklist Template Management**
- Create and manage reusable checklist templates.
- Maintain checklist items and template revisions.
- Associate inspection assignments with their template revision.

**Inspection Management**
- Create inspection assignments.
- Assign inspections to inspectors.
- Download inspection data for offline use.
- Save answers and track inspection status.

**Offline Data Management**
- Persist inspection data in IndexedDB.
- Maintain local records across browser restarts.
- Isolate locally stored data by authenticated user.

**Synchronization Management**
- Maintain a durable queue of pending operations.
- Upload local changes.
- Download authorized server changes.
- Retry temporary failures.
- Detect and expose conflicts for resolution.

### 3. Deployment Architecture

The project is configured for deployment using Vercel Services:

```mermaid
flowchart TB
    USER["User's Browser"]
    VERCEL["Vercel - Single Project / HTTPS Origin"]

    USER --> VERCEL

    subgraph VERCEL
        FRONTEND["React / Vite / PWA Frontend"]
        BACKEND["FastAPI Backend"]
        ROUTER["API and SPA Routing"]
    end

    DB[("Managed PostgreSQL")]

    VERCEL --> ROUTER
    ROUTER -->|"Application routes"| FRONTEND
    ROUTER -->|"/api/* and health routes"| BACKEND
    BACKEND --> DB
```

The root `vercel.json` configures application and API routing. The production deployment uses a same-origin API path, helping the browser application and authentication cookies operate under the same HTTPS origin.

---

## Low-Level Design (LLD)

LLD explains how individual modules, data structures, database entities, and processing flows work internally.

The repository contains dedicated database, frontend, security, and offline synchronization design documents.

### 1. Backend Layer Design

The backend follows a layered organization:

```mermaid
flowchart TD
    CLIENT["Frontend API Request"]
    ROUTER["FastAPI Routes"]
    SCHEMA["Pydantic Schemas"]
    SERVICE["Service Layer - Business Logic"]
    REPO["Repository / Data Access Layer"]
    ORM["SQLAlchemy Models"]
    DB[("PostgreSQL")]

    CLIENT --> ROUTER
    ROUTER --> SCHEMA
    SCHEMA --> SERVICE
    SERVICE --> REPO
    REPO --> ORM
    ORM --> DB
```

| Layer | Responsibility |
|---|---|
| API routes | Receive HTTP requests and return responses |
| Schemas | Validate incoming and outgoing data |
| Services | Apply business rules and coordinate operations |
| Repositories | Handle database access |
| Models | Represent database entities through SQLAlchemy |
| Alembic | Manage database schema migrations |

### 2. Database Design

PostgreSQL is the central source of truth for shared application data.

The database design documents the following core entities:

| Entity / Table | Purpose |
|---|---|
| `users` | Stores administrator and inspector accounts |
| `refresh_tokens` | Stores refresh-token session information |
| `sites` | Stores inspection locations |
| `checklist_templates` | Stores checklist template revisions |
| `checklist_items` | Stores questions/items belonging to templates |
| `inspections` | Stores inspection assignments |
| `inspection_results` | Stores inspection submission/result information |
| `inspection_answers` | Stores answers to checklist items |
| `sync_devices` | Tracks registered synchronization devices |
| `sync_operations` | Tracks submitted synchronization operations |
| `sync_changes` | Tracks changes available for synchronization |
| `sync_conflicts` | Stores synchronization conflict information |

### Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ refresh_tokens : has
    users ||--o{ inspections : assigned_to
    users ||--o{ inspections : created_by
    users ||--o{ sync_devices : registers
    users ||--o{ sync_operations : submits

    sites ||--o{ inspections : contains

    checklist_templates ||--o{ checklist_items : contains
    checklist_templates ||--o{ inspections : uses

    inspections ||--o| inspection_results : produces
    inspections ||--o{ inspection_answers : contains
    checklist_items ||--o{ inspection_answers : answered_by

    sync_devices ||--o{ sync_operations : submits
    sync_devices ||--o{ sync_changes : tracks

    sync_operations ||--o| sync_conflicts : may_create
    users ||--o{ sync_conflicts : resolves
```

**Database design principles:**
- UUID-based identifiers for core entities.
- Foreign keys to maintain relationships.
- Unique constraints for fields such as email and site code.
- Timestamps for record creation and modification.
- Version numbers for version-controlled records.
- Alembic migrations for schema changes.

Refer to [`docs/database-design.md`](docs/database-design.md) for the detailed schema and constraints.

### 3. Offline Storage Design

The browser uses IndexedDB through Dexie.js for persistent local storage.

The local data layer is responsible for retaining the information needed to continue inspection work offline.

The synchronization design includes local data structures for:

- Local user context.
- Downloaded sites.
- Inspection assignments.
- Checklist templates.
- Inspection answers.
- Pending synchronization operations.
- Synchronization state and conflict information.

The service worker caches application resources; it is not used as the database for inspection records or authenticated API responses.

### 4. Offline Synchronization Flow

```mermaid
flowchart TD
    START["Inspector Opens an Assigned Inspection"]
    EDIT["Inspector Enters or Updates Answers"]
    VALIDATE["Validate Input"]
    SAVE["Save Changes to IndexedDB"]
    QUEUE["Create / Update Pending Sync Operation"]
    CHECK{"Internet Available?"}
    WAIT["Keep Work Locally and Retry Later"]
    PUSH["Send Pending Operation to FastAPI"]
    SERVER["Validate User, Payload and Record Version"]
    RESULT{"Operation Accepted?"}
    CONFLICT["Record Conflict for Explicit Resolution"]
    SUCCESS["Mark Operation as Synchronized"]
    PULL["Pull Authorized Server Changes"]
    APPLY["Apply Changes and Cursor Safely to Local Storage"]
    END["Synchronization Complete"]

    START --> EDIT
    EDIT --> VALIDATE
    VALIDATE --> SAVE
    SAVE --> QUEUE
    QUEUE --> CHECK
    CHECK -->|No| WAIT
    WAIT --> CHECK
    CHECK -->|Yes| PUSH
    PUSH --> SERVER
    SERVER --> RESULT
    RESULT -->|No - conflict| CONFLICT
    RESULT -->|Yes| SUCCESS
    SUCCESS --> PULL
    PULL --> APPLY
    APPLY --> END
```

**Synchronization principles:**
1. Save inspection changes locally before depending on the network.
2. Keep pending operations in persistent local storage.
3. Use stable operation identifiers to support idempotent retries.
4. Validate record versions on the server.
5. Preserve conflicting changes for explicit resolution.
6. Apply pulled changes and advance synchronization cursors safely.
7. Keep synchronization status visible to the user.

### 5. Authentication and Authorization Design

The documented authentication design includes:

- JWT access tokens.
- HTTP-only refresh-token cookies.
- Argon2id password hashing.
- CSRF cookie/header protection.
- Backend role checks for `ADMIN` and `INSPECTOR`.
- Secure cookie behavior in production.

The frontend can control what users see, but the backend is responsible for enforcing permissions.

### 6. Error Handling and Recovery

The offline synchronization design addresses:
- Temporary network failures.
- Retryable synchronization operations.
- Duplicate operation prevention.
- Stale record versions.
- Conflicting changes.
- Persistence of pending work across browser restarts.

Refer to [`docs/offline-sync-design.md`](docs/offline-sync-design.md) and [`docs/security-design.md`](docs/security-design.md) for the detailed rules.

---

## Application Workflow

1. An administrator signs in.
2. The administrator creates or manages inspection sites.
3. The administrator creates checklist templates.
4. The administrator assigns inspections to inspectors.
5. An inspector signs in and downloads assigned inspections.
6. The inspector completes the inspection, even without internet access.
7. Answers and pending operations are saved in IndexedDB.
8. When connectivity returns, the synchronization engine uploads pending operations.
9. The backend validates and processes the operations.
10. Authorized server changes are downloaded and conflicts are presented for resolution.

---

## Repository Structure

```text
Fieldmark/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── models/
│   ├── alembic/
│   ├── scripts/
│   ├── tests/
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── e2e/
│   ├── public/
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   ├── database-design.md
│   ├── api-contracts.md
│   ├── offline-sync-design.md
│   ├── security-design.md
│   ├── frontend-design.md
│   ├── development-phases.md
│   ├── testing-strategy.md
│   ├── phase13-qa-report.md
│   └── deployment.md
│
├── scripts/
├── .github/
├── vercel.json
└── README.md
```

---

## Prerequisites

Install the following before running the application:

- Git
- Python 3.12 recommended (the backend project allows Python 3.10+)
- Node.js 20.19+ or 22.12+
- npm
- PostgreSQL
- Playwright Chromium (only if running end-to-end tests)

---

## Getting Started

Follow these steps to clone and run Fieldmark locally.

### 1. Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/06naresh/Fieldmark.git
cd Fieldmark
```

### 2. Set Up PostgreSQL

Start PostgreSQL and create a development user and two databases: one for application development and another for backend tests.

Open the PostgreSQL shell (`psql`) and execute:

```sql
CREATE USER fieldmark_user WITH PASSWORD 'CHANGE_ME';

CREATE DATABASE field_inspection_db
    OWNER fieldmark_user;

CREATE DATABASE field_inspection_test_db
    OWNER fieldmark_user;
```

Use your own secure local password. Do not commit database credentials.

### 3. Set Up the Backend

Open a terminal at the repository root:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate it.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
source .venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

Create the environment file.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Update `backend/.env` with your local configuration:

```env
APP_ENV=development
SECRET_KEY=REPLACE_WITH_A_LONG_RANDOM_DEVELOPMENT_SECRET
DATABASE_URL=postgresql+psycopg://fieldmark_user:CHANGE_ME@localhost:5432/field_inspection_db
TEST_DATABASE_URL=postgresql+psycopg://fieldmark_user:CHANGE_ME@localhost:5432/field_inspection_test_db
FRONTEND_ORIGINS=http://localhost:5173
```

Replace `CHANGE_ME` with the password you configured in PostgreSQL. Generate a strong development secret for `SECRET_KEY`.

Run database migrations:

```bash
python -m alembic upgrade head
```

Start the backend server:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at:

| Resource | URL |
|---|---|
| API base URL | http://localhost:8000/api/v1 |
| Swagger API documentation | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |
| Readiness check | http://localhost:8000/health/ready |

Keep this terminal running.

### 4. Set Up the Frontend

Open a second terminal at the repository root:

```bash
cd Fieldmark/frontend
```

If you are already inside the `Fieldmark` directory, use:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the frontend environment file.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

The local frontend configuration should use:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open the application:

**http://localhost:5173**

Keep both backend and frontend terminals running while developing.

---

## User Accounts

### Inspector Account

Public signup creates an `INSPECTOR` account.

Open:

http://localhost:5173/signup

Create an inspector account through the application.

### Administrator Account

The initial administrator is created through the backend bootstrap script.

Run this from the `backend/` directory with the virtual environment activated.

**Windows PowerShell:**

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="CHANGE_ME"
$env:BOOTSTRAP_ADMIN_NAME="Fieldmark Administrator"

python -m scripts.bootstrap_admin
```

**macOS / Linux:**

```bash
export BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
export BOOTSTRAP_ADMIN_PASSWORD="CHANGE_ME"
export BOOTSTRAP_ADMIN_NAME="Fieldmark Administrator"

python -m scripts.bootstrap_admin
```

Use a secure password. After logging in as an administrator, use the application's user-management functionality to manage additional users.

---

## Running Tests

### Backend Tests

From the `backend/` directory, with the virtual environment activated:

```bash
python -m pytest -q
```

Check migration consistency:

```bash
python -m alembic check
```

Backend tests require `TEST_DATABASE_URL` to point to the separate test database. Never point it to production.

### Frontend Tests and Commands

Run these commands from the `frontend/` directory:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Run TypeScript checks and create a production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit and component tests |
| `npm run typecheck:e2e` | Type-check Playwright tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run qa:frontend` | Run the frontend quality checks and E2E suite |

### End-to-End Tests

Install Playwright Chromium once:

```bash
cd frontend
npx playwright install chromium
```

Then run:

```bash
npm run qa:frontend
```

The E2E suite uses a test administrator and the configured development PostgreSQL database. Do not run it against production.

---

## Security

- Do not commit `.env` files, database passwords, JWT secrets, bootstrap credentials, or deployment tokens.
- Passwords are hashed using Argon2id.
- Refresh tokens are handled through HTTP-only cookies.
- CSRF protection is used for cookie-authenticated requests.
- Production cookies are configured to use `Secure`.
- The backend is the final authority for authentication, authorization, validation, and version checks.
- Production API documentation is disabled according to the deployment configuration.

---

## Deployment

Fieldmark is configured to deploy through Vercel Services.

The root `vercel.json` configures:

- API and health-check routing to the FastAPI backend.
- Frontend routing to the Vite/PWA application.
- SPA fallback behavior.
- Security headers and PWA-related cache rules.
- Backend build-time migration handling.

Production uses a same-origin `/api/v1` API base. Configure database credentials, application secrets, public application URL, and other environment variables in the Vercel project settings.

For complete deployment instructions, see [`docs/deployment.md`](docs/deployment.md).

After deployment, the repository includes a non-destructive smoke-check script:

```bash
python scripts/smoke_production.py https://<deployment-domain>
```

---

## Project Documentation

Additional engineering documentation is available in the `docs/` directory:

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements |
| [Architecture](docs/architecture.md) | System architecture and component responsibilities |
| [Database Design](docs/database-design.md) | Database schema, entities, and relationships |
| [API Contracts](docs/api-contracts.md) | API request and response contracts |
| [Offline Sync Design](docs/offline-sync-design.md) | Offline storage, synchronization, retries, and conflicts |
| [Security Design](docs/security-design.md) | Authentication and authorization design |
| [Frontend Design](docs/frontend-design.md) | Frontend modules and design |
| [Development Phases](docs/development-phases.md) | Development plan and phases |
| [Testing Strategy](docs/testing-strategy.md) | Testing approach |
| [QA Report](docs/phase13-qa-report.md) | Quality assurance results |
| [Deployment](docs/deployment.md) | Deployment and operations guidance |

---

## License

Add the project's chosen license here if and when one is selected.
