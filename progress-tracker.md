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
| Current development phase | Phase 9 — Offline Persistence (Completed; uncommitted changes in working tree) |
| Current feature | F-017 IndexedDB Persistence and F-018 Durable Sync Queue |
| Overall status | Phase 8 committed as `c5c9eec`; Phase 9 implemented and verified, awaiting commit decision |

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
| 5 | Backend Synchronization Foundation | Completed | 100% |
| 6 | Frontend Foundation | Completed | 100% |
| 7 | Frontend Authentication and Admin Features | Completed | 100% |
| 8 | Inspector Workflow | Completed | 100% |
| 9 | Offline Persistence | Completed | 100% |
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
| Current phase | Phase 9 — Offline Persistence (Completed; stopped at phase boundary) |
| Current feature | F-017 IndexedDB Persistence and F-018 Durable Sync Queue |
| Feature status | Completed |
| Last updated | 2026-11-21 |

## 5.1 Current objective

**Objective:**

Implement Phase 9 Offline Persistence: configure Dexie, define the approved local tables and versioning, add account-scoped repositories, download inspections and checklist templates, persist answers and a durable operation queue locally, handle IndexedDB errors, expose offline status, and verify refresh/restart behavior.

## 5.2 Current implementation scope

**Included:**

- Dexie database `fieldmark_local_db` with the eight approved local tables.
- Local users, sites, inspections, templates, answers, metadata, conflicts, and synchronization queue records.
- Account-scoped local repositories and atomic local transactions.
- Inspection and checklist download services.
- Durable replacement for the Phase 8 in-memory draft repository.
- Local answer persistence before server confirmation.
- Offline-aware data access and status indicators for inspector workflows.
- IndexedDB tests, including refresh/restart and account isolation.

**Not included:**

- Push/pull synchronization engine, retry/backoff, dependency execution, and Sync Center behavior; these remain Phase 10+.
- Conflict resolution UI; Phase 9 only defines local conflict records.
- PWA installation and offline application shell; these remain Phase 12.

**Dependencies:**

- Phases 0–8 are completed and verified.
- Phase 8 was committed as `c5c9eec feat: implement phase 8 inspector workflow`; it was not pushed.
- Approved local schema and behavior were reviewed in `docs/offline-sync-design.md` and `docs/development-phases.md`.

## 5.3 Current progress

| Task | Status | Notes |
|---|---|---|
| Review Phase 9 documentation | Completed | Development phases, offline-sync design, frontend design, and testing strategy reviewed |
| Inspect existing implementation | Completed | Phase 8 draft store, execution page, API services, fixtures, and test setup inspected |
| Commit Phase 8 work | Completed | Committed as `c5c9eec feat: implement phase 8 inspector workflow` |
| Configure Dexie and versioned local tables | Completed | `fieldmark_local_db` v1 with all eight approved tables |
| Implement account-scoped local repositories | Completed | Owner-scoped IDs, offline-session checks, and atomic transactions |
| Implement inspection/checklist downloads | Completed | Detail download caches site, template revision, and answers |
| Replace in-memory drafts with durable answer storage | Completed | Dexie is the source of truth; Zustand remains a synchronous mirror |
| Add durable sync queue and metadata records | Completed | Stable IDs, canonical payload hashes, account/device context, conflicts, and metadata |
| Add offline status indicators and error handling | Completed | Offline banners, local-save labels, typed offline errors, and persisted error state |
| Add IndexedDB and offline persistence tests | Completed | 12 repository tests plus 3 offline workflow tests |
| Run verification | Completed | 49/49 frontend tests, clean lint/typecheck, build, preview, and audit passed |

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

## Feature: F-013 Backend Synchronization Foundation

| Property | Value |
|---|---|
| Feature ID | F-013 |
| Development phase | Phase 5 |
| Status | Completed |
| Priority | Critical |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### Phase5.1 Feature objective

Implement the backend foundation that allows offline clients to register devices, synchronize operations safely, pull authorized server changes, and preserve conflicts without silently overwriting inspection data.

### Phase5.2 Requirements

- [x] Implement the synchronization operation ledger.
- [x] Define operation ID uniqueness and canonical payload-hash rules.
- [x] Implement duplicate operation detection and original-result replay.
- [x] Reject an existing operation ID when the payload hash changes.
- [x] Implement server-side version checks and conflict snapshots.
- [x] Implement authorization-scoped, paginated pull with safe cursors and tombstones.
- [x] Implement sync device registration, listing, and revocation.
- [x] Implement sync status, conflict list/detail, and conflict resolution endpoints.
- [x] Log approved writes to the change feed transactionally.
- [x] Add PostgreSQL integration tests and verify every Phase 5 acceptance criterion.

### Phase5.3 Files created

| File path | Purpose | Status |
|---|---|---|
| `backend/alembic/versions/0005_sync_scope_and_retry.py` | Adds change-feed scope columns and `RETRYABLE_ERROR` status | Created and verified |
| `backend/app/core/sync_identity.py` | Canonical request hashing and opaque signed cursors | Created |
| `backend/app/schemas/sync.py` | Device, push, pull, status, and conflict schemas | Created |
| `backend/app/services/change_log.py` | Transactional change-feed helper | Created |
| `backend/app/repositories/device_repository.py` | Device ownership and lifecycle queries | Created |
| `backend/app/repositories/sync_repository.py` | Ledger, change-feed, conflict, and status queries | Created |
| `backend/app/services/device_service.py` | Device registration, listing, revocation, and active-device checks | Created |
| `backend/app/services/conflict_service.py` | Conflict list/detail/resolve with permission and version checks | Created |
| `backend/app/dependencies/sync.py` | Active-device ownership dependency | Created |
| `backend/app/services/sync_service.py` | Push dispatcher, idempotency, savepoints, conflicts, pull, and status | Created |
| `backend/app/api/v1/endpoints/devices.py` | Canonical and alias device endpoints | Created |
| `backend/app/api/v1/endpoints/sync.py` | Push, pull, and status endpoints | Created |
| `backend/app/api/v1/endpoints/conflicts.py` | Conflict list, detail, and resolution endpoints | Created |
| `backend/tests/test_sync.py` | 20 PostgreSQL synchronization integration tests | Created |

### Phase5.4 Files modified

| File path | Modification |
|---|---|
| `backend/app/database/models/sync.py` | Added scope columns and retryable status support |
| `backend/app/core/config.py` | Added `SYNC_MAX_BATCH_SIZE` and `SYNC_MAX_PULL_LIMIT` |
| `backend/app/core/exceptions.py` | Added `VersionConflictError` |
| `backend/app/services/concurrency.py` | Added version-conflict error support |
| `backend/app/services/inspection_service.py` | Added change-feed logging and version-conflict handling |
| `backend/app/services/site_service.py` | Added change-feed logging for site writes |
| `backend/app/services/checklist_service.py` | Added change-feed logging for template and item writes |
| `backend/app/services/user_service.py` | Added change-feed logging without exposing password hashes |
| `backend/app/repositories/__init__.py` | Exported new repositories |
| `backend/app/api/v1/router.py` | Mounted device, sync, and conflict routers |
| `backend/tests/test_database_schema.py` | Updated expected Alembic head to `0005_sync_scope_and_retry` |
| `backend/.env.example` | Documented sync batch and pull limits |
| `README.md` | Documented sync environment variables |
| `docs/api-contracts.md` | Documented idempotency outcomes, savepoints, and authorization errors |
| `docs/database-design.md` | Documented scope columns, retryable status, and cursor implementation |
| `docs/offline-sync-design.md` | Recorded implemented Phase 5 decisions |

### Phase5.5 Important decisions

| Decision | Reason | Impact |
|---|---|---|
| `/api/v1/devices` is canonical and `/api/v1/sync/devices` is an alias | Both paths appear in approved documents | Shared handlers and authorization avoid divergent behavior |
| The server computes a canonical SHA-256 payload hash | Clients must not choose their own hash | Retries preserve operation identity and payload integrity |
| Each push operation uses its own savepoint | One invalid operation must not discard unrelated work | Every operation receives exactly one durable outcome |
| Pull scope is stored on `sync_changes` with `authorized_user_ids` and `is_global` | Tombstones must remain attributable after target rows are gone | Authorization filtering happens before pagination |
| `RETRYABLE_ERROR` is not a terminal ledger outcome | A temporary failure must be retryable with the same operation ID | Retryable responses do not block successful retries |
| Conflicts reference the ledger row ID, not the client operation UUID | Database foreign keys point to `sync_operations.id` | Conflict snapshots remain linked to the exact server operation |
| Cursors are opaque signed values over `change_position` | Numeric sequence values must not be exposed or modified by clients | Pagination uses the commit-ordered advisory-lock cursor safely |

### Phase5.6 Verification

- Final full backend suite: 73 passed, 2 non-blocking dependency warnings.
- `backend/tests/test_sync.py`: 20 PostgreSQL integration tests passed.
- Python compilation: passed.
- Migration `0005_sync_scope_and_retry` applied, downgraded, and reapplied successfully.
- Alembic drift check: no new upgrade operations detected.
- OpenAPI generation: 33 documented API paths.
- All Phase 5 acceptance criteria listed in `docs/development-phases.md` are verified.

### Phase5.7 Known issues

