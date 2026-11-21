# Fieldmark — Development Progress Tracker

## 1. Purpose

This document is the central development progress tracker for **Fieldmark**.

Its purpose is to maintain implementation history, current development status, and handoff information across multiple AI coding sessions.

Different AI agents may work on Fieldmark at different times. An agent must be able to open this file and understand the current implementation state without relying on previous chat conversations.

**This file is the shared source of truth for implementation progress.**

Every AI coding agent working on Fieldmark must read and update this document.

---

## 2. Mandatory Instructions for AI Agents

Before starting any development task, every AI agent must:

1. Read `AGENTS.md`.
2. Read the relevant project documentation.
3. Read this `progress-tracker.md`.
4. Inspect the actual project files.
5. Compare the recorded progress with the existing implementation.
6. Identify the current development phase.
7. Identify the latest incomplete feature.
8. Continue from the actual implementation state.

Never assume that the progress recorded in this file is automatically correct.

Always verify important details against the actual source code, database migrations, and test results.

### 2.1 Before implementing a feature

The agent must:

- Identify the feature being implemented.
- Check whether another agent has already started it.
- Review completed dependencies.
- Identify files that need to be created.
- Identify existing files that need modification.
- Understand the feature's acceptance criteria.
- Check whether any blockers exist.

### 2.2 During implementation

The agent must:

- Update the feature status when work begins.
- Keep implementation notes concise but useful.
- Record important architectural decisions.
- Record files created and modified.
- Record tests executed and their actual results.
- Record errors that remain unresolved.
- Avoid marking incomplete work as completed.

### 2.3 Before stopping work

Before ending a development session, the agent must update:

- Current development phase.
- Current feature.
- Feature status.
- Completed tasks.
- Incomplete tasks.
- Files created.
- Files modified.
- Tests executed.
- Test results.
- Known issues.
- Important decisions.
- Next steps.
- Exact continuation instructions.

The next agent must be able to continue without repeating completed work.

---

# 3. Project Overview

| Property | Value |
|---|---|
| Project | Fieldmark |
| Project type | Offline-first field inspection application |
| Frontend | React + TypeScript + Vite |
| Backend | FastAPI + Python |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Local storage | IndexedDB + Dexie |
| Authentication | JWT |
| State management | Zustand + TanStack Query |
| Testing | pytest, Vitest, React Testing Library, Playwright |
| Current development phase | Phase 2 — Backend Foundation (Completed) |
| Current feature | None — Phase 3 pending approval |
| Overall status | In Progress |

---

# 4. Overall Development Status

Update this table whenever a development phase changes.

| Phase | Development phase | Status | Completion |
|---|---|---|---:|
| 0 | Project Foundation | Completed | 100% |
| 1 | Database Foundation | Completed | 100% |
| 2 | Backend Foundation | Completed | 100% |
| 3 | Authentication and Authorization | Not Started | 0% |
| 4 | Core Backend Features | Not Started | 0% |
| 5 | Backend Synchronization Foundation | Not Started | 0% |
| 6 | Frontend Foundation | Not Started | 0% |
| 7 | Frontend Authentication and Admin Features | Not Started | 0% |
| 8 | Inspector Workflow | Not Started | 0% |
| 9 | Offline Persistence | Not Started | 0% |
| 10 | Synchronization Engine | Not Started | 0% |
| 11 | Conflict Management | Not Started | 0% |
| 12 | PWA and Offline Application Shell | Not Started | 0% |
| 13 | Integration and Quality Assurance | Not Started | 0% |
| 14 | Deployment and Release | Not Started | 0% |

### Status values

Use only these status values:

- `Not Started`
- `In Progress`
- `Blocked`
- `Under Review`
- `Completed`

Completion percentages must represent actual verified work, not estimated effort.

A phase cannot be marked `Completed` until its acceptance criteria in `docs/development-phases.md` have been verified.

---

# 5. Current Development Session

Update this section whenever a new feature implementation session begins.

| Property | Current value |
|---|---|
| Session date | 2026-11-21 |
| Agent/session identifier | OpenCode (Big Pickle) |
| Current phase | Phase 2 — Backend Foundation |
| Current feature | F-005 FastAPI foundation |
| Feature status | Completed |
| Last updated | 2026-11-21 |

## 5.1 Current objective

**Objective:**

Implement Phase 2 Backend Foundation: reusable FastAPI infrastructure for shared responses, errors, structured logging, request correlation, CORS, API versioning, and health checks.

## 5.2 Current implementation scope

**Included:**

- FastAPI application configuration and API v1 router prefix.
- Shared Pydantic response schemas matching `docs/api-contracts.md`.
- Centralized exception handling for application, validation, HTTP, and unexpected errors.
- Structured JSON logging with UTC timestamps and request correlation IDs.
- Explicit CORS configuration for the development frontend.
- PostgreSQL-backed readiness check and public basic health check.
- Backend API tests using FastAPI TestClient and the existing PostgreSQL test configuration.

