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
| Current development phase | Phase 4 — Core Backend Features (Completed) |
| Current feature | None — Phase 4 complete; Phase 5 pending approval |
| Overall status | In Progress |

---

# 4. Overall Development Status

Update this table whenever a development phase changes.

| Phase | Development phase | Status | Completion |
|---|---|---|---:|
| 0 | Project Foundation | Completed | 100% |
| 1 | Database Foundation | Completed | 100% |
| 2 | Backend Foundation | Completed | 100% |
| 3 | Authentication and Authorization | Completed | 100% |
| 4 | Core Backend Features | Completed | 100% |
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
| Current phase | Phase 4 — Core Backend Features |
| Current feature | None — Phase 4 complete; Phase 5 pending approval |
| Feature status | Completed |
| Last updated | 2026-11-21 |

## 5.1 Current objective

**Objective:**

Implement Phase 4 Core Backend Features: user, site, checklist template, inspection assignment/execution, answer, submission, and dashboard APIs with business-rule validation and authorization.

## 5.2 Current implementation scope

**Included:**

- Admin user management with activation/deactivation and session revocation.
- Admin site management with optimistic concurrency and inspector-scoped read access.
- Admin checklist template creation, immutable revisions, item management, and inspector-scoped read access.
- Admin inspection assignment and lifecycle updates.
- Inspector assignment access, start, answers, and submission.
- Idempotent submission via a unique `submission_id` column.
- Dashboard summaries scoped by role.
- Pagination, filtering, validation, consistent error envelope, and automated tests.

**Not included:**

- Frontend screens and offline flows.
- Synchronization endpoints (Phase 5).
- Conflict resolution UI/API (later phase).
- Device registration endpoints (Phase 5).

**Dependencies:**

- Phases 0–3 are completed and verified.
- User approved Phase 4.
- User approved separate revision IDs and adding a `submission_id` column with an Alembic migration.

## 5.3 Current progress

| Task | Status | Notes |
|---|---|---|
| Review requirements | Completed | Phase 4 tasks, API contracts, database design, and test expectations verified |
| Inspect existing implementation | Completed | Models, dependencies, exceptions, schemas, and test fixtures inspected |
| Resolve document ambiguities | Completed | User selected separate revision IDs and an explicit `submission_id` column |
| Prepare implementation plan | Completed | Schemas, repositories, services, routers, migration, and tests planned |
| Implement feature | Completed | User, site, checklist, inspection, submission, dashboard, migration, and router wiring implemented |
| Add automated tests | Completed | 11 Phase 4 integration tests plus 8 PostgreSQL schema/migration tests |
| Execute tests | Completed | Final full backend suite passed: 53 tests, 0 failures |
| Review implementation | Completed | Five audit findings and two follow-up validation regressions fixed; final re-audit passed |
| Update documentation | Completed | Tracker, database design, and API contract record verified results and decisions |

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

## Feature: F-006/F-007 Authentication and Authorization

| Property | Value |
|---|---|
| Feature ID | F-006, F-007 |
| Development phase | Phase 3 |
| Status | Completed |
| Priority | Critical |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### F-006.1 Feature objective

Implement secure backend authentication and reusable authorization enforcement for all future protected endpoints.

### F-006.2 Requirements

- [x] Verify Phase 3 tasks, API contracts, security requirements, and test expectations.
- [x] Verify existing FastAPI infrastructure and `users`/`refresh_tokens` models.
- [x] Obtain decisions for CSRF strategy and login rate limiting.
- [x] Implement Argon2id password hashing and verification.
- [x] Implement login, refresh, current-user, and logout endpoints.
- [x] Implement JWT access-token creation and validation.
- [x] Implement refresh-token hashing, rotation, reuse detection, and revocation.
- [x] Implement secure refresh-cookie and double-submit CSRF handling.
- [x] Implement authentication, role, and resource authorization dependencies.
- [x] Implement in-memory login rate limiting.
- [x] Add authentication and authorization tests.
- [x] Execute tests and verify all Phase 3 acceptance criteria.

### F-006.3 Files created