- Non-blocking `httpx`/TestClient and passlib/argon2 deprecation warnings remain from installed dependencies.
- No frontend IndexedDB or Sync Center implementation exists yet; those belong to later phases.

### Phase5.8 Handoff instructions

Phase 5 was complete and verified. Phase 5 changes were committed by explicit user request as `7414ece feat: implement phase 5 backend synchronization foundation`. The user then explicitly approved Phase 6, so work continued into Frontend Foundation.

---

## Feature: F-014 Frontend Foundation

| Property | Value |
|---|---|
| Feature ID | F-014 |
| Development phase | Phase 6 |
| Status | Completed |
| Priority | High |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### Phase6.1 Feature objective

Create a maintainable React application foundation with shared routing, state, theming, API access, component system, linting, and tests before implementing feature workflows.

### Phase6.2 Requirements

- [x] Initialize React with TypeScript and Vite.
- [x] Configure Tailwind CSS and shadcn/ui-compatible components.
- [x] Configure React Router, TanStack Query, Zustand, and Axios.
- [x] Implement light/dark theme management and global styles.
- [x] Create Button, Input, Select, Dialog, Dropdown menu, Card, Table, Badge, Tabs, Toast, Skeleton, Empty state, Loading indicator, and Error state components.
- [x] Configure ESLint and Vitest/React Testing Library.
- [x] Verify frontend startup, TypeScript, styles, shared components, themes, routing, and tests.

### Phase6.3 Files created

| File path | Purpose | Status |
|---|---|---|
| `frontend/components.json` | shadcn/ui project configuration | Created and verified |
| `frontend/eslint.config.js` | ESLint 9 flat configuration | Created and verified |
| `frontend/postcss.config.js` | Tailwind and Autoprefixer integration | Created and verified |
| `frontend/package-lock.json` | Pinned dependency resolution | Created and verified |
| `frontend/README.md` | Frontend setup and script documentation | Created |
| `frontend/src/app/App.tsx` | Root application component | Created and verified |
| `frontend/src/app/main.tsx` | Browser entry point and style imports | Created and verified |
| `frontend/src/app/providers.tsx` | Query, toast, and theme providers | Created and verified |
| `frontend/src/app/router.tsx` | Approved route definitions and browser router | Created and verified |
| `frontend/src/components/ui/*.tsx` | Fourteen shared UI components | Created and verified |
| `frontend/src/components/ui/index.ts` | Shared UI barrel export | Created and verified |
| `frontend/src/hooks/useOnlineStatus.ts` | Browser connectivity hook | Created and verified |
| `frontend/src/lib/axios.ts` | Credentialed API client with in-memory access token | Created and verified |
| `frontend/src/lib/constants.ts` | Application and route constants | Created and verified |
| `frontend/src/lib/error.ts` | Standard API error normalization | Created and verified |
| `frontend/src/lib/queryClient.ts` | TanStack Query client and retry policy | Created and verified |
| `frontend/src/lib/utils.ts` | Tailwind class composition helper | Created and verified |
| `frontend/src/pages/*.tsx` | Foundation and placeholder routed pages | Created and verified |
| `frontend/src/store/appStore.ts` | Shared client UI state | Created and verified |
| `frontend/src/store/themeStore.ts` | Persisted light/dark/system preference | Created and verified |
| `frontend/src/styles/globals.css` | Tailwind global styles | Created and verified |
| `frontend/src/styles/theme.css` | Semantic light/dark design tokens | Created and verified |
| `frontend/src/test/setup.ts` | Vitest and React Testing Library setup | Created and verified |
| `frontend/src/types/api.ts` | Standard API response and error types | Created and verified |
| `frontend/src/vite-env.d.ts` | Vite environment typings | Created and verified |
| `frontend/src/**/*.test.ts(x)` | 13 Phase 6 frontend tests | Created and verified |

### Phase6.4 Files modified

| File path | Modification |
|---|---|
| `frontend/package.json` | Added approved UI/test/lint dependencies, upgraded patched Vite/Vitest/Router/Zod versions, and updated lint script |
| `frontend/tailwind.config.js` | Corrected content paths and added semantic success/warning tokens plus the animation plugin |
| `frontend/tsconfig.json` | Added Vite client types |
| `frontend/vite.config.ts` | Added Vitest jsdom configuration and ESM-safe path alias |
| `README.md` | Updated Node prerequisite and added frontend commands plus token-storage guidance |
| `docs/frontend-design.md` | Recorded the Phase 6 dependency baseline and implementation boundary |

### Phase6.5 Important decisions

| Decision | Reason | Impact |
|---|---|---|
| Upgrade Vite, Vitest, React Router, and Zod to patched compatible versions | The scaffold versions had published advisories | `npm audit` reports zero vulnerabilities; Node 20.19+ or 22.12+ is required |
| Keep access tokens in application memory | Security design prohibits persisting access tokens in local storage or IndexedDB | Phase 7 session restoration must use the HTTP-only refresh cookie |
| Implement shadcn-style components directly with Radix primitives | Phase 6 requires the shared component system before feature pages exist | Components are owned by the repository and follow Tailwind semantic tokens |
| Persist only the theme preference with Zustand | Theme is a client preference, not offline business data | Local storage is not used as an offline database |
| Represent all planned routes with labeled placeholders | Router navigation can be verified without prematurely implementing Phase 7+ workflows | Real auth guards and feature behavior remain in later phases |
| Provide an in-memory Storage shim in tests | The Node/jsdom combination exposed an incomplete global localStorage | Theme persistence tests are deterministic; application behavior is unchanged |

### Phase6.6 Verification

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with zero warnings.
- `npm test`: 13 passed across 5 test files.
- `npm run build`: production build succeeded with Vite 7.3.8.
- Vite preview smoke check: HTTP 200 and Fieldmark title served successfully.
- `npm audit --audit-level=moderate`: zero vulnerabilities.
- All Phase 6 acceptance criteria in `docs/development-phases.md` are verified.

### Phase6.7 Known issues

- Node emits a non-blocking `--localstorage-file` warning during Vitest runs in this environment; tests pass and the application uses the injected test Storage shim.
- Route pages are intentionally placeholders; they do not implement authentication, data loading, or workflows.
- No IndexedDB, synchronization engine, or PWA shell exists yet; those belong to later phases.

### Phase6.8 Handoff instructions

Phase 6 was complete and verified. Phase 6 changes were committed by explicit user request as `f2b0932 feat: implement phase 6 frontend foundation`. The user then explicitly approved Phase 7, so work continued into Frontend Authentication and Admin Features.

---

## Feature: F-015 Frontend Authentication and Admin Features

| Property | Value |
|---|---|
| Feature ID | F-015 |
| Development phase | Phase 7 |
| Status | Completed |
| Priority | High |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### Phase7.1 Feature objective

Implement browser authentication, token refresh, route protection, the admin application shell, and administrator management pages backed by the approved API contracts.

### Phase7.2 Implementation scope

**Included:** Login and session lifecycle, protected role-aware routes, admin layout/navigation, dashboard, user/site/checklist management, inspection assignment, profile/settings, and 16 new frontend tests.

**Not included:** Inspector workflow execution, IndexedDB persistence, synchronization engine, Sync Center behavior, conflict resolution, and PWA shell; these remain later phases.

**Dependencies:** Phases 0–6 are completed and verified. Backend contracts were inspected in `docs/api-contracts.md`, `docs/security-design.md`, and the FastAPI endpoints. No backend files were changed in Phase 7.

### Phase7.3 Progress

| Task | Status | Notes |
|---|---|---|
| Review Phase 7 documentation | Completed | Phase tasks, acceptance criteria, frontend design, API contracts, and security design reviewed |
| Inspect existing frontend and backend contracts | Completed | Phase 6 source tree, auth endpoints, CSRF handling, and admin endpoint schemas inspected |
| Implement authentication and token lifecycle | Completed | `authApi`, `session.ts`, access-token store, CSRF helper, Axios interceptors, and bootstrap wiring |
| Implement route guards and admin layout | Completed | `RequireAuth`, `PublicOnly`, `HomeRedirect`, admin shell, sidebar, header, mobile navigation, profile, and settings |
| Implement admin dashboard and management pages | Completed | Dashboard plus user, site, checklist, and inspection assignment pages/forms/schemas |
| Add frontend tests | Completed | 16 new tests: 4 session, 4 interceptor, 2 router, and 6 admin workflow tests; supporting fixtures/render helpers added |
| Run verification | Completed | 29/29 tests passed; TypeScript, lint, build, preview, and audit checks passed |

### Phase7.4 Files created