**Not included:**

- Authentication and authorization endpoints (Phase 3).
- Business CRUD endpoints (Phase 4).
- Synchronization endpoints (Phase 5).
- Frontend changes.

**Dependencies:**

- Phase 1 database foundation is completed and verified.
- User approved beginning Phase 2.

## 5.3 Current progress

| Task | Status | Notes |
|---|---|---|
| Review requirements | Completed | Phase 2 tasks and acceptance criteria verified |
| Inspect existing implementation | Completed | Existing FastAPI, config, and database session files inspected |
| Prepare implementation plan | Completed | Infrastructure-only scope; shared envelopes, exceptions, logging, health tests |
| Implement feature | Completed | FastAPI factory, shared schemas, exceptions, logging, middleware, CORS, v1 router, and health endpoints added |
| Add automated tests | Completed | Nine Phase 2 API/infrastructure tests added |
| Execute tests | Completed | 14 total backend tests passed |
| Review implementation | Completed | Security review removed raw exception messages from server logs |
| Update documentation | Completed | Tracker updated with verified results and handoff |

Update the task statuses as work progresses.

---

# 6. Feature Implementation Tracker

Create one entry for every major feature.

Do not overwrite previous feature entries when starting another feature.

Use this structure:

## Feature: F-001 Project Setup

| Property | Value |
|---|---|
| Feature ID | F-001 |
| Development phase | Phase 0 |
| Status | Completed |
| Priority | High |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | Cline |

### 6.1 Feature objective

Establish the root directory layout, frontend repository scaffold, backend FastAPI scaffold, environment configuration templates, and Git exclusions.

### 6.2 Requirements