| File path | Purpose | Status |
|---|---|---|
| `backend/app/core/security.py` | Password hashing, JWT, refresh-token hashing, token and cookie helpers | Created |
| `backend/app/core/rate_limit.py` | Bounded in-memory failed-login rate limiter | Created |
| `backend/app/core/permissions.py` | Role definitions and resource authorization helpers | Created |
| `backend/app/dependencies/__init__.py` | Dependency package marker | Created |
| `backend/app/dependencies/authentication.py` | Current-user and CSRF dependencies | Created |
| `backend/app/dependencies/authorization.py` | Role and resource authorization dependencies | Created |
| `backend/app/schemas/auth.py` | Authentication request and response schemas | Created |
| `backend/app/repositories/__init__.py` | Repository package marker | Created |
| `backend/app/repositories/auth_repository.py` | User and refresh-token data access | Created |
| `backend/app/services/__init__.py` | Service package marker | Created |
| `backend/app/services/auth_service.py` | Authentication and refresh-session business logic | Created |
| `backend/app/api/v1/endpoints/auth.py` | Authentication endpoints | Created |
| `backend/tests/test_password_hashing.py` | Argon2id hashing tests | Created |
| `backend/tests/test_authentication.py` | Login, token, refresh, CSRF, logout, and rate-limit tests | Created |
| `backend/tests/test_authorization.py` | RBAC and resource-authorization tests | Created |

### F-006.4 Files modified

| File path | Modification |
|---|---|
| `backend/app/core/config.py` | Added JWT, cookie, CSRF, and rate-limit settings; production cookie enforcement |
| `backend/.env.example` | Documented new environment settings with placeholders |
| `backend/app/api/v1/router.py` | Mounted the authentication router |
| `backend/app/schemas/__init__.py` | Exported authentication schemas |
| `backend/tests/conftest.py` | Added API app/client and test-user fixtures |
| `progress-tracker.md` | Recorded implementation, decisions, results, and handoff |

### F-006.5 Decisions

- Argon2id is used through the existing `passlib[argon2]` dependency; refresh tokens are stored as SHA-256 hashes.
- Double-submit CSRF cookies plus Origin allowlisting protect refresh and logout, as selected by the user.
- A bounded in-memory login rate limiter is used, as selected by the user; it is process-local and not suitable for multi-instance deployment without a shared store.
- JWT role claims are validated but the current database user is authoritative for role and active status.
- Resource dependencies read path parameters at request time so FastAPI can inject them.
- Production settings force refresh and CSRF cookies to `Secure` regardless of the supplied value.

### F-006.6 Verification

- Full backend suite: 39 passed, 0 failed.
- Phase 3 acceptance criteria all verified.
- Python compilation and Alembic drift check passed.

### F-006.7 Handoff instructions

Phase 3 is complete and verified. Stop at the phase boundary. Begin Phase 4 — Core Backend Features only after explicit approval.

---

## Feature: F-008/F-009/F-010/F-011/F-029 Core Backend Features

| Property | Value |
|---|---|
| Feature ID | F-008, F-009, F-010, F-011, F-029 |
| Development phase | Phase 4 |
| Status | Completed |
| Priority | High |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### Phase4.1 Feature objective

Implement the approved backend business APIs required before frontend integration.

### Phase4.2 Requirements

- [x] Verify Phase 4 tasks, API contracts, database design, and test expectations.
- [x] Obtain decisions for revision identity and submission idempotency storage.
- [x] Implement user management APIs.
- [x] Implement site management APIs.
- [x] Implement checklist template and item APIs with immutable revisions.
- [x] Implement inspection assignment, start, answer, and submission APIs.
- [x] Add `submission_id` to `inspection_results` with an Alembic migration.
- [x] Implement dashboard summary API.
- [x] Add automated tests and verify all Phase 4 acceptance criteria.
- [x] Fix five independent audit findings and two follow-up validation regressions.

### Phase4.3 Files created