| File path | Purpose | Status |
|---|---|---|
| `frontend/src/app/guards.tsx` | Public-only, authenticated, role-aware, and home redirect guards | Created |
| `frontend/src/components/ui/Label.tsx` | Accessible form label component | Created |
| `frontend/src/components/ui/Textarea.tsx` | Shared textarea component | Created |
| `frontend/src/lib/accessToken.ts` | In-memory access-token store | Created |
| `frontend/src/lib/csrf.ts` | Readable CSRF cookie helper | Created |
| `frontend/src/lib/formResolver.ts` | Local React Hook Form/Zod resolver | Created |
| `frontend/src/lib/**` | Phase 6 API client, constants, query client, utilities, error normalization, and Phase 7 auth helpers | Previously created but ignored by the global `lib/` rule; now trackable after the `.gitignore` fix |
| `frontend/src/types/auth.ts` | Authentication and role contracts | Created |
| `frontend/src/types/entities.ts` | API entity and payload contracts | Created |
| `frontend/src/services/auth/session.ts` | Sign-in, sign-out, refresh, and bootstrap lifecycle | Created |
| `frontend/src/services/api/authApi.ts` | Typed authentication API client | Created |
| `frontend/src/services/api/usersApi.ts` | Typed user API client | Created |
| `frontend/src/services/api/sitesApi.ts` | Typed site API client | Created |
| `frontend/src/services/api/checklistsApi.ts` | Typed checklist API client | Created |
| `frontend/src/services/api/inspectionsApi.ts` | Typed inspection API client | Created |
| `frontend/src/services/api/dashboardApi.ts` | Typed dashboard API client | Created |
| `frontend/src/store/authStore.ts` | Zustand authentication state | Created |
| `frontend/src/features/auth/components/LoginForm.tsx` | Login form and redirect handling | Created |
| `frontend/src/features/auth/pages/LoginPage.tsx` | Login page | Created |
| `frontend/src/features/auth/pages/ProfilePage.tsx` | Authenticated profile page | Created |
| `frontend/src/features/auth/pages/SettingsPage.tsx` | Theme and session settings page | Created |
| `frontend/src/features/auth/schemas/loginSchema.ts` | Login validation schema | Created |
| `frontend/src/features/dashboard/pages/AdminDashboardPage.tsx` | Backend-backed admin dashboard | Created |
| `frontend/src/features/users/schemas/userSchemas.ts` | User form schemas | Created |
| `frontend/src/features/users/components/UserFormDialog.tsx` | Create/edit user dialog | Created |
| `frontend/src/features/users/pages/UsersPage.tsx` | User management page | Created |
| `frontend/src/features/sites/schemas/siteSchemas.ts` | Site form schema | Created |
| `frontend/src/features/sites/components/SiteFormDialog.tsx` | Create/edit site dialog | Created |
| `frontend/src/features/sites/pages/SitesPage.tsx` | Site management page | Created |
| `frontend/src/features/checklists/schemas/checklistSchemas.ts` | Checklist form schemas and payload builder | Created |
| `frontend/src/features/checklists/components/ChecklistFormDialog.tsx` | Template/revision dialog | Created |
| `frontend/src/features/checklists/pages/ChecklistsPage.tsx` | Checklist management page | Created |
| `frontend/src/features/inspections/schemas/inspectionSchemas.ts` | Inspection assignment form schema | Created |
| `frontend/src/features/inspections/components/InspectionFormDialog.tsx` | Inspection assignment/edit dialog | Created |
| `frontend/src/features/inspections/pages/InspectionsPage.tsx` | Inspection assignment list page | Created |
| `frontend/src/layouts/AuthLayout.tsx` | Login page shell | Created |
| `frontend/src/layouts/AuthenticatedLayout.tsx` | Shared authenticated shell | Created |
| `frontend/src/layouts/AdminLayout.tsx` | Admin shell with outlet | Created |
| `frontend/src/layouts/components/AdminNav.tsx` | Admin navigation model | Created |
| `frontend/src/layouts/components/Header.tsx` | Authenticated header | Created |
| `frontend/src/layouts/components/MobileNavigation.tsx` | Responsive admin navigation | Created |
| `frontend/src/layouts/components/Sidebar.tsx` | Desktop admin navigation | Created |
| `frontend/src/layouts/components/ThemeToggle.tsx` | Light/dark/system theme control | Created |
| `frontend/src/layouts/components/UserMenu.tsx` | Profile, settings, and sign-out menu | Created |
| `frontend/src/services/auth/session.test.ts` | Session lifecycle tests | Created |
| `frontend/src/features/admin/adminFlows.test.tsx` | Admin CRUD and assignment tests | Created |
| `frontend/src/test/fixtures.ts` | Shared typed test fixtures | Created |
| `frontend/src/test/renderWithProviders.tsx` | Query/router/toast test renderer | Created |

### Phase7.5 Files modified

| File path | Modification | Reason |
|---|---|---|
| `.gitignore` | Scoped Python `lib/` and `lib64/` ignore rules to the repository root | The global rules silently ignored `frontend/src/lib/`, excluding source files from Phase 6 and Phase 7 commits |
| `frontend/src/app/providers.tsx` | Added theme initialization, single session bootstrap, and refresh-handler registration | Wire auth lifecycle without double-rotating the refresh token in React Strict Mode |
| `frontend/src/app/router.tsx` | Replaced Phase 6 placeholders with real admin routes and guards | Implement Phase 7 navigation and authorization boundary |
| `frontend/src/app/router.test.tsx` | Replaced foundation navigation tests with guard and admin navigation tests | Verify Phase 7 routes |
| `frontend/src/components/ui/index.ts` | Exported `Label` and `Textarea` | Reuse shared form primitives |
| `frontend/src/lib/axios.ts` | Added CSRF header, 401 refresh retry, single-flight refresh, and token persistence on retry | Implement approved refresh and CSRF behavior |
| `frontend/src/lib/axios.test.ts` | Added CSRF and refresh retry tests | Verify interceptor behavior |
| `frontend/src/features/users/pages/UsersPage.tsx` | Corrected `UserRole` type import | Strict TypeScript compatibility |
| `frontend/src/features/checklists/pages/ChecklistsPage.tsx` | Replaced `replaceAll` with a regex replacement | ES2020 target compatibility |
| `frontend/src/features/inspections/pages/InspectionsPage.tsx` | Replaced `replaceAll` with a regex replacement | ES2020 target compatibility |
| `frontend/src/features/inspections/components/InspectionFormDialog.tsx` | Memoized query-derived option arrays | Remove React Hook dependency warning |
| `frontend/README.md` | Updated architecture and current scope | Keep frontend developer documentation aligned |
| `docs/frontend-design.md` | Added Phase 7 implementation baseline | Keep implementation status aligned without changing approved requirements |
| `progress-tracker.md` | Recorded Phase 7 status, files, decisions, verification, and handoff | Mandatory progress tracking |

### Phase7.6 Important decisions

| Decision | Reason | Impact |
|---|---|---|
| Keep access tokens in memory and refresh tokens in HTTP-only cookies | Required by `docs/security-design.md` | No access or refresh token is persisted in browser storage |
| Read only the non-HttpOnly `fieldmark_csrf` cookie and send `X-CSRF-Token` | The refresh token must remain unreadable to JavaScript while the backend uses double-submit CSRF | Cookie-authenticated refresh/logout requests satisfy the backend contract |
| Use one single-flight refresh promise and preserve the original request | Concurrent 401 responses must not rotate the refresh token multiple times | Retries reuse the same operation and receive the refreshed in-memory token |
| Register the refresh handler centrally and bootstrap once in providers | Decouples Axios from auth services and avoids Strict Mode double refresh | Session restoration is deterministic across remounts |
| Implement a small local Zod resolver | Approved validation stack requires React Hook Form + Zod without adding another dependency | No new npm dependency was introduced |
| Keep API access in typed services and IndexedDB access out of components | Frontend design requires feature-oriented separation | Pages contain presentation and query wiring, not raw Axios/Dexie calls |
| Leave inspector and Sync Center routes as labeled placeholders | Phase 8+ owns those workflows | Phase 7 remains within its approved boundary |
| Scope Python library ignore rules to the repository root | The original global `lib/` rule silently excluded `frontend/src/lib/` from Git | All frontend library source files are now visible to Git and must be included in the Phase 7 commit |

### Phase7.7 Verification

- `npx tsc --noEmit`: passed with no output.
- `npm run lint`: passed with zero errors and zero warnings.
- `npm test`: 29 passed across 7 test files; 0 failed.
- `npm run build`: Vite 7.3.8 production build succeeded.
- Vite preview smoke check: HTTP 200 and the Fieldmark application shell were served.
- `npm audit --audit-level=moderate`: zero vulnerabilities.
- All Phase 7 acceptance criteria in `docs/development-phases.md` are verified.

### Phase7.8 Known issues

- Non-blocking: Node emits a `--localstorage-file` warning during Vitest runs in this environment; the test Storage shim is injected and all tests pass.
- Non-blocking: Vite reports a chunk-size warning because the single application bundle is larger than 500 kB; code splitting is not required by Phase 7 acceptance criteria.
- Inspector workflow pages and Sync Center are intentional placeholders until Phases 8–11.
- The in-memory access token is lost on a full page reload; a valid refresh cookie is required to restore the session, subject to the later offline-session policy.
- Important commit issue found and fixed in the working tree: the global `lib/` rule in `.gitignore` excluded `frontend/src/lib/` from the Phase 6 commit. The ignore rule is now root-scoped, and those source files must be included when Phase 7 is committed. The existing Phase 6 commit hash remains unchanged because amending it was not requested.
- Phase 7 changes remain uncommitted because the user did not request a commit.

### Phase7.9 Acceptance criteria

- [x] Administrator can log in.
- [x] Administrator sees admin navigation.
- [x] User CRUD works through the backend.
- [x] Site CRUD works through the backend.
- [x] Checklist management works through the backend.
- [x] Inspection assignment works.
- [x] Unauthorized navigation is blocked.
- [x] Admin feature tests pass.