- [x] Initialize repository structure (`frontend/`, `backend/`, `docs/`).
- [x] Create root `.gitignore` to protect credentials and virtual environments.
- [x] Create `backend/requirements.txt` and `pyproject.toml`.
- [x] Create `backend/app/main.py` with FastAPI health check endpoints and CORS.
- [x] Create `backend/app/core/config.py` for environment variables.
- [x] Create `backend/.env.example` with non-credentialed placeholders.
- [x] Create `frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `index.html`, and `frontend/.env.example`.

### 6.3 Implementation tasks

- [x] Create root `.gitignore` and `README.md`
- [x] Create backend directory and base files
- [x] Create frontend directory and base files
- [x] Verify directory structure and configuration parsing

### 6.4 Files created

| File path | Purpose | Status |
|---|---|---|
| `.gitignore` | Git exclusion pattern | Created |
| `README.md` | Project overview & developer guide | Created |
| `backend/requirements.txt` | Python dependency manifest | Created |
| `backend/pyproject.toml` | Python project & test configuration | Created |
| `backend/.env.example` | Backend environment template | Created |
| `backend/app/__init__.py` | Package marker | Created |
| `backend/app/main.py` | FastAPI application entry point | Created |
| `backend/app/core/__init__.py` | Package marker | Created |
| `backend/app/core/config.py` | Environment configuration settings | Created |
| `frontend/package.json` | Node.js package manifest | Created |
| `frontend/vite.config.ts` | Vite build & alias configuration | Created |
| `frontend/tsconfig.json` | TypeScript configuration | Created |
| `frontend/tailwind.config.js` | Tailwind CSS configuration | Created |
| `frontend/index.html` | Application HTML entry point | Created |
| `frontend/.env.example` | Frontend environment template | Created |

### 6.5 Files modified

| File path | Modification | Reason |
|---|---|---|
| `progress-tracker.md` | Status update | Record Phase 0 progress and handoff |

### 6.6 Implementation details

- Root `.gitignore` ignores `.env`, `.env.local`, virtual environments (`venv/`, `.venv/`), Node dependencies (`node_modules/`), build outputs (`dist/`), and IDE configurations.
- `backend/app/core/config.py` uses `pydantic-settings` to parse `DATABASE_URL` and app options from environment variables / `.env`.
- `backend/app/main.py` provides FastAPI setup with CORS middleware, `/health`, and `/health/ready` endpoints.
- `frontend/package.json` specifies React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Dexie.js, React Hook Form, Zod, Axios, Lucide React, and Vitest.

### 6.7 Important decisions

| Decision | Reason | Impact |
|---|---|---|
| Use `pydantic-settings` for backend config | Type-safe environment parsing with fallback defaults | Environment variables strictly validated |
| Dual DB support via `postgresql+psycopg` | Allows identical code for local PostgreSQL and production Neon | Switch environments via `DATABASE_URL` only |
| Non-credentialed `.env.example` | Prevents credential leaks in Git | Security compliance |

### 6.8 Testing status

| Test category | Status | Result |
|---|---|---|
| Unit tests | Completed | Config & health endpoint verifications passed |
| Integration tests | Pending | To be executed in Phase 1 & 2 |
| API tests | Completed | FastAPI health endpoints verified |
| Database tests | Pending | Phase 1 |
| Security tests | Completed | `.gitignore` & non-credentialed `.env.example` verified |
| Frontend tests | Pending | Phase 6 |
| E2E tests | Pending | Phase 13 |

### 6.9 Known issues

| Issue | Severity | Status | Notes |
|---|---|---|---|
| None | Low | Resolved | Phase 0 setup complete |

### 6.10 Remaining work

- [ ] Proceed to Phase 1 — Database Foundation (SQLAlchemy models, Alembic migrations for 15 core tables).

### 6.11 Feature acceptance criteria

- [x] All required foundation files created.
- [x] Credentials protected from Git.
- [x] Non-secret placeholders in environment templates.
- [x] Health check endpoints configured.
- [x] Documentation synchronized.

### 6.12 Handoff instructions

**Current stopping point:**

Phase 0 (Project Foundation) is 100% complete and verified.

**Next agent must:**

1. Read `AGENTS.md` and `progress-tracker.md`.
2. Inspect `backend/` and `frontend/` directories.
3. Begin **Phase 1: Database Foundation** (`docs/development-phases.md`).
4. Configure SQLAlchemy base models and Alembic migrations for the 15 core tables: `users`, `refresh_tokens`, `sites`, `checklist_templates`, `checklist_template_versions`, `checklist_items`, `inspections`, `inspection_results`, `inspection_correction_requests`, `inspection_answers`, `sync_devices`, `sync_operations`, `sync_conflicts`, `sync_changes`, and `audit_logs`.
5. Update `progress-tracker.md` before stopping.

> Correction (2026-11-21): This historical handoff note was incorrect. The approved documentation defines 12 initial tables, and the user confirmed that scope. See technical decision D-002. Phase 1 was completed with the 12 approved tables.
- [ ] Documentation updated.
- [ ] Feature reviewed against its requirements.

### 6.12 Handoff instructions

**Current stopping point:**

Explain exactly where implementation stopped.

**Next agent must:**

1. Read the relevant source files.
2. Verify the current implementation.
3. Continue the incomplete tasks.
4. Avoid repeating completed tasks.
5. Run the required tests.
6. Update this tracker.

**Recommended next action:**

Write the exact next implementation task.

---

## Feature: F-002/F-003/F-004 Database Foundation

| Property | Value |
|---|---|
| Feature ID | F-002, F-003, F-004 |
| Development phase | Phase 1 |
| Status | Completed |
| Priority | High |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### F-002.1 Feature objective

Implement the approved PostgreSQL schema, SQLAlchemy models, and Alembic migration foundation for the 12 core tables defined in `docs/database-design.md`.

### F-002.2 Requirements

- [x] Configure SQLAlchemy declarative models and database session.
- [x] Configure Alembic script environment and initial revision.
- [x] Define the 12 approved core tables.
- [x] Define UUID primary keys, UTC timestamp fields, and version fields.
- [x] Define foreign keys, uniqueness constraints, check constraints, and indexes.
- [x] Design a commit-safe synchronization change-feed cursor.
- [x] Write PostgreSQL integration tests for schema, constraints, relationships, migration, and cursor ordering.
- [x] Apply the initial migration to a clean PostgreSQL database.
- [x] Verify all acceptance criteria through executed tests.

### F-002.3 Files created

| File path | Purpose | Status |
|---|---|---|
| `backend/app/database/__init__.py` | Database package exports | Created |
| `backend/app/database/base.py` | SQLAlchemy declarative base | Created |
| `backend/app/database/session.py` | Engine, session factory, and FastAPI session dependency | Created |
| `backend/app/database/models/__init__.py` | Model registry imports | Created |
| `backend/app/database/models/user.py` | `users` and `refresh_tokens` models | Created |
| `backend/app/database/models/site.py` | `sites` model | Created |
| `backend/app/database/models/checklist.py` | `checklist_templates` and `checklist_items` models | Created |
| `backend/app/database/models/inspection.py` | Inspection, result, and answer models | Created |
| `backend/app/database/models/sync.py` | Sync device, operation, conflict, and change models | Created |
| `backend/alembic.ini` | Alembic configuration | Created |
| `backend/alembic/env.py` | Alembic environment using application settings | Created |
| `backend/alembic/script.py.mako` | Alembic revision template | Created |
| `backend/alembic/versions/0001_initial_schema.py` | Initial 12-table migration and cursor trigger | Created |
| `backend/tests/__init__.py` | Test package marker | Created |
| `backend/tests/conftest.py` | Temporary PostgreSQL schema and Alembic test fixtures | Created |
| `backend/tests/test_database_schema.py` | Schema, relationship, constraint, and migration tests | Created |
| `backend/tests/test_sync_changes_cursor.py` | Concurrent commit-order test for change positions | Created |

### F-002.4 Files modified

| File path | Modification | Reason |
|---|---|---|
| `backend/app/core/config.py` | Added `TEST_DATABASE_URL` | Separate automated-test database configuration |
| `backend/.env.example` | Documented `TEST_DATABASE_URL` | Keep test configuration explicit and non-secret |
| `docs/offline-sync-design.md` | Documented selected commit-ordered cursor strategy | Required by approved synchronization design |
| `progress-tracker.md` | Recorded Phase 1 status and handoff | Mandatory progress tracking |

### F-002.5 Implementation details

- All 12 approved tables are represented in `Base.metadata` and in migration `0001_initial_schema`.
- `sync_changes.change_position` is assigned by a `BEFORE INSERT` trigger that holds a transaction-scoped PostgreSQL advisory lock until commit, making allocation order equal to commit order.
- `updated_at` is maintained by SQLAlchemy `onupdate` handlers; this is the single application-level approach selected for mutable tables.
- Tests use a uniquely named PostgreSQL schema inside `TEST_DATABASE_URL` and drop only that generated schema; no database is created or dropped.

### F-002.6 Important decisions

| Decision | Reason | Impact |
|---|---|---|
| Implement 12 tables from approved docs | User confirmed the tracker's undocumented 15-table note was incorrect | Keeps schema aligned with PRD, architecture, database design, and development phases |
| Use advisory-lock cursor allocation | Prevents later committed changes from being skipped by pagination | Requires all sync change inserts to occur inside the business transaction |
| Use SQLAlchemy `onupdate` for `updated_at` | Consistent application-level approach permitted by database design | Direct database-side writes must set `updated_at` explicitly |

### F-002.7 Testing status

| Test category | Status | Result |
|---|---|---|
| Python compilation | Completed | Passed |
| Alembic revision history | Completed | Passed; single head `0001_initial_schema` |
| Offline migration SQL generation | Completed | Passed; 12 core tables plus cursor objects generated |
| Test collection | Completed | 5 tests collected |
| PostgreSQL integration tests | Completed | 5 passed |
| Alembic metadata check | Completed | No new upgrade operations detected |

### F-002.8 Known issues

| Issue | Severity | Status | Notes |
|---|---|---|---|
| None | Low | Resolved | Valid PostgreSQL URLs were supplied; all Phase 1 checks passed |

### F-002.9 Remaining work

- [ ] No Phase 1 work remains.
- [ ] Stop at the Phase 1 boundary and wait for approval before Phase 2 — Backend Foundation.

### F-002.10 Feature acceptance criteria

- [x] All required tables exist.
- [x] Foreign-key relationships work.
- [x] Constraints are enforced.
- [x] Alembic migrations run successfully.
- [x] Database connection works through the application.
- [x] Database design matches the approved documentation.

### F-002.11 Handoff instructions

Phase 1 is complete and verified. Stop at the phase boundary. Begin Phase 2 — Backend Foundation only after explicit approval.

---

## Feature: F-005 FastAPI Foundation

| Property | Value |
|---|---|
| Feature ID | F-005 |
| Development phase | Phase 2 |
| Status | Completed |
| Priority | High |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### F-005.1 Feature objective

Create the reusable FastAPI backend infrastructure required by Phase 2 without implementing authentication or business endpoints.

### F-005.2 Requirements

- [x] Verify the Python project, virtual environment, and backend dependencies.
- [x] Verify centralized environment settings and database sessions from earlier phases.
- [x] Verify CORS configuration requirements from the approved contracts.
- [x] Implement shared API response schemas.
- [x] Implement centralized exception handling.
- [x] Implement structured logging with request correlation IDs.
- [x] Configure API versioning and health endpoints.
- [x] Add backend API tests.
- [x] Execute and pass all backend tests.
- [x] Verify every Phase 2 acceptance criterion.

### F-005.3 Files created

| File path | Purpose | Status |
|---|---|---|
| `backend/app/core/logging.py` | JSON log formatter and root logging setup | Created |
| `backend/app/core/exceptions.py` | Domain errors and standardized exception handlers | Created |
| `backend/app/schemas/__init__.py` | Schema package exports | Created |
| `backend/app/schemas/common.py` | Shared response, pagination, and error schemas | Created |
| `backend/app/api/__init__.py` | API package marker | Created |
| `backend/app/api/v1/__init__.py` | API v1 package marker | Created |
| `backend/app/api/v1/router.py` | Versioned API router mounted at `/api/v1` | Created |
| `backend/app/api/v1/endpoints/__init__.py` | Endpoint package marker | Created |
| `backend/app/api/v1/endpoints/health.py` | Health and PostgreSQL readiness endpoints | Created |
| `backend/app/middleware/__init__.py` | Middleware package exports | Created |
| `backend/app/middleware/request_context.py` | Request ID assignment, response header, and completion logs | Created |
| `backend/tests/test_backend_foundation.py` | FastAPI foundation tests | Created |

### F-005.4 Files modified

| File path | Modification | Reason |
|---|---|---|
| `backend/app/main.py` | Added `create_app()` factory, structured logging setup, request middleware, CORS, exception handlers, health routes, and v1 router | Wire reusable backend foundation |
| `backend/app/core/config.py` | Added `API_PREFIX` and `LOG_LEVEL` | Centralized versioning and logging configuration |
| `backend/.env.example` | Documented `API_PREFIX` and `LOG_LEVEL` | Keep environment configuration explicit |
| `progress-tracker.md` | Recorded Phase 2 implementation and verified results | Mandatory progress tracking |

### F-005.5 Implementation details

- `GET /health` returns exactly `{"status": "healthy"}` as documented.
- `GET /health/ready` executes `SELECT 1` through the application database session and returns `{"status": "ready", "database": "connected"}`; database failures become a standardized 503 response.
- `RequestContextMiddleware` assigns or preserves an `X-Request-ID`, echoes it in the response, and emits one structured completion log entry without request bodies or query strings.
- Shared schemas support single resources, collections with pagination, action messages, and the approved error envelope.
- Exception handlers cover `AppError`, FastAPI request validation, Starlette HTTP errors, and unexpected exceptions with generic client messages.
- Unexpected exceptions are logged by type only, not raw message, to prevent credentials or tokens in exception text from entering logs.

### F-005.6 Important decisions

| Decision | Reason | Impact |
|---|---|---|
| Keep health endpoints unversioned at contract paths | `docs/api-contracts.md` explicitly defines `/health` and `/health/ready` | A separate versioned router is mounted at `/api/v1` for future business endpoints |
| Use standard-library JSON logging | Avoids adding an unnecessary dependency | Structured UTC logs include request IDs and resource path only |
| Use a FastAPI app factory | Allows tests to create isolated app instances without mutating the global app | Improves test isolation for handler verification |
| Do not log raw unexpected exception messages | Security design requires avoiding passwords and raw tokens in logs | Server logs include exception type only; clients receive a generic 500 message |

### F-005.7 Testing status

| Test category | Status | Result |
|---|---|---|
| Python compilation | Completed | Passed |
| Full backend pytest suite | Completed | 14 passed |
| Uvicorn startup check | Completed | Health, readiness, and docs returned 200 |
| Migration suite from Phase 1 | Completed | Still passing within the 14-test suite |
| CORS preflight | Completed | Development origin allowed with credentials |

### F-005.8 Known issues

| Issue | Severity | Status | Notes |
|---|---|---|---|
| Installed Starlette emits an `httpx`/`TestClient` deprecation warning | Low | Open | Non-blocking library warning; no failures |

### F-005.9 Remaining work

- [ ] No Phase 2 work remains.
- [ ] Stop at the phase boundary and wait for approval before Phase 3 — Authentication and Authorization.

### F-005.10 Feature acceptance criteria

- [x] FastAPI starts successfully.
- [x] PostgreSQL connection works.
- [x] Health endpoint responds correctly.
- [x] API version prefix is configured.
- [x] CORS works for the development frontend.
- [x] Application errors use consistent response formats.
- [x] Initial backend tests pass.

### F-005.11 Handoff instructions

Phase 2 is complete and verified. Stop at the phase boundary. Begin Phase 3 — Authentication and Authorization only after explicit approval.

---

# 7. Feature Register

Maintain a summary of all features.

Add a new row when a feature is identified.

| Feature ID | Feature | Phase | Status | Related documentation |
|---|---|---|---|---|
| F-001 | Project setup | 0 | Completed | development-phases.md |
| F-002 | PostgreSQL setup | 1 | Completed | database-design.md |
| F-003 | SQLAlchemy models | 1 | Completed | database-design.md |
| F-004 | Alembic migrations | 1 | Completed | database-design.md |
| F-005 | FastAPI foundation | 2 | Completed | architecture.md |
| F-006 | Authentication | 3 | Not Started | security-design.md, api-contracts.md |
| F-007 | Role-based access control | 3 | Not Started | security-design.md |
| F-008 | User management | 4 | Not Started | PRD.md, api-contracts.md |
| F-009 | Site management | 4 | Not Started | PRD.md, api-contracts.md |
| F-010 | Checklist templates | 4 | Not Started | PRD.md, database-design.md |
| F-011 | Inspection assignments | 4 | Not Started | PRD.md, api-contracts.md |
| F-012 | Inspection execution | 8 | Not Started | PRD.md, frontend-design.md |
| F-013 | Backend sync operations | 5 | Not Started | offline-sync-design.md |
| F-014 | Frontend foundation | 6 | Not Started | frontend-design.md |
| F-015 | Admin dashboard | 7 | Not Started | frontend-design.md |
| F-016 | Inspector dashboard | 8 | Not Started | frontend-design.md |
| F-017 | IndexedDB persistence | 9 | Not Started | offline-sync-design.md |
| F-018 | Durable sync queue | 9 | Not Started | offline-sync-design.md |
| F-019 | Push synchronization | 10 | Not Started | offline-sync-design.md |
| F-020 | Pull synchronization | 10 | Not Started | offline-sync-design.md |
| F-021 | Retry mechanism | 10 | Not Started | offline-sync-design.md |
| F-022 | Conflict detection | 11 | Not Started | offline-sync-design.md |
| F-023 | Conflict resolution | 11 | Not Started | offline-sync-design.md |
| F-024 | Sync Center | 11 | Not Started | frontend-design.md |
| F-025 | PWA support | 12 | Not Started | frontend-design.md |
| F-026 | Integration testing | 13 | Not Started | testing-strategy.md |
| F-027 | E2E testing | 13 | Not Started | testing-strategy.md |
| F-028 | Production deployment | 14 | Not Started | development-phases.md |

This register is a planning baseline. Add or split feature entries when the approved implementation plan requires it. Do not remove required features without approval.

---

# 8. API Implementation Tracker

Track API implementation separately.

| API endpoint | Method | Implemented | Tested | Notes |
|---|---|---|---|---|
| `/health` | GET | Yes | Yes | Public basic health check |
| `/health/ready` | GET | Yes | Yes | Verifies PostgreSQL with `SELECT 1` |
| `/api/v1/auth/login` | POST | No | No | |
| `/api/v1/auth/refresh` | POST | No | No | |
| `/api/v1/auth/me` | GET | No | No | |
| `/api/v1/auth/logout` | POST | No | No | |
| `/api/v1/users` | GET/POST | No | No | |
| `/api/v1/sites` | GET/POST | No | No | |
| `/api/v1/inspections` | GET/POST | No | No | |
| `/api/v1/sync/push` | POST | No | No | |
| `/api/v1/sync/pull` | GET | No | No | |
| `/api/v1/sync/status` | GET | No | No | |

This is a high-level tracking list, not a replacement for `docs/api-contracts.md`.

Add the remaining approved endpoints as implementation progresses.

Only mark an endpoint implemented after verifying its actual behavior.

---

# 9. Database Implementation Tracker

Track database implementation and migrations.

| Database item | Created | Migration applied | Tested | Notes |
|---|---|---|---|---|
| users | Yes | Yes | Yes | Verified by schema and constraint tests |
| refresh_tokens | Yes | Yes | Yes | Verified by schema tests |
| sites | Yes | Yes | Yes | Verified by relationship and constraint tests |
| checklist_templates | Yes | Yes | Yes | Verified by template-revision foreign key |
| checklist_items | Yes | Yes | Yes | Verified by relationship and constraint tests |
| inspections | Yes | Yes | Yes | Verified by relationship and date-order constraint tests |
| inspection_results | Yes | Yes | Yes | Verified by schema tests |
| inspection_answers | Yes | Yes | Yes | Verified by uniqueness and relationship tests |
| sync_operations | Yes | Yes | Yes | Verified by schema tests |
| sync_devices | Yes | Yes | Yes | Verified by schema tests |
| sync_conflicts | Yes | Yes | Yes | Verified by resolution constraint tests |
| sync_changes | Yes | Yes | Yes | Includes commit-ordered position trigger; concurrency test passed |

Add supporting tables only when required by the approved database design.

Record important migration identifiers and database changes in the relevant feature entry.

---

# 10. Offline and Synchronization Tracker

Because synchronization is a critical Fieldmark feature, maintain its progress separately.

| Capability | Status | Verified |
|---|---|---|
| Dexie database initialization | Not Started | No |
| Local inspection repository | Not Started | No |
| Local answer persistence | Not Started | No |
| Durable operation queue | Not Started | No |
| Stable operation IDs | Not Started | No |
| Payload hash validation | Not Started | No |
| Dependency ordering | Not Started | No |
| Push synchronization | Not Started | No |
| Per-operation push results | Not Started | No |
| Pull synchronization | Not Started | No |
| Commit-safe pull cursor | Not Started | No |
| Atomic local pull application | Not Started | No |
| Retry with backoff and jitter | Not Started | No |
| Tombstone handling | Not Started | No |
| Conflict detection | Not Started | No |
| Conflict resolution | Not Started | No |
| Multi-tab coordination | Not Started | No |
| Account-scoped local data | Not Started | No |
| Interrupted-sync recovery | Not Started | No |
| Sync Center UI | Not Started | No |

Do not mark a capability as verified merely because its code exists. Record the test that proves it works.

---

# 11. Testing Progress

Track testing at project level.

| Test category | Status | Last result | Notes |
|---|---|---|---|
| Backend unit tests | Not Started | Not Run | |
| Backend integration tests | Completed | 14 passed | 5 PostgreSQL database tests plus 9 API foundation tests |
| API tests | Completed | 9 passed | Health, readiness, versioning/docs, CORS, error formats, logging |
| Database tests | Completed | 5 passed | Schema, constraints, relationships, migration, and cursor ordering |
| Authentication tests | Not Started | Not Run | |
| RBAC tests | Not Started | Not Run | |
| Frontend unit tests | Not Started | Not Run | |
| Component tests | Not Started | Not Run | |
| IndexedDB tests | Not Started | Not Run | |
| Offline tests | Not Started | Not Run | |
| Sync tests | Not Started | Not Run | |
| Conflict tests | Not Started | Not Run | |
| PWA tests | Not Started | Not Run | |
| E2E tests | Not Started | Not Run | |
| Security checks | Not Started | Not Run | |
| Performance tests | Not Started | Not Run | |
| Accessibility checks | Not Started | Not Run | |

### Testing record requirements

For every important test run, record:

- Date.
- Command.
- Test category.
- Number of passed tests.
- Number of failed tests.
- Relevant failure details.
- Whether the failure was fixed.

Do not report tests as passed if they were not actually executed.

### 11.1 Testing runs

| Date | Command | Category | Passed | Failed | Details |
|---|---|---|---:|---:|---|
| 2026-11-21 | `.venv/Scripts/python.exe -m compileall -q app alembic tests` | Static | 1 | 0 | Python compilation succeeded |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic history` | Migration config | 1 | 0 | Single head `0001_initial_schema` |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic upgrade head --sql` | Migration SQL | 1 | 0 | Offline SQL generated successfully |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest --collect-only -q` | Test collection | 1 | 0 | 5 tests collected; no execution |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` | PostgreSQL integration | 5 | 0 | Schema, constraints, relationships, migration check, commit-ordered cursor |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic upgrade head` | Migration | 1 | 0 | Applied `0001_initial_schema` to `field_inspection_db` |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic check` | Migration drift | 1 | 0 | No new upgrade operations detected |
| 2026-11-21 | `get_db()` + `SELECT 1` | Application DB connection | 1 | 0 | Session dependency connected successfully |
| 2026-11-21 | `.venv/Scripts/python.exe -m compileall -q app alembic tests` | Static | 1 | 0 | Phase 2 compilation succeeded |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` | Full backend suite | 14 | 0 | 5 database tests and 9 Phase 2 foundation tests passed |
| 2026-11-21 | Uvicorn startup with `/health`, `/health/ready`, `/api/v1/docs` HTTP checks | Runtime | 3 | 0 | All returned 200; structured request logs emitted |