| File path | Purpose | Status |
|---|---|---|
| `backend/alembic/versions/0002_submission_id.py` | Adds unique `inspection_results.submission_id` | Created and applied |
| `backend/alembic/versions/0003_submitted_version.py` | Adds required `inspection_results.submitted_version` | Created and applied |
| `backend/alembic/versions/0004_template_key.py` | Adds revision-lineage `checklist_templates.template_key` | Created and applied |
| `backend/app/api/v1/endpoints/users.py` | User-management endpoints | Created |
| `backend/app/api/v1/endpoints/sites.py` | Site-management endpoints | Created |
| `backend/app/api/v1/endpoints/checklist_templates.py` | Checklist template, revision, and item endpoints | Created |
| `backend/app/api/v1/endpoints/inspections.py` | Inspection assignment, start, answer, and submission endpoints | Created |
| `backend/app/api/v1/endpoints/dashboard.py` | Role-scoped dashboard summary endpoint | Created |
| `backend/app/repositories/user_repository.py` | User data access and session revocation | Created |
| `backend/app/repositories/site_repository.py` | Site data access and inspector authorization scoping | Created |
| `backend/app/repositories/checklist_repository.py` | Template/item data access and revision checks | Created |
| `backend/app/repositories/inspection_repository.py` | Inspection, answer, and result data access with row locks | Created |
| `backend/app/repositories/dashboard_repository.py` | Dashboard count queries | Created |
| `backend/app/schemas/users.py` | User request/response schemas | Created |
| `backend/app/schemas/sites.py` | Site request/response schemas | Created |
| `backend/app/schemas/checklists.py` | Checklist template/item schemas and answer-choice helper | Created |
| `backend/app/schemas/inspections.py` | Inspection, answer, and submission schemas | Created |
| `backend/app/schemas/dashboard.py` | Dashboard summary schema | Created |
| `backend/app/services/user_service.py` | User business rules and activation behavior | Created |
| `backend/app/services/site_service.py` | Site business rules and version checks | Created |
| `backend/app/services/checklist_service.py` | Revision immutability and item management | Created |
| `backend/app/services/inspection_service.py` | Inspection lifecycle, answer validation, and idempotent submission | Created |
| `backend/app/services/dashboard_service.py` | Role-aware dashboard aggregation | Created |
| `backend/app/services/concurrency.py` | Optimistic version check helper | Created |
| `backend/app/core/db_errors.py` | Shared constraint-error and transaction handling | Created |
| `backend/tests/test_core_features.py` | Phase 4 API, authorization, lifecycle, idempotency, and dashboard tests | Created |

### Phase4.4 Files modified

| File path | Modification |
|---|---|
| `backend/app/core/config.py` | Added `MAX_PAGE_SIZE` |
| `backend/.env.example` | Documented `MAX_PAGE_SIZE` |
| `backend/app/database/models/inspection.py` | Added `submission_id` and its unique constraint |
| `backend/app/dependencies/authorization.py` | Added template-revision resource authorization |
| `backend/app/dependencies/__init__.py` | Exported the new authorization dependency |
| `backend/app/repositories/__init__.py` | Exported Phase 4 repositories |
| `backend/app/schemas/__init__.py` | Exported `PaginationParams` |
| `backend/app/schemas/common.py` | Added reusable pagination query parameters |
| `backend/app/services/__init__.py` | Exported Phase 4 services |
| `backend/app/api/v1/router.py` | Mounted all Phase 4 routers |
| `backend/tests/test_database_schema.py` | Verified latest revision and `submission_id` uniqueness |
| `docs/database-design.md` | Documented `submission_id`, `submitted_version`, and `template_key` |
| `docs/api-contracts.md` | Documented duplicate-submission payload identity |
| `progress-tracker.md` | Recorded implementation, audit remediation, decisions, results, and handoff |

### Phase4.5 Important decisions

- Each published checklist revision is a separate row with its own UUID, as selected by the user; existing inspections keep the originally assigned revision ID and version.
- `inspection_results.submission_id` is unique, as selected by the user; duplicate submissions return the original result and changed payloads return a conflict.
- Published revisions referenced by inspections are immutable; items can only be changed before a revision is used.
- Inspectors receive role-scoped sites, templates, inspections, answers, and dashboard counts.
- Site, template, inspection, answer, and submission updates use row locks or version checks to avoid overwriting newer state.
- Database integrity errors are translated to `409 CONFLICT` rather than exposed as internal errors.
- A retried submission must match the original summary, overall status, and submitted version; the result response always reports `SUBMITTED`.
- All revisions in one checklist lineage share a durable `template_key`; version allocation locks that lineage and allocates from committed state.
- PATCH requests distinguish omitted fields from explicit `null`, so nullable fields can be cleared while non-clearable fields and invalid choice options are rejected with `422`.

### Phase4.6 Verification