### Phase7.10 Handoff instructions

**Current stopping point:**

Historical Phase 7 stopping point: Phase 7 was complete and verified, and Phase 8 required explicit approval. This was subsequently superseded: Phase 7 was committed as `3c75a6d feat: implement phase 7 frontend authentication and admin features`, Phase 8 was explicitly approved, and Phase 8 is now complete.

**Next agent must:**

1. Read `AGENTS.md` and this progress tracker.
2. Inspect `frontend/src/app/router.tsx`, `frontend/src/app/providers.tsx`, `frontend/src/lib/axios.ts`, `frontend/src/services/`, and `frontend/src/features/`.
3. Begin **Phase 8: Inspector Workflow** only after approval.
4. Replace the inspector placeholders with authenticated role-aware pages and keep all API/service access outside presentation components.
5. Preserve the in-memory access-token and HTTP-only refresh-cookie strategy.
6. Run frontend verification again after Phase 8 changes.
7. Update this tracker before stopping.

---

## Feature: F-012/F-016 Inspector Workflow

| Property | Value |
|---|---|
| Feature ID | F-012, F-016 |
| Development phase | Phase 8 |
| Status | Completed |
| Priority | High |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### Phase8.1 Feature objective

Implement the complete inspector-facing workflow: dashboard, assigned-inspection list, inspection details, execution UI, dynamic checklist rendering, validation, progress, local draft preservation, and submission integration.

### Phase8.2 Current implementation scope

**Included:** Inspector layout/navigation, dashboard, My Inspections, details, execution, dynamic answer controls, validation, progress, account-scoped in-memory draft persistence, and start/answer/submit API integration.

**Not included:** Full IndexedDB download/cache model, durable operation queue, sync engine, Sync Center, conflict resolution, and PWA shell; these remain Phases 9–12.

**Dependencies:** Phases 0–7 are complete. Phase 7 was committed as `3c75a6d`. Backend inspection endpoints and contracts were inspected.

### Phase8.3 Progress

| Task | Status | Notes |
|---|---|---|
| Review Phase 8 documentation | Completed | Development phases, frontend design, API contracts, offline-sync design, and testing strategy reviewed |
| Inspect existing implementation | Completed | Phase 7 frontend and backend inspection endpoints/schemas inspected |
| Implement inspector layout and dashboard | Completed | `InspectorLayout`, `InspectorNav`, generic sidebar/mobile navigation, and `InspectorDashboardPage` |
| Implement My Inspections and details pages | Completed | Filterable assignment list and version-aware details with start action |
| Implement execution UI and answer controls | Completed | Dynamic controls for YES_NO, TEXT, NUMBER, SINGLE_CHOICE, and MULTIPLE_CHOICE |
| Implement local draft persistence | Completed | Account-scoped in-memory repository; local save occurs before backend calls |
| Implement validation, progress, and submission | Completed | Dynamic Zod schema, progress bar, required-answer checks, and stable submission ID |
| Add frontend tests | Completed | 5 inspector workflow tests and updated router coverage |
| Run verification | Completed | Full frontend suite, typecheck, lint, build, preview, and audit passed |

### Phase8.4 Files created

| File path | Purpose | Status |
|---|---|---|
| `frontend/src/features/inspections/pages/InspectorDashboardPage.tsx` | Inspector summary and next assignment | Created |
| `frontend/src/features/inspections/pages/MyInspectionsPage.tsx` | Searchable and filterable assignment list | Created |
| `frontend/src/features/inspections/pages/InspectionDetailsPage.tsx` | Inspection overview and start action | Created |
| `frontend/src/features/inspections/pages/ExecuteInspectionPage.tsx` | Checklist execution, draft save, and submission | Created |
| `frontend/src/features/inspections/components/ChecklistAnswerField.tsx` | Dynamic answer control renderer | Created |
| `frontend/src/features/inspections/components/InspectionStatusBadge.tsx` | Shared inspection status indicator | Created |
| `frontend/src/features/inspections/hooks/useInspectionReferences.ts` | Site/template label lookup | Created |
| `frontend/src/features/inspections/schemas/inspectionExecutionSchemas.ts` | Dynamic Zod validation and progress calculation | Created |
| `frontend/src/features/inspections/store/inspectionDraftStore.ts` | Account-scoped in-memory draft repository | Created |
| `frontend/src/features/inspections/types/inspectionWorkflow.ts` | Draft/form types and helpers | Created |
| `frontend/src/features/inspections/utils/inspectionAnswers.ts` | Choice parsing and answer comparison helpers | Created |
| `frontend/src/features/inspections/inspectorFlows.test.tsx` | Inspector workflow tests | Created |
| `frontend/src/layouts/InspectorLayout.tsx` | Inspector application shell | Created |
| `frontend/src/layouts/components/InspectorNav.tsx` | Inspector navigation groups | Created |
| `frontend/src/layouts/components/navigationTypes.ts` | Shared navigation group type | Created |

### Phase8.5 Files modified

| File path | Modification | Reason |
|---|---|---|
| `frontend/src/app/router.tsx` | Replaced inspector placeholders with guarded InspectorLayout and real pages | Wire Phase 8 workflow |
| `frontend/src/app/router.test.tsx` | Added inspector API mocks and updated role-redirect assertions | Verify new dashboard behavior |
| `frontend/src/layouts/components/Sidebar.tsx` | Accepted navigation groups, home route, and aria label | Reuse shell for admin and inspector roles |
| `frontend/src/layouts/components/MobileNavigation.tsx` | Accepted the same configurable navigation props | Keep mobile navigation role-aware |
| `frontend/src/layouts/components/AdminNav.tsx` | Used the shared navigation type | Avoid duplicate navigation type definitions |
| `frontend/src/lib/formResolver.ts` | Built nested field errors and widened schema type | Support dynamic per-item validation |
| `frontend/src/services/api/inspectionsApi.ts` | Added detail, start, saveAnswer, and submit methods | Integrate approved backend contracts |
| `frontend/src/types/entities.ts` | Added answer, detail, start, submit, and status types | Match API contracts |
| `frontend/src/test/fixtures.ts` | Added checklist item and inspection detail workflow fixtures | Support inspector tests |
| `frontend/src/test/renderWithProviders.tsx` | Returned an unmount function | Simulate navigation and remounting in draft tests |

### Phase8.6 Important decisions

- Account-scoped in-memory drafts are a deliberate Phase 8 boundary; Phase 9 replaces the repository with durable Dexie/IndexedDB storage.
- Answer and summary changes are written to the local draft store before any backend request; only confirmed server saves set the `synced` state.
- A stable `submission_id` is created with the draft and reused across failed submission retries.
- New answers use `base_version=1`; existing answers use their current server version.
- Dynamic response types are validated with generated Zod schemas, and the local resolver produces nested React Hook Form errors.
- Answer controls expose the checklist question as their accessible name.

### Phase8.7 Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed with zero warnings |
| `npm test` | 34 passed across 8 test files |
| `npm run build` | Passed; non-blocking chunk-size and Zod annotation warnings |
| Vite preview smoke check | HTTP 200 |
| `npm audit --audit-level=moderate` | 0 vulnerabilities |

### Phase8.8 Known issues

- Drafts are not durable across a full browser restart; this is intentionally deferred to Phase 9 Offline Persistence.
- Vitest emits a non-blocking `--localstorage-file` warning in this environment; the injected test Storage shim keeps tests deterministic.
- The production bundle emits a non-blocking chunk-size warning.

### Phase8.9 Acceptance criteria

- [x] Inspectors can view their assignments.
- [x] Inspectors can open an inspection.
- [x] Checklist items render dynamically.
- [x] Required answers are validated.
- [x] Inspection progress is calculated correctly.
- [x] Drafts are preserved.
- [x] Submission follows backend rules.
- [x] Inspector workflow tests pass.

### Phase8.10 Handoff instructions

Phase 8 is complete and verified. Stop at the phase boundary. Begin Phase 9 — Offline Persistence only after explicit approval. Replace `useInspectionDraftStore` with the approved Dexie repository while preserving the page-level draft contract.

---

## Feature: F-017/F-018 Offline Persistence

| Property | Value |
|---|---|
| Feature ID | F-017, F-018 |
| Development phase | Phase 9 |
| Status | Completed |
| Priority | Critical |
| Started date | 2026-11-21 |
| Last updated | 2026-11-21 |
| Completed date | 2026-11-21 |
| Implemented by | OpenCode (Big Pickle) |

### Phase9.1 Feature objective

Implement durable browser-side persistence: a versioned Dexie database, approved local tables, account-scoped repositories, offline inspection and checklist access, local answer storage, a durable operation queue, offline status indicators, and verified refresh/restart behavior.

### Phase9.2 Current implementation scope

**Included:** Dexie v1 schema with all eight approved local tables; account-scoped local records and offline-session checks; atomic download and answer/queue writes; durable draft persistence behind the existing synchronous page contract; offline detail/list/reference fallbacks; offline start, save, and submit paths; conflict and metadata records; offline UI status; and IndexedDB/offline tests.

**Not included:** Push/pull execution, retry/backoff, dependency runners, Sync Center, conflict resolution UI, and PWA installation/offline application shell. Those remain Phases 10–12.