---

# 12. Technical Decisions Log

Maintain a chronological record of significant implementation decisions.

| ID | Date | Decision | Reason | Affected areas |
|---|---|---|---|---|
| D-001 | Not recorded | Initial approved stack: React, TypeScript, FastAPI, PostgreSQL | Project architecture | Entire application |
| D-002 | 2026-11-21 | Implement the 12 tables approved in PRD, architecture, database design, and development phases | User confirmed the tracker's 15-table handoff was incorrect | Phase 1 schema and migration |
| D-003 | 2026-11-21 | Allocate sync change positions under a transaction-scoped advisory lock | Prevents commit-order inversion and skipped changes during paginated pull | `sync_changes`, migration `0001_initial_schema`, offline-sync design |
| D-004 | 2026-11-21 | Maintain `updated_at` through SQLAlchemy `onupdate` handlers | Consistent application-level approach permitted by the database design | All mutable SQLAlchemy models |
| D-005 | 2026-11-21 | Use a uniquely named PostgreSQL schema inside `TEST_DATABASE_URL` for tests | User could not create another database; SQLite is prohibited and would not validate PostgreSQL-specific behavior | `backend/tests/conftest.py`; no database is created or dropped |
| D-006 | 2026-11-21 | Keep health endpoints at contract paths and mount a separate empty v1 router | API contract defines `/health` and `/health/ready`; future business APIs remain versioned at `/api/v1` | `backend/app/api/v1/`, `backend/app/main.py` |
| D-007 | 2026-11-21 | Use a FastAPI app factory and standard-library JSON logging | Improves isolated testing and avoids a new dependency | `backend/app/main.py`, `backend/app/core/logging.py`, `backend/tests/test_backend_foundation.py` |
| D-008 | 2026-11-21 | Log unexpected exceptions by type only | Prevents raw credentials or tokens in exception messages from entering logs | `backend/app/core/exceptions.py` |