- Final full backend suite: 53 passed, 0 failed.
- Python compilation: passed.
- OpenAPI generation: 25 documented paths.
- Applied migrations `0002_submission_id`, `0003_submitted_version`, and `0004_template_key` to `field_inspection_db`.
- Alembic drift check: no new upgrade operations detected.
- Six new API regression tests and two new schema regression tests cover pagination offsets, revision-lineage version allocation, submitted-version idempotency, explicit-null PATCH clearing, choice-option validation, and operation-owner conflict scoping.
- Final independent read-only audit found no blocking correctness, authorization, transaction, or error-semantics regressions.
- All Phase 4 acceptance criteria listed in `docs/development-phases.md` are verified.

### Phase4.7 Known issues

- Non-blocking `httpx`/TestClient and passlib/argon2 deprecation warnings remain from installed dependencies.

### Phase4.8 Handoff instructions

Phase 4 is complete and verified. Stop at the phase boundary. Begin Phase 5 — Backend Synchronization Foundation only after explicit approval.

### Phase4.9 Audit remediation (Completed)

An independent read-only audit found five issues after the initial 45-test verification. Phase 4 was reopened, and all five issues were fixed and regression-tested.

| Finding | Planned fix | Status |
|---|---|---|
| Pagination used page number as row offset | Add `PaginationParams.offset` as `(page - 1) * page_size` and use it in all four collection endpoints | Fixed and regression-tested |
| Checklist revision version allocation could produce duplicate versions | Add user-approved `template_key` lineage, lock all rows in that lineage, and allocate from the maximum committed `template_version` | Fixed and regression-tested |
| Submission idempotency ignored `version` and returned inconsistent status | Persist `submitted_version` in migration `0003_submitted_version`, compare it on retry, and always report `SUBMITTED` for the result | Fixed and regression-tested |
| Inspector dashboard conflict counts were scoped by entity ID | Join `sync_conflicts.operation_id` to `sync_operations.id` and filter by `sync_operations.user_id` | Fixed and regression-tested |
| PATCH schemas could not clear nullable fields | Distinguish omitted fields from explicit `null` with `model_fields_set` and `exclude_unset` | Fixed and regression-tested |

The user approved both additional schema changes: persisted `submitted_version` and the `template_key` revision-lineage identifier.

### Phase4.10 Final audit remediation (Completed)

The final read-only audit confirmed the original five findings are fixed, but found two regressions caused by explicit-null PATCH support. Both were fixed and regression-tested:

| Finding | Fix | Status |
|---|---|---|
| Explicit `null` could be applied to non-clearable PATCH fields (`SiteUpdate.name/address`, `InspectionUpdate.title`, `ChecklistItemUpdate.question/is_required/display_order`) and reached the database as a `409` | Field validators reject explicit `null`, producing `422 VALIDATION_ERROR`; omitted fields remain valid for partial PATCH | Fixed and regression-tested |
| Clearing `options` on a choice question could leave no valid answers | `ChecklistService.update_item` validates final options against the stored `response_type` before mutation and raises `422 VALIDATION_ERROR` | Fixed and regression-tested |