**Dependencies:** Phases 0–8 are complete. Phase 8 was committed as `c5c9eec feat: implement phase 8 inspector workflow`. The local schema followed `docs/offline-sync-design.md` and the Phase 9 acceptance criteria in `docs/development-phases.md`.

### Phase9.3 Progress

| Task | Status | Notes |
|---|---|---|
| Review Phase 9 documentation | Completed | Development phases, offline-sync design, and testing strategy reviewed |
| Configure Dexie and versioned local tables | Completed | `fieldmark_local_db` version 1; all eight approved tables |
| Implement account-scoped local repositories | Completed | Owner IDs, offline access validity, device metadata, and transactions |
| Implement inspection/checklist downloads | Completed | Detail download caches site, template revision, and answers atomically |
| Replace in-memory drafts with durable storage | Completed | Hydration waits for in-flight writes; writes are serialized per draft |
| Add durable queue and metadata records | Completed | Stable operation IDs, canonical payload hashes, conflicts, and sync metadata |
| Add offline status indicators and error handling | Completed | Offline banner, local-save label, typed errors, and failure toast state |
| Add IndexedDB and offline persistence tests | Completed | Repository, restart, account isolation, storage failure, and workflow tests |
| Run verification | Completed | 49/49 frontend tests and all quality gates passed |

### Phase9.4 Files created

| File path | Purpose | Status |
|---|---|---|
| `frontend/src/db/fieldmarkDb.ts` | Versioned Dexie database and approved table schema | Created |
| `frontend/src/db/localTypes.ts` | Local record, queue, metadata, conflict, and error types | Created |
| `frontend/src/db/localRepositories.ts` | Account-scoped repositories and durable transactions | Created |
| `frontend/src/db/localRepositories.test.ts` | IndexedDB, account isolation, restart, and failure tests | Created |
| `frontend/src/services/sync/operationFactory.ts` | Canonical payload hashing and stable queue operations | Created |
| `frontend/src/lib/id.ts` | Reusable client identifier generator | Created |
| `frontend/src/features/inspections/services/offlineInspectionService.ts` | Local/remote inspection and reference coordination | Created |
| `frontend/src/features/inspections/offlinePersistence.test.tsx` | Offline workflow and durable UI behavior tests | Created |

### Phase9.5 Files modified

| File path | Modification | Reason |
|---|---|---|
| `frontend/package.json` | Added `fake-indexeddb` as a dev dependency | Provide IndexedDB in Vitest without adding a runtime dependency |
| `frontend/package-lock.json` | Locked the test-only dependency | Keep installs deterministic |
| `frontend/src/test/setup.ts` | Imported `fake-indexeddb/auto` | Enable Dexie in the test environment |
| `frontend/src/features/inspections/store/inspectionDraftStore.ts` | Added durable hydration/persistence/removal with serialized writes | Preserve the synchronous page contract while making IndexedDB authoritative |
| `frontend/src/features/inspections/pages/ExecuteInspectionPage.tsx` | Added offline detail access, draft hydration, durable saves, offline start/answer/submit, status banner, and render gate | Complete offline inspection execution |
| `frontend/src/features/inspections/pages/InspectionDetailsPage.tsx` | Added download/status UI and offline start path | Make downloaded assignments usable without connectivity |
| `frontend/src/features/inspections/pages/MyInspectionsPage.tsx` | Added offline-aware assignment list and status text | Show only downloaded work when offline |
| `frontend/src/features/inspections/pages/InspectorDashboardPage.tsx` | Added local sync summary and offline-safe queries | Surface pending local work and avoid unavailable server calls |
| `frontend/src/features/inspections/hooks/useInspectionReferences.ts` | Added local site/template cache fallback | Keep assignment labels available offline |
| `frontend/src/features/inspections/inspectorFlows.test.tsx` | Clear local data and seed local account context | Prevent Dexie cross-test leakage |
| `frontend/src/services/auth/session.ts` | Record bounded local account context after authentication and clear the in-memory draft mirror on sign-out | Enable offline access and isolate account switches without storing credentials |
| `progress-tracker.md` | Recorded Phase 9 implementation, verification, and handoff | Mandatory progress tracking |

### Phase9.6 Important decisions

- IndexedDB through Dexie is the durable source of truth; Zustand remains a synchronous rendering mirror with the original `readInspectionDraft` contract.
- Draft writes are serialized per account/inspection key, and hydration waits for pending writes so a fast unmount/remount cannot restore a stale draft.
- Answer records and queue operations are written in one Dexie transaction; local persistence completes before any server request.
- Only confirmed server responses move answers and operations to `synced`; offline work remains `pending`.
- Pending unsent answer operations may coalesce, but their payload hash is recomputed when the payload changes. Sent or terminal operations are immutable and receive a new ID for later edits.
- Local account records contain bounded offline-session context only — no passwords, access tokens, or refresh tokens.
- Offline start, save, and submit avoid API calls entirely and queue durable operations for Phase 10 processing.
- The database is named `fieldmark_local_db`; future schema changes require a new Dexie version rather than editing version 1 in place.

### Phase9.7 Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed with zero warnings |
| `npm test -- --run` | 49 passed across 10 test files |
| `npx vitest run src/db/localRepositories.test.ts` | 12 passed |
| `npx vitest run src/features/inspections/offlinePersistence.test.tsx` | 3 passed |
| `npm run build` | Passed; non-blocking chunk-size and Zod annotation warnings |
| Vite preview smoke check | HTTP 200 |
| `npm audit --audit-level=moderate` | 0 vulnerabilities |

### Phase9.8 Known issues

- Queued operations are durable but are not sent to the backend until Phase 10; this is intentional.
- Restart behavior is verified by closing and reopening Dexie with the in-memory mirror cleared; full browser/E2E restart belongs to Phase 13.
- Offline access uses a default seven-day validity window configurable with `VITE_OFFLINE_SESSION_EXPIRE_DAYS`; server-side permission changes are not revalidated until connectivity returns.
- Vitest emits a non-blocking `--localstorage-file` warning in this environment.
- The production bundle emits a non-blocking chunk-size warning.
- `fake-indexeddb` is test-only and is not bundled into the application.

### Phase9.9 Acceptance criteria

- [x] Downloaded inspections are available offline.
- [x] Checklist templates remain available offline.
- [x] Answers save locally.
- [x] Local changes survive refresh.
- [x] Local changes survive application restart (verified by Dexie close/reopen with the in-memory mirror cleared).
- [x] Local data is isolated by account.
- [x] IndexedDB errors are handled.
- [x] Offline persistence tests pass.

### Phase9.10 Handoff instructions

Phase 9 is complete and verified. Stop at the phase boundary. The Phase 9 changes are uncommitted; commit them only if requested. Phase 10 may begin with the durable queue records and operation factory already in place, but must add the actual push/pull engine, retry behavior, dependency execution, cursor handling, and Sync Center.

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
| F-012 | Inspection execution | 8 | Completed | PRD.md, frontend-design.md |
| F-013 | Backend sync operations | 5 | Completed | offline-sync-design.md, api-contracts.md |
| F-014 | Frontend foundation | 6 | Completed | frontend-design.md, development-phases.md |
| F-015 | Frontend authentication and admin features | 7 | Completed | frontend-design.md, development-phases.md, api-contracts.md, security-design.md |
| F-015 | Admin dashboard | 7 | Completed | frontend-design.md |
| F-016 | Inspector dashboard | 8 | Completed | frontend-design.md |
| F-017 | IndexedDB persistence | 9 | Completed | offline-sync-design.md, development-phases.md |
| F-018 | Durable sync queue | 9 | Completed | offline-sync-design.md, development-phases.md |
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
| `/api/v1/devices` | POST/GET | Yes | Yes | Canonical path; `/api/v1/sync/devices` alias shares handlers |
| `/api/v1/devices/{device_id}/revoke` | POST | Yes | Yes | Owner/admin checks; `/api/v1/sync/devices/{device_id}/revoke` alias tested |
| `/api/v1/sync/push` | POST | Yes | Yes | Stable IDs, canonical hashes, savepoints, conflicts, and replay tested |
| `/api/v1/sync/pull` | GET | Yes | Yes | Scoped pagination, opaque cursors, and tombstones tested |
| `/api/v1/sync/status` | GET | Yes | Yes | Device-scoped status and open-conflict counts tested |
| `/api/v1/sync/conflicts` | GET | Yes | Yes | Owner/admin scoped list tested |
| `/api/v1/sync/conflicts/{conflict_id}` | GET | Yes | Yes | Snapshot detail and cross-user denial tested |
| `/api/v1/sync/conflicts/{conflict_id}/resolve` | POST | Yes | Yes | Permission and stale-version checks tested |

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
| sync_changes scope columns | Yes | Yes | Yes | `authorized_user_ids` and `is_global` added by migration `0005_sync_scope_and_retry`; scoped pull tested |
| sync_operations retry status | Yes | Yes | Yes | `RETRYABLE_ERROR` added by migration `0005_sync_scope_and_retry`; same-ID retry tested |

Add supporting tables only when required by the approved database design.

Record important migration identifiers and database changes in the relevant feature entry.

---

# 10. Offline and Synchronization Tracker

Because synchronization is a critical Fieldmark feature, maintain its progress separately.