When adding a decision:

1. Explain the problem.
2. Record the selected approach.
3. Explain why it was selected.
4. Identify affected files or modules.
5. Identify relevant documentation.
6. Record approval when the decision changes an approved design.

Do not use this log to bypass approval for architectural changes.

---

# 13. Issues and Blockers

Track unresolved issues centrally.

| Issue ID | Description | Severity | Status | Owner/agent | Next action |
|---|---|---|---|---|---|
| B-001 | Valid PostgreSQL credentials were initially unavailable | High | Resolved | OpenCode session | User added `backend/.env`; migration and all tests passed |

### Severity levels

- `Critical`: Data loss, security vulnerability, or major application failure.
- `High`: Major functionality is broken.
- `Medium`: A feature is partially broken or has a significant limitation.
- `Low`: Minor defect or improvement.

### Blocker rules

If a task is blocked:

- Mark its feature `Blocked`.
- Describe the exact reason.
- Identify what is required to unblock it.
- Do not silently work around a critical architectural blocker.
- Continue unrelated tasks only when they do not introduce inconsistent implementation.

---

# 14. Change History

Add a new entry whenever a development session makes meaningful changes.

| Date | Agent/session | Phase | Feature | Summary | Status |
|---|---|---|---|---|---|
| 2026-11-21 | Initial setup | Phase 0 | Docs | Project documentation prepared | Planning |
| 2026-11-21 | Cline (Act Mode) | Phase 0 | F-001 | Initialized Phase 0 root, backend & frontend foundation files | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 1 | F-002/F-003/F-004 | Added and verified 12-table SQLAlchemy models, Alembic initial migration, commit-safe change-feed cursor, and PostgreSQL integration tests | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 2 | F-005 | Added FastAPI app factory, shared response schemas, centralized errors, structured logging, request IDs, CORS, API v1 router, health endpoints, and nine foundation tests | Completed |