No database schema change was required for these fixes. A second read-only audit confirmed no new blocking regressions.

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
| F-006 | Authentication | 3 | Completed | security-design.md, api-contracts.md |
| F-007 | Role-based access control | 3 | Completed | security-design.md |
| F-008 | User management | 4 | Completed | PRD.md, api-contracts.md |
| F-009 | Site management | 4 | Completed | PRD.md, api-contracts.md |
| F-010 | Checklist templates | 4 | Completed | PRD.md, database-design.md |
| F-011 | Inspection assignments | 4 | Completed | PRD.md, api-contracts.md |
| F-029 | Dashboard summary API | 4 | Completed | PRD.md, api-contracts.md |
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
| `/api/v1/auth/login` | POST | Yes | Yes | Argon2id verification, generic errors, rate limiting, cookies |
| `/api/v1/auth/refresh` | POST | Yes | Yes | CSRF, rotation, reuse detection, expiry checks |
| `/api/v1/auth/me` | GET | Yes | Yes | Bearer JWT validation; database user is authoritative |
| `/api/v1/auth/logout` | POST | Yes | Yes | CSRF, current/all-device revocation, cookie clearing |
| `/api/v1/users` | GET/POST | Yes | Yes | Admin-only; list supports search and pagination |
| `/api/v1/users/{user_id}` | GET/PATCH | Yes | Yes | Self-role-change and self-deactivation are rejected |
| `/api/v1/users/{user_id}/status` | PATCH | Yes | Yes | Deactivation revokes refresh sessions and sync devices |
| `/api/v1/sites` | GET/POST | Yes | Yes | Inspector list is assignment-scoped |
| `/api/v1/sites/{site_id}` | GET/PATCH | Yes | Yes | Version-checked updates; inspector read access is scoped |
| `/api/v1/sites/{site_id}/status` | PATCH | Yes | Yes | Version-checked status change |
| `/api/v1/checklist-templates` | GET/POST | Yes | Yes | Admin create; inspector list is assignment-scoped |
| `/api/v1/checklist-templates/{template_id}` | GET | Yes | Yes | Supports `template_version` query |
| `/api/v1/checklist-templates/{template_id}/revisions` | POST | Yes | Yes | Creates a separate immutable revision row |
| `/api/v1/checklist-templates/{template_id}/status` | PATCH | Yes | Yes | Deactivation preserves existing assignments |
| `/api/v1/checklist-templates/{template_id}/items` | POST | Yes | Yes | Rejects edits to published revisions |
| `/api/v1/checklist-templates/{template_id}/items/{item_id}` | PATCH | Yes | Yes | Rejects edits to published revisions |
| `/api/v1/inspections` | GET/POST | Yes | Yes | Admin create; inspector list is ownership-scoped |
| `/api/v1/inspections/{inspection_id}` | GET/PATCH | Yes | Yes | Detail includes site, template, items, answers, status, and version |
| `/api/v1/inspections/{inspection_id}/start` | POST | Yes | Yes | Version checked and row locked |
| `/api/v1/inspections/{inspection_id}/answers` | GET | Yes | Yes | Authorized users only |
| `/api/v1/inspections/{inspection_id}/answers/{checklist_item_id}` | PUT | Yes | Yes | Type, template-revision, state, and base-version checks |
| `/api/v1/inspections/{inspection_id}/submit` | POST | Yes | Yes | Required-answer validation and unique `submission_id` idempotency |
| `/api/v1/dashboard/summary` | GET | Yes | Yes | Admin and inspector results are permission-scoped |
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
| Backend unit tests | Completed | 53 passed | Full backend pytest suite |
| Backend integration tests | Completed | 53 passed | PostgreSQL temporary schema; includes all Phase 4 API, lifecycle, idempotency, pagination, PATCH validation, and conflict-scoping tests |
| API tests | Completed | 53 passed | Full suite includes health, readiness, versioning/docs, CORS, error formats, logging, auth, authorization, and Phase 4 endpoints |
| Database tests | Completed | 8 passed | Schema, constraints, relationships, latest migrations, unique `submission_id`, `submitted_version`, `template_key`, and cursor ordering |
| Authentication tests | Completed | 19 passed | 4 password-hashing and 15 authentication tests |
| RBAC tests | Completed | 12 passed | Phase 3 authorization tests plus Phase 4 endpoint authorization coverage |
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
| 2026-11-21 | `.venv/Scripts/python.exe -m compileall -q app tests` | Static | 1 | 0 | Phase 3 Python compilation succeeded |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (first Phase 3 run) | Full backend suite | 31 | 7 | Cookie domain, repeated logout setup, and path-parameter dependency failures found |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (final Phase 3 run) | Full backend suite | 39 | 0 | All Phase 3 tests passed after fixes |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic check` | Migration drift | 1 | 0 | No new upgrade operations detected after Phase 3 |
| 2026-11-21 | `.venv/Scripts/python.exe -m compileall -q app tests` | Static | 1 | 0 | Phase 4 Python compilation succeeded |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (first Phase 4 run) | Full backend suite | 38 | 1 | Existing migration test still expected `0001_initial_schema` |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (second Phase 4 run) | Full backend suite | 42 | 3 | Found list-response assertion errors, unhandled duplicate site-code constraint, and a stale answer-version test assumption |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (third Phase 4 run) | Full backend suite | 44 | 1 | Found incorrect stale answer-version expectation in the new lifecycle test |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (final Phase 4 run) | Full backend suite | 45 | 0 | All Phase 3 and Phase 4 tests passed after fixes |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic current` | Migration state | 1 | 0 | Development database was at `0001_initial_schema` |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic upgrade head` | Migration | 1 | 0 | Applied `0002_submission_id` to `field_inspection_db` |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic check` | Migration drift | 1 | 0 | No new upgrade operations detected after Phase 4 |
| 2026-11-21 | `.venv/Scripts/python.exe -m compileall -q app tests` | Static | 1 | 0 | Phase 4 audit-remediation compilation succeeded |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (first audit-remediation run) | Full backend suite | 49 | 2 | Found cross-test revision-lineage collision and incorrect conflict-scoping test setup; both fixed |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (final audit-remediation run) | Full backend suite | 52 | 0 | All Phase 3, Phase 4, and seven new regression tests passed |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic current` | Migration state | 1 | 0 | Development database was at `0002_submission_id` |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic upgrade head` | Migration | 1 | 0 | Applied `0003_submitted_version` and `0004_template_key` to `field_inspection_db` |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic check` | Migration drift | 1 | 0 | No new upgrade operations detected after audit remediation |
| 2026-11-21 | `.venv/Scripts/python.exe -m compileall -q app tests` | Static | 1 | 0 | Final PATCH-validation remediation compiled successfully |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (final validation run) | Full backend suite | 53 | 0 | All Phase 3, Phase 4, and eight audit/validation regression tests passed |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic check` | Migration drift | 1 | 0 | No new upgrade operations detected after final validation |
| 2026-11-21 | `.venv/Scripts/python.exe -c "from app.main import create_app; app=create_app(); print(len(app.openapi()['paths']))"` | OpenAPI generation | 1 | 0 | 25 documented API paths |

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
| D-009 | 2026-11-21 | Use Argon2id for passwords and SHA-256 hashes for refresh tokens | Approved security design; raw refresh tokens are never stored | `backend/app/core/security.py`, `backend/app/services/auth_service.py` |
| D-010 | 2026-11-21 | Use double-submit CSRF cookies with Origin allowlisting for refresh and logout | User-selected strategy; protects cookie-based state changes without exposing the refresh token to JavaScript | `backend/app/core/security.py`, `backend/app/api/v1/endpoints/auth.py` |
| D-011 | 2026-11-21 | Use a bounded process-local in-memory login rate limiter | User-selected strategy for this phase; documented as single-instance only | `backend/app/core/rate_limit.py` |
| D-012 | 2026-11-21 | Make current database user authoritative for role and active status | Prevents stale or forged JWT role claims from granting access | `backend/app/dependencies/authentication.py`, `backend/app/dependencies/authorization.py` |
| D-013 | 2026-11-21 | Represent each checklist revision as a separate row with its own UUID | User-selected resolution of the approved-schema ambiguity; existing inspections keep their assigned revision | Phase 4 checklist APIs and `docs/database-design.md` |
| D-014 | 2026-11-21 | Add a unique `inspection_results.submission_id` column | User-selected resolution; gives durable, client-generated submission idempotency with changed-payload detection | Migration `0002_submission_id`, inspection service, `docs/database-design.md` |
| D-015 | 2026-11-21 | Use shared flush/commit helpers that translate integrity errors to `409 CONFLICT` | Prevents duplicate site codes and similar database constraints from becoming internal server errors | `backend/app/core/db_errors.py`, Phase 4 repositories and services |
| D-016 | 2026-11-21 | Use row locks and version checks for mutable business resources | Prevents stale writes from overwriting newer server state | Site, checklist, inspection, answer, and submission services |
| D-017 | 2026-11-21 | Persist `submitted_version` with each inspection result | User-approved change; makes the submitted version part of idempotency payload identity and prevents a reused `submission_id` with a different version from succeeding | Migration `0003_submitted_version`, `InspectionResult`, inspection submission service, API and database documentation |
| D-018 | 2026-11-21 | Add a stable `template_key` shared by all rows in a checklist revision lineage | User-approved change; separate revision UUIDs otherwise provide no durable lineage key for safe version allocation | Migration `0004_template_key`, `ChecklistTemplate`, checklist repository/service, database documentation |
| D-019 | 2026-11-21 | Reject explicit `null` for non-clearable PATCH fields and validate final choice options before mutation | Preserves `422` request-validation semantics and prevents PATCH requests from creating database constraint errors or choice items with no valid answers | `SiteUpdate`, `InspectionUpdate`, `ChecklistItemUpdate`, `ChecklistService.update_item`, `test_core_features.py` |

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
| 2026-11-21 | OpenCode (Big Pickle) | Phase 3 | F-006/F-007 | Added Argon2id hashing, JWT access tokens, rotating hashed refresh cookies, CSRF, rate limiting, logout/revocation, RBAC/resource dependencies, auth endpoints, and 25 auth/authz tests | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 4 | F-008/F-009/F-010/F-011/F-029 | Added user, site, checklist, inspection, answer, submission, and dashboard APIs; added unique `submission_id` migration; enforced RBAC, version checks, immutable revisions, and idempotent submission; added six integration tests | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 4 | Audit remediation | Fixed pagination offsets, `template_key` revision lineage, full submission-payload idempotency, operation-owner conflict scoping, and explicit-null PATCH semantics; added migrations `0003_submitted_version` and `0004_template_key` plus seven regression tests | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 4 | Final validation remediation | Rejected explicit null for non-clearable PATCH fields, validated final choice options before mutation, added two regression tests, and completed a second independent audit; final suite passed 53 tests | Completed |

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