| Capability | Status | Verified |
|---|---|---|
| Dexie database initialization | Completed | Yes — `fieldmark_local_db` v1 with eight approved tables |
| Local inspection repository | Completed | Yes — account-scoped cache, detail, draft, and reference access |
| Local answer persistence | Completed | Yes — 12 repository tests plus offline workflow tests |
| In-memory account-scoped inspection drafts | Completed | Yes — Phase 8 contract retained as a durable-write mirror |
| Durable operation queue | Completed | Yes — start, answer, and submit operations queued locally |
| Stable operation IDs | Completed | Yes — backend push and frontend queue IDs; coalescing only before send |
| Payload hash validation | Completed | Yes — canonical JSON hashing on the backend and local operation factory |
| Dependency ordering | Not Started | No |
| Push synchronization | Completed | Yes |
| Per-operation push results | Completed | Yes |
| Pull synchronization | Completed | Yes |
| Commit-safe pull cursor | Completed | Yes |
| Atomic local pull application | Not Started | No |
| Retry with backoff and jitter | Not Started | No |
| Tombstone handling | Completed | Yes |
| Conflict detection | Completed | Yes |
| Conflict resolution | Completed | Yes |
| Multi-tab coordination | Not Started | No |
| Account-scoped local data | Completed | Yes — owner IDs, offline-session checks, sign-out mirror clearing, and isolation tests |
| Interrupted-sync recovery | Not Started | No |
| Sync Center UI | Not Started | No |

**Phase 5 verification note:** The backend capabilities marked Completed are verified by `backend/tests/test_sync.py` and the existing commit-order cursor test. Conflict resolution here means the backend conflict list, detail, and resolve APIs with permission and version checks; the frontend conflict UI remains a later phase.

**Phase 9 verification note:** Dexie initialization, local repositories, local answer persistence, durable queue creation, account scoping, and IndexedDB error surfacing are now verified by `frontend/src/db/localRepositories.test.ts` and `frontend/src/features/inspections/offlinePersistence.test.tsx`. Dependency ordering, retry/backoff/jitter, atomic local pull application, interrupted-sync recovery, multi-tab coordination, and the Sync Center remain Phase 10+ work.

Do not mark a capability as verified merely because its code exists. Record the test that proves it works.

---

# 11. Testing Progress

Track testing at project level.