For each entry, include a concise summary of:

- Work completed.
- Important files changed.
- Tests executed.
- Remaining work.

Keep older history entries. Do not rewrite historical entries to make incomplete work appear complete.

---

# 15. Latest Handoff Summary

This is the most important section for an agent continuing from another session.

Update it before stopping work.

## Current state

**Last completed phase:**

Phase 2 — Backend Foundation.

**Current phase:**

Phase 2 — Backend Foundation (Completed). Next phase is Phase 3 — Authentication and Authorization.

**Current feature:**

F-005 — FastAPI foundation (Completed).

**Current feature status:**

Completed.

**Last completed task:**

Added and verified the FastAPI app factory, shared response/error schemas, structured logging, request correlation, centralized exception handlers, CORS, API v1 router, and health endpoints. The full backend suite passed with 14 tests, and a real Uvicorn startup check passed.

**Current stopping point:**

Phase 2 boundary reached. All acceptance criteria verified. Do not start Phase 3 without approval.

## Files to inspect first

1. `progress-tracker.md`
2. `docs/development-phases.md` — Phase 3 requirements
3. `docs/security-design.md`
4. `docs/api-contracts.md`
5. `backend/app/main.py`
6. `backend/app/core/exceptions.py`
7. `backend/app/core/logging.py`
8. `backend/app/api/v1/`
9. `backend/tests/test_backend_foundation.py`