Phase 4 — Core Backend Features.

**Current phase:**

Phase 4 — Core Backend Features (Completed). Next phase is Phase 5 — Backend Synchronization Foundation.

**Current feature:**

None — F-008/F-009/F-010/F-011/F-029 are completed.

**Current feature status:**

Completed.

**Last completed task:**

Implemented and verified user, site, checklist template/revision/item, inspection assignment, start, answer, submission, and dashboard APIs. Added migrations `0002_submission_id`, `0003_submitted_version`, and `0004_template_key`; enforced role-scoped queries, version checks, row locks, immutable published revisions, full-payload idempotent submissions, durable revision lineage, pagination offsets, operation-owner conflict scoping, explicit-null PATCH semantics, and safe choice-option updates. Final verification was 53 passing backend tests, Python compilation, successful migration upgrades, OpenAPI generation, a clean Alembic drift check, and a second independent read-only audit with no blocking findings.

**Current stopping point:**

Phase 4 boundary reached. All acceptance criteria verified. Do not start Phase 5 without approval.

## Files to inspect first

1. `progress-tracker.md`
2. `docs/development-phases.md` — Phase 5 requirements
3. `docs/api-contracts.md` — synchronization, device, and conflict contracts
4. `backend/app/api/v1/router.py`
5. `backend/app/api/v1/endpoints/inspections.py`
6. `backend/app/services/inspection_service.py`
7. `backend/app/core/db_errors.py`
8. `backend/alembic/versions/0003_submitted_version.py`
9. `backend/alembic/versions/0004_template_key.py`
10. `backend/tests/test_core_features.py`