| Test category | Status | Last result | Notes |
|---|---|---|---|
| Backend unit tests | Completed | 73 passed | Full backend pytest suite |
| Backend integration tests | Completed | 73 passed | PostgreSQL temporary schema; includes Phase 4 APIs and Phase 5 device, push, pull, status, and conflict tests |
| API tests | Completed | 73 passed | Full suite includes health, readiness, versioning/docs, CORS, error formats, logging, auth, authorization, Phase 4 endpoints, and Phase 5 sync endpoints |
| Database tests | Completed | 8 passed | Schema, constraints, relationships, latest migrations, unique `submission_id`, `submitted_version`, `template_key`, and cursor ordering; expected head now `0005_sync_scope_and_retry` |
| Authentication tests | Completed | 19 passed | 4 password-hashing and 15 authentication tests |
| RBAC tests | Completed | 12 passed | Phase 3 authorization tests plus Phase 4 and Phase 5 endpoint authorization coverage |
| Frontend unit tests | Completed | 49 passed | Full Vitest suite for API client, theme, online status, router, admin flows, inspector workflow, IndexedDB, and shared UI |
| Component tests | Completed | 5 passed | Shared UI component test suite covering rendering, interactions, dialogs, menus, tabs, toast, and error states |
| Inspector workflow tests | Completed | 5 passed | Assignment list, start action, validation, local drafts, answer saves, draft restore, and stable submission ID |
| IndexedDB tests | Completed | 12 passed | Schema, account isolation, offline-session errors, storage failures, answer coalescing, start/submit IDs, conflicts, and Dexie reopen |
| Offline tests | Completed | 3 passed | Downloaded inspection fallback, offline start without API, durable answers, remount restoration, and offline submission queue |
| Sync tests | Completed | 20 passed | `backend/tests/test_sync.py`; PostgreSQL integration tests for idempotency, conflicts, pull, tombstones, and devices |
| Conflict tests | Completed | 2 passed | Conflict list/detail scoping and conflict-resolution permission/version enforcement in `test_sync.py` |
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
| 2026-11-21 | `.venv/Scripts/python.exe -m compileall -q app tests alembic` | Static | 1 | 0 | Phase 5 Python compilation succeeded |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q tests/test_sync.py` | Sync integration | 20 | 0 | 20 PostgreSQL sync tests passed; 2 non-blocking warnings |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q tests/test_sync.py::test_retryable_error_can_be_retried_with_same_operation_id` | Regression | 1 | 0 | Retryable result no longer blocks same-ID retry |
| 2026-11-21 | `.venv/Scripts/python.exe -m pytest -q` (final Phase 5 run) | Full backend suite | 73 | 0 | All Phase 3, Phase 4, and Phase 5 tests passed; 2 non-blocking warnings |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic current` | Migration state | 1 | 0 | Development database was at `0004_template_key` before Phase 5 upgrade |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic upgrade head` | Migration | 1 | 0 | Applied `0005_sync_scope_and_retry` to `field_inspection_db` |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic downgrade 0004_template_key` then `upgrade head` | Migration rollback/upgrade | 1 | 0 | Phase 5 migration downgrade and re-upgrade succeeded |
| 2026-11-21 | `.venv/Scripts/python.exe -m alembic check` | Migration drift | 1 | 0 | No new upgrade operations detected after Phase 5 |
| 2026-11-21 | `.venv/Scripts/python.exe -c "from app.main import create_app; a=create_app(); print('OpenAPI paths:', len(a.openapi()['paths']))"` | OpenAPI generation | 1 | 0 | 33 documented API paths after Phase 5 |
| 2026-11-21 | `npm install` | Dependency setup | 1 | 0 | Added approved UI/test/lint packages; upgraded patched frontend dependency baseline |
| 2026-11-21 | `npm audit --audit-level=moderate` | Security check | 1 | 0 | Zero reported vulnerabilities |
| 2026-11-21 | `npx tsc --noEmit` | TypeScript check | 1 | 0 | Strict TypeScript configuration passed |
| 2026-11-21 | `npm run lint` | Lint | 1 | 0 | ESLint passed with zero warnings |
| 2026-11-21 | `npm test` (first Phase 6 run) | Frontend tests | 0 | 13 | Incomplete jsdom localStorage and async router assertions; fixed with test Storage shim and `findByRole` waits |
| 2026-11-21 | `npm test` (final Phase 6 run) | Frontend tests | 13 | 0 | All UI, router, theme, API client, and online-status tests passed; non-blocking Node localStorage warning remains |
| 2026-11-21 | `npm run build` | Production build | 1 | 0 | Vite 7.3.8 production build succeeded |
| 2026-11-21 | Vite preview smoke check | Frontend startup | 1 | 0 | HTTP 200 and Fieldmark title served from the production build |
| 2026-11-21 | `npx tsc --noEmit` (initial Phase 7 run) | TypeScript check | 0 | 5 | ES2020 `replaceAll`, unused Axios import, and Zod resolver generic errors; all fixed |
| 2026-11-21 | `npm run lint` (initial Phase 7 run) | Lint | 0 | 2 | Unused Axios import error and one hook dependency warning; both fixed |
| 2026-11-21 | `npm test` (first Phase 7 run) | Frontend tests | 12 | 1 | Stale Phase 6 router test expected foundation placeholders; replaced with Phase 7 guard tests |
| 2026-11-21 | `npm test` (first new-test run) | Frontend tests | 27 | 2 | Simulated Axios 401 adapters resolved instead of rejecting; test harness corrected |
| 2026-11-21 | `npm test` (second new-test run) | Frontend tests | 28 | 1 | Refresh retry test exposed stale in-memory token; Axios interceptor now persists the refreshed token before retry |
| 2026-11-21 | `npm test` (final Phase 7 run) | Frontend tests | 29 | 0 | All auth, guard, admin, UI, theme, and online-status tests passed; non-blocking Node localStorage warning remains |
| 2026-11-21 | `npx tsc --noEmit` (final Phase 7 run) | TypeScript check | 1 | 0 | Strict TypeScript configuration passed |
| 2026-11-21 | `npm run lint` (final Phase 7 run) | Lint | 1 | 0 | ESLint passed with zero warnings |
| 2026-11-21 | `npm run build` (Phase 7) | Production build | 1 | 0 | Vite 7.3.8 build succeeded; non-blocking chunk-size warning |
| 2026-11-21 | Vite preview smoke check (Phase 7) | Frontend startup | 1 | 0 | HTTP 200 and Fieldmark application shell served |
| 2026-11-21 | `npm audit --audit-level=moderate` (Phase 7) | Security check | 1 | 0 | Zero reported vulnerabilities |
| 2026-11-21 | `npx tsc --noEmit` (initial Phase 8 run) | TypeScript check | 0 | 1 | Unused type import in the execution schema; removed |
| 2026-11-21 | `npm run lint` (initial Phase 8 run) | Lint | 0 | 1 | Same unused type import; removed |
| 2026-11-21 | `npx vitest run src/features/inspections/inspectorFlows.test.tsx` (first run) | Inspector workflow | 2 | 3 | Default fixture was `ASSIGNED`; execution tests now use `IN_PROGRESS` |
| 2026-11-21 | Inspector workflow test run after fixture fix | Inspector workflow | 3 | 2 | Flat resolver error keys hid per-item validation; resolver now builds nested errors |
| 2026-11-21 | Inspector workflow test run after resolver fix | Inspector workflow | 4 | 1 | Answer controls lacked question-text accessible names; added `aria-label` |
| 2026-11-21 | Inspector workflow test run after accessibility fix | Inspector workflow | 5 | 0 | Final bug: optional multiple-choice `null` failed validation; schema now accepts it |
| 2026-11-21 | `npx tsc --noEmit` (final Phase 8 run) | TypeScript check | 1 | 0 | Strict TypeScript configuration passed |
| 2026-11-21 | `npm run lint` (final Phase 8 run) | Lint | 1 | 0 | ESLint passed with zero warnings |
| 2026-11-21 | `npm test` (final Phase 8 run) | Frontend tests | 34 | 0 | All 8 frontend test files passed; non-blocking Node localStorage warning remains |
| 2026-11-21 | `npm run build` (Phase 8) | Production build | 1 | 0 | Vite build succeeded; non-blocking chunk-size and Zod annotation warnings |
| 2026-11-21 | Vite preview smoke check (Phase 8) | Frontend startup | 1 | 0 | HTTP 200 |
| 2026-11-21 | `npm audit --audit-level=moderate` (Phase 8) | Security check | 1 | 0 | Zero reported vulnerabilities |
| 2026-11-21 | `npx tsc --noEmit` (Phase 9) | TypeScript check | 1 | 0 | Strict TypeScript configuration passed after Dexie table typing was corrected |
| 2026-11-21 | `npm run lint` (Phase 9) | Lint | 1 | 0 | ESLint passed with zero warnings |
| 2026-11-21 | `npm test -- --run` (first Phase 9 full run) | Frontend tests | 47 | 2 | Fixed account-isolation expectation, draft hydration race, and offline test UI assumptions |
| 2026-11-21 | `npm test -- --run` (second Phase 9 full run) | Frontend tests | 47 | 0 | All 10 frontend test files passed after hydration awaited in-flight writes |
| 2026-11-21 | `npx vitest run src/db/localRepositories.test.ts` | IndexedDB tests | 12 | 0 | Schema, isolation, restart, queue, conflict, and storage-failure tests passed |
| 2026-11-21 | `npx vitest run src/features/inspections/offlinePersistence.test.tsx` | Offline workflow tests | 3 | 0 | Download fallback, offline start, durable answers, remount, and offline submission passed |
| 2026-11-21 | `npm test -- --run` (final Phase 9 run) | Frontend tests | 49 | 0 | All 10 frontend test files passed; non-blocking Node localStorage warning remains |
| 2026-11-21 | `npm run build` (Phase 9) | Production build | 1 | 0 | Vite build succeeded; non-blocking chunk-size and Zod annotation warnings |
| 2026-11-21 | Vite preview smoke check (Phase 9) | Frontend startup | 1 | 0 | HTTP 200 |
| 2026-11-21 | `npm audit --audit-level=moderate` (Phase 9) | Security check | 1 | 0 | Zero reported vulnerabilities |

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
| D-020 | 2026-11-21 | Treat `/api/v1/devices` as canonical and `/api/v1/sync/devices` as an alias | Both paths appear in approved documents | Shared device handlers and authorization |
| D-021 | 2026-11-21 | Compute canonical SHA-256 payload identity on the server and reject client-supplied `payload_hash` | Clients must not choose their own hash; retries must preserve identity | `SyncOperationRequest`, `sync_identity.py`, `SyncService` |
| D-022 | 2026-11-21 | Store pull scope on `sync_changes` with `authorized_user_ids` and `is_global` | Tombstones must remain attributable after target rows are deleted | Migration `0005_sync_scope_and_retry`, `SyncChange`, scoped pull repository/service |
| D-023 | 2026-11-21 | Process each push operation in its own database savepoint | One invalid operation must not roll back unrelated work; every operation needs one outcome | `SyncService.push`, idempotency ledger, conflict persistence |
| D-024 | 2026-11-21 | Use lowercase entity types, uppercase operation/change types, and `RETRYABLE_ERROR` in sync contracts | Aligns API responses with `api-contracts.md` while representing temporary failures | Sync schemas, models, and services |
| D-025 | 2026-11-21 | Emit change-feed events transactionally from Phase 4 CRUD services and push operations | Offline devices must pull administrator and inspector writes safely | Site, checklist, inspection, user, and sync services |
| D-026 | 2026-11-21 | Reference the sync ledger row ID from `sync_conflicts.operation_id` | Database foreign key targets `sync_operations.id`, not the client operation UUID | Conflict persistence and `ConflictService` |
| D-027 | 2026-11-21 | Use opaque signed cursors over commit-ordered `change_position` | Prevents client mutation while relying on the existing advisory-lock cursor trigger | `sync_identity.py`, `SyncService.pull` |
| D-028 | 2026-11-21 | Do not finalize `RETRYABLE_ERROR` in the idempotency ledger | Temporary failures must be retryable with the same operation ID | `SyncService._process_operation`, retryable regression test |
| D-029 | 2026-11-21 | Upgrade Vite 7, Vitest 4, React Router 7, and Zod 4 with patched compatible releases | The scaffold versions had published advisories; `npm audit` now reports zero vulnerabilities | `frontend/package.json`, `frontend/package-lock.json`, README prerequisites |
| D-030 | 2026-11-21 | Keep access tokens in application memory and rely on the HTTP-only refresh cookie | Security design prohibits persisting access tokens in local storage or IndexedDB | `frontend/src/lib/axios.ts`, frontend README |
| D-031 | 2026-11-21 | Own shadcn-style component source in the repository using Radix primitives | Phase 6 needs reusable components before feature pages exist | `frontend/components.json`, `frontend/src/components/ui/` |
| D-032 | 2026-11-21 | Persist only the theme preference through Zustand | Theme is a client preference, not an offline database or business record | `frontend/src/store/themeStore.ts` |
| D-033 | 2026-11-21 | Represent every planned frontend route with a labeled placeholder page | Verifies router navigation without starting Phase 7+ feature work | `frontend/src/app/router.tsx`, `frontend/src/pages/` |
| D-034 | 2026-11-21 | Inject an in-memory Storage shim in Vitest setup | The Node/jsdom combination exposed an incomplete global `localStorage` | `frontend/src/test/setup.ts`; test-only behavior |
| D-035 | 2026-11-21 | Keep access tokens in an in-memory module store and expose token setters only through Axios/session services | The security design prohibits persisting access or refresh tokens in browser storage | `frontend/src/lib/accessToken.ts`, `frontend/src/lib/axios.ts`, `frontend/src/services/auth/session.ts` |
| D-036 | 2026-11-21 | Read only the non-HttpOnly CSRF cookie and send it as `X-CSRF-Token` on cookie-authenticated mutations | The HTTP-only refresh cookie cannot be read by JavaScript, while the backend requires double-submit CSRF | `frontend/src/lib/csrf.ts`, `frontend/src/lib/axios.ts` |
| D-037 | 2026-11-21 | Share one refresh promise across concurrent 401 responses and persist the refreshed token before retry | Prevents repeated refresh-token rotation and ensures the retried request sees the new token | `frontend/src/lib/axios.ts`, `frontend/src/services/auth/session.ts` |
| D-038 | 2026-11-21 | Implement a local React Hook Form resolver for Zod schemas | Satisfies the approved validation stack without adding a new npm dependency | `frontend/src/lib/formResolver.ts`, all Phase 7 form dialogs |
| D-039 | 2026-11-21 | Keep inspector workflow and Sync Center routes as placeholders through Phase 7 | Those features are explicitly assigned to later phases; real guards and admin routes can still be verified | `frontend/src/app/router.tsx`, `frontend/src/pages/PlaceholderPage.tsx` |
| D-040 | 2026-11-21 | Scope Python `lib/` and `lib64/` ignore rules to the repository root | A global rule silently ignored all frontend library source directories, including `frontend/src/lib/` | `.gitignore`, Phase 6/7 frontend source commits |
| D-041 | 2026-11-21 | Use an account-scoped in-memory Zustand draft repository in Phase 8 | Keeps inspection interaction local-first and prevents cross-account draft exposure while durable Dexie persistence is deferred to Phase 9 | `frontend/src/features/inspections/store/inspectionDraftStore.ts` |
| D-042 | 2026-11-21 | Persist inspection values locally before sending answer requests | A network failure must never discard valid field inspection work; server confirmation controls the `synced` state | `frontend/src/features/inspections/pages/ExecuteInspectionPage.tsx` |
| D-043 | 2026-11-21 | Create one stable `submission_id` with the draft and reuse it on retries | Backend submission idempotency requires the same client-generated UUID across attempts | `inspectionWorkflow.ts`, `ExecuteInspectionPage.tsx` |
| D-044 | 2026-11-21 | Build nested React Hook Form error objects from Zod issue paths | Dynamic checklist fields need per-item validation messages; flat dotted keys are not recognized by React Hook Form | `frontend/src/lib/formResolver.ts`, `ChecklistAnswerField.tsx` |
| D-045 | 2026-11-21 | Allow `null` for optional multiple-choice answers and expose question text as each control's accessible name | Unanswered optional multi-selects are valid, and screen readers must identify the question rather than a generic “Answer” label | `inspectionExecutionSchemas.ts`, `ChecklistAnswerField.tsx` |
| D-046 | 2026-11-21 | Send `base_version=1` for new answers and the stored answer version for existing answers | Matches backend answer validation and prevents stale answer overwrites | `ExecuteInspectionPage.tsx`, `inspectionWorkflow.ts` |
| D-047 | 2026-11-21 | Use Dexie v1 `fieldmark_local_db` with the eight approved local tables | Phase 9 requires durable local storage with explicit versioning for future migrations | `frontend/src/db/fieldmarkDb.ts` |
| D-048 | 2026-11-21 | Keep the Zustand draft store as a synchronous mirror of IndexedDB | Preserves the Phase 8 page contract and existing tests while making Dexie the durable source of truth | `frontend/src/features/inspections/store/inspectionDraftStore.ts` |
| D-049 | 2026-11-21 | Serialize draft writes per account/inspection key and wait for in-flight writes during hydration | Prevents an unmount/remount race from restoring a stale draft after the final keystroke | `inspectionDraftStore.ts` |
| D-050 | 2026-11-21 | Persist answer records and queue operations in one Dexie transaction | A crash must not leave a locally saved answer without its durable operation | `frontend/src/db/localRepositories.ts` |
| D-051 | 2026-11-21 | Allow pending unsent operations to coalesce but recompute their payload hash; never mutate sent/terminal operations | Maintains retry identity semantics while preventing hash/payload mismatch | `localRepositories.ts`, `services/sync/operationFactory.ts` |
| D-052 | 2026-11-21 | Store only bounded offline-session context in `local_users` | Authentication secrets must never enter IndexedDB; offline access still needs an expiry and owner scope | `localRepositories.ts`, `services/auth/session.ts` |
| D-053 | 2026-11-21 | Avoid API calls for offline start, answer save, and submit; queue durable operations instead | Downloaded inspections must be completable without connectivity; Phase 10 will process the queue | Inspector pages and local repositories |
| D-054 | 2026-11-21 | Fall back to cached details, summaries, sites, and templates when `navigator.onLine` is false | Keeps downloaded assignments and their labels available offline | `frontend/src/features/inspections/services/offlineInspectionService.ts` |
| D-055 | 2026-11-21 | Use `fake-indexeddb` only in Vitest setup | Dexie needs IndexedDB in tests without adding a browser runtime dependency | `frontend/package.json`, `frontend/src/test/setup.ts` |

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
| 2026-11-21 | OpenCode (Big Pickle) | Phase 5 | F-013 | Added device management, canonical hashing and idempotent push, savepoint-isolated operations, conflicts, scoped pull with tombstones, sync status, and transactional change logging; added migration `0005_sync_scope_and_retry` and 20 PostgreSQL sync tests; final suite passed 73 tests | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 5 | Commit | Committed verified Phase 5 work as `7414ece feat: implement phase 5 backend synchronization foundation` after explicit user request | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 6 | F-014 | Added React/Vite foundation, patched dependency baseline, Tailwind theme tokens, 14 shared UI components, router, providers, stores, Axios client, linting, placeholder pages, and 13 frontend tests; lint, typecheck, tests, build, preview, and audit all passed | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 6 | Commit | Committed verified Phase 6 work as `f2b0932 feat: implement phase 6 frontend foundation` after explicit user request; not pushed | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 7 | F-015 | Added login/session lifecycle, CSRF and single-flight refresh handling, protected role-aware routes, admin shell, dashboard, user/site/checklist management, inspection assignment, profile/settings, and 16 new tests; final verification was 29/29 tests, clean lint and typecheck, successful build and preview, and zero audit vulnerabilities | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 7 | Commit | Committed verified Phase 7 work as `3c75a6d feat: implement phase 7 frontend authentication and admin features`; not pushed | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 8 | F-012/F-016 | Added inspector layout, dashboard, assignment list, details and execution pages, dynamic answer controls, validation, progress, account-scoped drafts, and stable-ID submission; final verification was 34/34 tests, clean lint and typecheck, successful build and preview, and zero audit vulnerabilities | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 8 | Commit | Committed verified Phase 8 work as `c5c9eec feat: implement phase 8 inspector workflow` after explicit user request; not pushed | Completed |
| 2026-11-21 | OpenCode (Big Pickle) | Phase 9 | F-017/F-018 | Added versioned Dexie database, account-scoped repositories, offline inspection/checklist caches, durable drafts and answer/start/submit operation queue, offline UI states, and 15 new IndexedDB/offline tests; final verification was 49/49 tests, clean lint and typecheck, successful build and preview, and zero audit vulnerabilities | Completed |

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

Phase 9 — Offline Persistence. All acceptance criteria were verified. Phase 8 was committed as `c5c9eec feat: implement phase 8 inspector workflow`; Phase 9 changes are complete but remain uncommitted in the working tree.

**Current phase:**

Phase 9 — Offline Persistence (Completed; stopped at phase boundary).

**Current feature:**

F-017 IndexedDB Persistence and F-018 Durable Sync Queue.

**Current feature status:**

Completed.

**Last completed task:**

Implemented `fieldmark_local_db` v1 with the eight approved tables, account-scoped repositories, offline inspection/checklist caches, durable drafts and answer/start/submit operations, offline status UI, and 15 new IndexedDB/offline tests. Final verification was 49/49 frontend tests, clean TypeScript and lint checks, a successful production build and preview, and zero audit vulnerabilities.

**Current stopping point:**

Phase 9 is complete. Do not start Phase 10 — Synchronization Engine without explicit approval. Phase 9 changes are uncommitted and should be committed only if the user requests a commit.

## Files to inspect first

1. `progress-tracker.md`
2. `docs/development-phases.md` — Phase 9 acceptance criteria and Phase 10 boundary
3. `docs/offline-sync-design.md` — local schema, queue, and authorization rules
4. `frontend/src/db/fieldmarkDb.ts` — Dexie v1 schema
5. `frontend/src/db/localTypes.ts` — durable record and error types
6. `frontend/src/db/localRepositories.ts` — account-scoped repositories and transactions
7. `frontend/src/services/sync/operationFactory.ts` — stable IDs and payload hashes
8. `frontend/src/features/inspections/store/inspectionDraftStore.ts` — durable draft mirror
9. `frontend/src/features/inspections/services/offlineInspectionService.ts` — offline fallbacks
10. `frontend/src/features/inspections/pages/ExecuteInspectionPage.tsx` — offline execution
11. `frontend/src/features/inspections/pages/InspectionDetailsPage.tsx` — download and offline start
12. `frontend/src/features/inspections/offlinePersistence.test.tsx` — workflow tests
13. `frontend/src/db/localRepositories.test.ts` — IndexedDB tests
14. `frontend/src/services/auth/session.ts` — local account context and sign-out isolation

## Work remaining

- [x] Commit Phase 8 as requested.
- [x] Implement Phase 9 durable local persistence.
- [x] Implement Phase 9 durable queue records and stable operation IDs.
- [x] Verify Phase 9 acceptance criteria.
- [ ] Commit Phase 9 only if the user requests it.
- [ ] In Phase 10, connect the durable queue to push/pull APIs with retries, dependency ordering, and cursor handling.
- [ ] In later phases, add conflict resolution UI, Sync Center, and PWA shell.

## Known problems

- Non-blocking: Node emits a `--localstorage-file` warning during Vitest runs in this environment. Tests pass with the injected test Storage shim.
- Non-blocking: Vite reports chunk-size and Zod comment-annotation warnings. The production build succeeds.
- Non-blocking: installed Starlette/TestClient and passlib/argon2 backend versions emit deprecation warnings. No backend tests fail.
- Non-blocking: optional PATCH fields are displayed as nullable in OpenAPI even though runtime validators reject `null` for non-clearable fields; runtime behavior is correct.
- Resolved: the original global `lib/` ignore rule was fixed and earlier phases included the newly trackable `frontend/src/lib/` sources.
- Intentional Phase 9 limitation: queued operations are durable but are not transmitted until Phase 10.
- Server dashboard counts and local queue counts are shown separately; a unified Sync Center remains Phase 10/11 work.
- Offline access uses a seven-day default validity window and is not revalidated with the server until connectivity returns.
- The login rate limiter remains process-local; a multi-instance deployment needs a shared limiter.

## Next agent instructions

The next agent must:

1. Read `AGENTS.md`, the approved documentation, and this progress tracker.
2. Inspect the actual Phase 9 source files listed above before changing behavior.
3. Confirm Phase 9 is marked Completed and verified.
4. Stop at the phase boundary and wait for explicit approval before Phase 10 — Synchronization Engine.
5. Preserve the account-scoped local IDs, offline-session checks, and durable transaction boundaries.
6. Keep API and IndexedDB access outside presentation components.
7. Preserve stable operation IDs and payload hashes when implementing the sync engine.
8. Preserve the in-memory access-token policy and HTTP-only refresh-cookie strategy.
9. Do not use last-write-wins for inspection answers.
10. Commit Phase 9 only when explicitly requested.

**Exact next action:**

Report Phase 9 completion. Commit Phase 9 only if the user requests it; otherwise stop and wait for approval to start Phase 10 — Synchronization Engine.

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