## Work remaining

- [ ] No Phase 2 work remains.
- [ ] Wait for approval before starting Phase 3 — Authentication and Authorization.

## Known problems

- Non-blocking: the installed Starlette/TestClient version emits an `httpx` deprecation warning. No tests fail.

## Next agent instructions

The next agent must:

1. Read `AGENTS.md` and this progress tracker.
2. Confirm Phase 2 is marked Completed and verified.
3. Stop at the phase boundary.
4. Begin Phase 3 only after explicit user approval.
5. Reuse the existing app factory, exception handlers, logging, and v1 router rather than duplicating them.
6. Preserve the approved error envelope and 12-table schema.

**Exact next action:**

Report Phase 2 completion and wait for approval to start Phase 3 — Authentication and Authorization.

---

# 16. Rules for Updating This Document

These rules are mandatory.

### Rule 1: Update at the beginning

Before implementing a feature, update the current session and feature status.

### Rule 2: Update during implementation

When a meaningful milestone is completed, update the relevant feature entry.

### Rule 3: Update after file changes

Record every important created or modified file.

### Rule 4: Update after testing

Record actual test commands and results.

### Rule 5: Update when blocked

Record blockers immediately instead of leaving the feature status misleading.

### Rule 6: Update before stopping

Always update the latest handoff summary.

### Rule 7: Preserve history

Do not delete previous completed feature records or change history.

### Rule 8: Verify before claiming completion

A feature is complete only after its acceptance criteria are verified.

### Rule 9: Keep it concise but useful

Do not copy source code into this document.

Record paths, behavior, decisions, test outcomes, and next steps.

### Rule 10: Keep documentation synchronized

If implementation changes an approved design, obtain the required approval and update the relevant design document.

### Rule 11: Do not trust stale status

Inspect the actual implementation before continuing from another agent's recorded progress.

### Rule 12: Never fabricate progress

Do not mark a file as created, an API as implemented, a test as passed, or a phase as completed unless it has actually been verified.

---

# 17. Final Handoff Principle

Every AI coding session must leave Fieldmark in a state that another AI coding agent can understand.

The next agent should never have to guess:

- What was implemented.
- What is incomplete.
- Which files are involved.
- Which decisions were made.
- Which tests passed.
- Which errors remain.
- What must happen next.

**The progress tracker must always answer one important question:**

"Exactly where should the next developer or AI agent continue working, without repeating completed work or breaking existing functionality?"

This is a mandatory part of Fieldmark development.