## Work remaining

- [ ] No Phase 4 work remains.
- [ ] Wait for approval before starting Phase 5 — Backend Synchronization Foundation.

## Known problems

- Non-blocking: installed Starlette/TestClient and passlib/argon2 versions emit deprecation warnings. No tests fail.
- Non-blocking: optional PATCH fields are displayed as nullable in OpenAPI even though runtime validators reject `null` for non-clearable fields; runtime behavior is correct.
- Dashboard synchronization statistics reflect server-side operation records only; the frontend must combine them with its IndexedDB queue, as required by `docs/api-contracts.md`.
- The login rate limiter remains process-local; a multi-instance deployment needs a shared limiter.

## Next agent instructions

The next agent must:

1. Read `AGENTS.md` and this progress tracker.
2. Confirm Phase 4 is marked Completed and verified.
3. Stop at the phase boundary.
4. Begin Phase 5 only after explicit user approval.
5. Reuse the Phase 3 authentication dependencies, Phase 4 services/repositories, shared error envelope, and 12-table schema.
6. Keep synchronization logic separate from ordinary CRUD logic.
7. Preserve stable operation IDs, idempotency, and commit-ordered pull cursors.

**Exact next action:**

Report Phase 4 completion and wait for approval to start Phase 5 — Backend Synchronization Foundation.

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