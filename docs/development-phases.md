# Fieldmark Development Phases

## 1. Purpose

This document defines the complete development roadmap for Fieldmark.

Fieldmark is an offline-first field inspection management application built with:

- React and TypeScript.
- FastAPI and Python.
- PostgreSQL.
- SQLAlchemy and Alembic.
- JWT authentication.
- IndexedDB and Dexie.js.
- Progressive Web App technologies.
- A durable synchronization engine.

The project must be developed incrementally.

Each phase must produce a working and testable result before the next phase begins.

The goal is not simply to build pages and APIs. The goal is to build a reliable application in which inspectors can complete inspection work offline and synchronize it safely when internet connectivity returns.

---

## 2. Development Principles

Follow these principles throughout development.

### 2.1 Build in dependency order

Implement the database foundation before building dependent backend features.

Implement backend contracts before integrating frontend features.

Implement local persistence before building the complete synchronization engine.

Do not develop all frontend pages independently and integrate them at the end.

### 2.2 Complete one phase at a time

Every phase must have:

- A defined objective.
- Required implementation tasks.
- Expected files and deliverables.
- Tests.
- Acceptance criteria.

Do not mark a phase complete merely because its files have been created.

### 2.3 Keep documentation synchronized

When implementation decisions change, update the corresponding documentation.

Relevant documents include:

- `PRD.md`
- `architecture.md`
- `database-design.md`
- `api-contracts.md`
- `offline-sync-design.md`
- `security-design.md`
- `frontend-design.md`
- `development-phases.md`
- `testing-strategy.md`

### 2.4 Prefer small, testable changes

- Keep features modular.
- Avoid unnecessary abstractions.
- Use clear naming conventions.
- Write tests alongside implementation.
- Avoid duplicating business logic.
- Validate both successful and failure scenarios.

### 2.5 Preserve offline reliability

Never postpone local persistence until after the online application is complete.

Offline data storage and synchronization must influence the architecture from the beginning.

---

## 3. Overall Development Roadmap

Fieldmark will be developed in the following phases.

| Phase | Name | Main Outcome |
|---|---|---|
| 0 | Project Foundation | Repository and development environment |
| 1 | Database Foundation | PostgreSQL schema and migrations |
| 2 | Backend Foundation | FastAPI application structure |
| 3 | Authentication and Authorization | Secure login and role-based access |
| 4 | Core Backend Features | Users, sites, checklists, inspections |
| 5 | Backend Synchronization Foundation | Operation ledger and change feed |
| 6 | Frontend Foundation | React application and shared UI |
| 7 | Frontend Authentication and Admin Features | Admin workflows |
| 8 | Inspector Workflow | Inspection execution and local saving |
| 9 | Offline Persistence | IndexedDB and local repositories |
| 10 | Synchronization Engine | Push, pull, retry, and idempotency |
| 11 | Conflict Management | Conflict detection and resolution |
| 12 | PWA and Offline Application Shell | Installable offline application |
| 13 | Integration and Quality Assurance | End-to-end verification |
| 14 | Deployment and Release | Production-ready application |

---

# PHASE 0 — Project Foundation

## Objective

Create the initial repository structure and prepare the local development environment.

## Tasks

1. Create the Fieldmark project directory.
2. Initialize Git.
3. Create frontend and backend directories.
4. Create the documentation directory.
5. Add root configuration files.
6. Configure environment-variable examples.
7. Prepare the local PostgreSQL environment.
8. Define development commands.
9. Establish code formatting and linting conventions.

## Expected structure

```text
Fieldmark/
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
│   └── testing-strategy.md
│
├── frontend/
│
├── backend/
│
├── .gitignore
├── AGENTS.md
└── README.md
```

## PostgreSQL setup

Create a PostgreSQL database named:

`field_inspection_db`

Use pgAdmin or another PostgreSQL administration tool.

Create a dedicated application database user rather than using the PostgreSQL superuser for normal application access.

## Deliverables

- Git repository initialized.
- Initial folder structure created.
- PostgreSQL database created.
- Development environment documented.
- `.env.example` files prepared.

## Acceptance criteria

- [ ] Repository is initialized.
- [ ] Frontend and backend directories exist.
- [ ] PostgreSQL connection works.
- [ ] Documentation is available.
- [ ] Secrets are excluded from Git.
- [ ] Development setup instructions are documented.

---

# PHASE 1 — Database Foundation

## Objective

Implement the PostgreSQL database schema and establish migration management.

## Tasks

1. Configure SQLAlchemy.
2. Configure Alembic.
3. Implement database connection settings.
4. Create database models.
5. Define relationships and foreign keys.
6. Add uniqueness constraints.
7. Add indexes.
8. Define versioning fields.
9. Define synchronization-related tables.
10. Generate and apply the initial migration.

## Core tables

The initial schema must cover:

1. `users`
2. `refresh_tokens`
3. `sites`
4. `inspections`
5. `checklist_templates`
6. `checklist_items`
7. `inspection_results`
8. `inspection_answers`
9. `sync_operations`
10. `sync_devices`
11. `sync_conflicts`
12. `sync_changes`

Additional tables may be introduced if the detailed database design requires them.

## Important database decisions

- Use UUID identifiers for application entities.
- Store timestamps in UTC.
- Use foreign keys to enforce relationships.
- Use appropriate unique constraints.
- Use database transactions for critical operations.
- Add version fields for concurrency control.
- Design the operation ledger for idempotency.
- Design the change feed to avoid missing changes during concurrent transactions.
- Define the inspection lifecycle clearly.
- Separate mutable drafts from immutable submission snapshots where required.

Do not assume a simple auto-increment sequence provides a commit-ordered synchronization cursor.

## Deliverables

- SQLAlchemy models.
- Alembic configuration.
- Initial migration.
- Database relationship implementation.
- Database connection verification.

## Acceptance criteria

- [ ] All required tables exist.
- [ ] Foreign-key relationships work.
- [ ] Constraints are enforced.
- [ ] Alembic migrations run successfully.
- [ ] Database connection works through the application.
- [ ] Database design matches the approved documentation.

---

# PHASE 2 — Backend Foundation

## Objective

Create the FastAPI application structure and establish reusable backend infrastructure.

## Tasks

1. Initialize the Python project.
2. Create and activate a virtual environment.
3. Install backend dependencies.
4. Configure FastAPI.
5. Configure environment settings.
6. Configure database sessions.
7. Create shared API response schemas.
8. Configure exception handling.
9. Configure structured logging.
10. Configure CORS.
11. Configure API versioning.
12. Add health-check endpoints.

## Expected structure

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── logging.py
│   │   └── exceptions.py
│   │
│   ├── database/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── models/
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   └── dependencies/
│
├── alembic/
├── tests/
├── .env.example
├── alembic.ini
├── pyproject.toml
└── README.md
```

## Deliverables

- Running FastAPI application.
- Database connection.
- Health endpoints.
- Centralized configuration.
- Shared error handling.
- API documentation available through development Swagger UI.

## Acceptance criteria

- [ ] FastAPI starts successfully.
- [ ] PostgreSQL connection works.
- [ ] Health endpoint responds correctly.
- [ ] API version prefix is configured.
- [ ] CORS works for the development frontend.
- [ ] Application errors use consistent response formats.
- [ ] Initial backend tests pass.

---

# PHASE 3 — Authentication and Authorization

## Objective

Implement secure user authentication and backend role enforcement.

## Tasks

1. Implement Argon2id password hashing.
2. Create login schemas.
3. Implement login service.
4. Generate JWT access tokens.
5. Implement refresh-token generation.
6. Store refresh-token hashes.
7. Implement refresh-token rotation.
8. Implement logout and revocation.
9. Implement authentication dependencies.
10. Implement role-based authorization.
11. Implement resource-level authorization.
12. Add authentication tests.

## Required endpoints

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

## Deliverables

- Working login.
- Access-token validation.
- Refresh-token rotation.
- Logout.
- RBAC dependencies.
- Resource authorization helpers.

## Acceptance criteria

- [ ] Valid users can log in.
- [ ] Invalid credentials are rejected.
- [ ] Passwords are stored as Argon2id hashes.
- [ ] Refresh tokens are stored as hashes.
- [ ] Refresh-token rotation works.
- [ ] Revoked tokens cannot be reused.
- [ ] Admin-only endpoints reject inspectors.
- [ ] Inspectors cannot access unauthorized resources.
- [ ] Authentication tests pass.

---

# PHASE 4 — Core Backend Features

## Objective

Implement the primary business functionality before integrating the frontend.

## Feature 4.1 — User Management

Implement:

- Create user.
- List users.
- Get user details.
- Update user.
- Activate/deactivate user.
- Role assignment.

## Feature 4.2 — Site Management

Implement:

- Create site.
- List sites.
- Get site details.
- Update site.
- Change site status.

## Feature 4.3 — Checklist Management

Implement:

- Create checklist template.
- Add checklist items.
- Update checklist items.
- Publish a template revision.
- List templates.
- Get template details.
- Deactivate templates.

Published revisions must be handled consistently so existing inspections retain their assigned revision.

## Feature 4.4 — Inspection Management

Implement:

- Create inspection.
- Assign inspector.
- List inspections.
- Get inspection details.
- Start inspection.
- Update inspection state.
- Save inspection answers.
- Submit inspection.

## Feature 4.5 — Dashboard

Implement:

- Total users.
- Active inspectors.
- Total sites.
- Inspection counts.
- Pending inspections.
- Completed inspections.
- Relevant synchronization statistics.

## Deliverables

- User APIs.
- Site APIs.
- Checklist APIs.
- Inspection APIs.
- Dashboard API.
- Business-rule validation.
- Automated backend tests.

## Acceptance criteria

- [ ] Administrators can manage users.
- [ ] Administrators can manage sites.
- [ ] Administrators can manage checklist templates.
- [ ] Administrators can assign inspections.
- [ ] Inspectors can access authorized assignments.
- [ ] Inspectors can save answers.
- [ ] Inspection submission validates business rules.
- [ ] Dashboard data is correct.
- [ ] Authorization tests pass.

---

# PHASE 5 — Backend Synchronization Foundation

## Objective

Prepare backend infrastructure for reliable offline synchronization.

This phase must be completed before implementing the full frontend sync engine.

## Tasks

1. Implement the synchronization operation ledger.
2. Define operation ID uniqueness rules.
3. Implement canonical payload hashing.
4. Implement duplicate operation detection.
5. Implement changed-payload rejection.
6. Implement entity version checks.
7. Implement server-side change logging.
8. Design and implement safe change-feed cursor generation.
9. Implement authorization-scoped pull queries.
10. Implement tombstone support.
11. Implement sync device registration.
12. Add synchronization integration tests.

## Required endpoints

```text
POST /api/v1/sync/devices
GET  /api/v1/sync/devices
POST /api/v1/sync/devices/{device_id}/revoke

POST /api/v1/sync/push
GET  /api/v1/sync/pull

GET  /api/v1/sync/status
GET  /api/v1/sync/conflicts
GET  /api/v1/sync/conflicts/{conflict_id}
POST /api/v1/sync/conflicts/{conflict_id}/resolve
```

## Important implementation rules

- Every operation must have a stable ID.
- Operation ID and payload hash must be validated together.
- Duplicate requests must return their original results.
- Idempotency records and business changes must be committed atomically.
- Base versions must be checked on the server.
- Conflicts must preserve both versions.
- Pull results must be restricted to authorized data.
- Cursor advancement must be safe under concurrent writes.
- The backend must return an outcome for every submitted operation.

## Deliverables

- Sync operation ledger.
- Push API.
- Pull API.
- Change-feed implementation.
- Device management.
- Conflict persistence.
- Backend synchronization tests.

## Acceptance criteria

- [ ] Duplicate operations do not create duplicate records.
- [ ] Reused IDs with different payloads are rejected.
- [ ] Version conflicts are detected.
- [ ] Pull pagination works.
- [ ] Concurrent server changes are not skipped.
- [ ] User-specific synchronization is enforced.
- [ ] Tombstones are supported.
- [ ] Synchronization integration tests pass.

---

# PHASE 6 — Frontend Foundation

## Objective

Create the React application foundation.

## Tasks

1. Initialize React with TypeScript and Vite.
2. Configure Tailwind CSS.
3. Configure shadcn/ui.
4. Configure React Router.
5. Configure TanStack Query.
6. Configure Zustand.
7. Configure Axios.
8. Configure theme management.
9. Create global styles.
10. Create shared UI components.
11. Configure linting and testing.

## Shared components

Create:

- Button.
- Input.
- Select.
- Dialog.
- Dropdown menu.
- Card.
- Table.
- Badge.
- Tabs.
- Toast.
- Skeleton.
- Empty state.
- Loading indicator.
- Error state.

## Deliverables

- Running frontend.
- Shared component system.
- Router.
- Theme switching.
- API client.
- Initial testing setup.

## Acceptance criteria

- [ ] Frontend starts successfully.
- [ ] TypeScript configuration works.
- [ ] Tailwind styles work.
- [ ] Shared components render correctly.
- [ ] Light and dark themes work.
- [ ] Router navigation works.
- [ ] Frontend tests run successfully.

---

# PHASE 7 — Frontend Authentication and Admin Features

## Objective

Implement authentication and the administrator workflows.

## Tasks

1. Create login page.
2. Implement login integration.
3. Implement access-token lifecycle.
4. Implement refresh handling.
5. Implement protected routes.
6. Implement admin layout.
7. Implement sidebar and header.
8. Implement admin dashboard.
9. Implement user management.
10. Implement site management.
11. Implement checklist management.
12. Implement inspection assignment pages.

## Deliverables

- Working login.
- Admin navigation.
- Admin dashboard.
- User management UI.
- Site management UI.
- Checklist management UI.
- Inspection assignment UI.

## Acceptance criteria

- [ ] Administrator can log in.
- [ ] Administrator sees admin navigation.
- [ ] User CRUD works through the backend.
- [ ] Site CRUD works through the backend.
- [ ] Checklist management works through the backend.
- [ ] Inspection assignment works.
- [ ] Unauthorized navigation is blocked.
- [ ] Admin feature tests pass.

---

# PHASE 8 — Inspector Workflow

## Objective

Implement the complete inspection workflow.

## Tasks

1. Create inspector layout.
2. Create inspector dashboard.
3. Create My Inspections page.
4. Create inspection details page.
5. Create inspection execution page.
6. Build dynamic checklist rendering.
7. Implement answer controls based on item type.
8. Implement form validation.
9. Implement inspection progress.
10. Implement draft saving.
11. Implement submission workflow.

At this stage, implement the inspection interaction using the approved data-access architecture.

Do not make the entire application dependent on online API calls.

## Deliverables

- Inspector dashboard.
- Assigned inspection list.
- Inspection details.
- Inspection execution UI.
- Answer validation.
- Draft workflow.
- Submission integration.

## Acceptance criteria

- [ ] Inspectors can view their assignments.
- [ ] Inspectors can open an inspection.
- [ ] Checklist items render dynamically.
- [ ] Required answers are validated.
- [ ] Inspection progress is calculated correctly.
- [ ] Drafts are preserved.
- [ ] Submission follows backend rules.
- [ ] Inspector workflow tests pass.

---

# PHASE 9 — Offline Persistence

## Objective

Implement durable browser-side data persistence.

This phase establishes the local foundation before full synchronization.

## Tasks

1. Configure Dexie.
2. Define IndexedDB tables.
3. Implement database versioning.
4. Implement local repositories.
5. Implement inspection downloads.
6. Implement local checklist caching.
7. Implement local answer storage.
8. Implement user/device scoping.
9. Implement local transaction handling.
10. Implement offline status indicators.
11. Test browser refresh and restart behavior.

## Required local tables

- `local_users`
- `local_sites`
- `local_inspections`
- `local_checklist_templates`
- `local_inspection_answers`
- `sync_queue`
- `sync_metadata`
- `sync_conflicts`

## Deliverables

- Dexie database.
- Local repositories.
- Offline inspection access.
- Local answer persistence.
- Local database migration strategy.

## Acceptance criteria

- [ ] Downloaded inspections are available offline.
- [ ] Checklist templates remain available offline.
- [ ] Answers save locally.
- [ ] Local changes survive refresh.
- [ ] Local changes survive application restart.
- [ ] Local data is isolated by account.
- [ ] IndexedDB errors are handled.
- [ ] Offline persistence tests pass.

---

# PHASE 10 — Synchronization Engine

## Objective

Connect local persistence to the backend synchronization APIs.

## Tasks

1. Create operation factory.
2. Create durable queue service.
3. Implement operation dependencies.
4. Implement synchronization locking.
5. Implement connectivity management.
6. Implement push synchronization.
7. Implement per-operation result handling.
8. Implement pull synchronization.
9. Implement safe local batch application.
10. Implement cursor persistence.
11. Implement exponential backoff with jitter.
12. Implement manual synchronization.
13. Implement synchronization triggers.
14. Add synchronization integration tests.

## Required behavior

### Push

- Load eligible operations.
- Preserve stable operation IDs.
- Respect dependency ordering.
- Submit bounded batches.
- Store each server result.
- Preserve failed and conflicting operations.

### Pull

- Load the last successful cursor.
- Fetch authorized server changes.
- Apply changes transactionally.
- Advance the cursor only after successful local application.
- Process additional pages when available.

### Retry

- Retry temporary failures.
- Respect `Retry-After` for rate limiting.
- Stop retrying permanent validation failures.
- Route version conflicts to conflict handling.
- Preserve operation identity.

## Deliverables

- Working synchronization engine.
- Push service.
- Pull service.
- Retry manager.
- Dependency manager.
- Connectivity manager.
- Sync status state.

## Acceptance criteria

- [ ] Pending operations synchronize successfully.
- [ ] Duplicate operations remain idempotent.
- [ ] Dependencies are respected.
- [ ] Failed requests can be retried.
- [ ] Pull changes apply safely.
- [ ] Cursor advancement is transactional.
- [ ] Multiple sync triggers do not cause unsafe duplicate processing.
- [ ] Sync tests pass.

---

# PHASE 11 — Conflict Management

## Objective

Implement safe handling of concurrent changes.

## Tasks

1. Detect server version conflicts.
2. Persist local conflict snapshots.
3. Store server conflict snapshots.
4. Implement conflict listing.
5. Build conflict details UI.
6. Implement accept-server workflow.
7. Implement keep-local workflow.
8. Implement manual resolution where permitted.
9. Submit resolutions as new version-checked operations.
10. Record resolution audit events.
11. Add conflict tests.

## Deliverables

- Conflict detection.
- Conflict persistence.
- Conflict resolution UI.
- Resolution APIs.
- Conflict audit history.

## Acceptance criteria

- [x] Conflicts are detected.
- [x] Local data is preserved.
- [x] Server data is preserved.
- [x] Users can review differences.
- [x] Resolution requires explicit user action.
- [x] New operations use the correct base version.
- [x] Unauthorized resolution is rejected.
- [x] Conflict tests pass.

---

# PHASE 12 — PWA and Offline Application Shell

## Objective

Make Fieldmark installable and available as an offline application shell.

## Tasks

1. Create web app manifest.
2. Configure application icons.
3. Configure service worker.
4. Cache approved static assets.
5. Implement offline application loading.
6. Implement service-worker update handling.
7. Test application startup without internet.
8. Verify that sensitive API responses are not cached improperly.

## Important rules

- IndexedDB remains the source of durable offline business data.
- Service-worker caching is primarily for the application shell and approved static resources.
- Do not cache user-specific API responses in a way that leaks data between accounts.
- Background Sync is an optional enhancement.
- Foreground synchronization must work independently.

## Deliverables

- PWA manifest.
- Service worker.
- Offline application shell.
- Cache management.
- Update handling.

## Acceptance criteria

- [x] Application can be installed where supported.
- [x] Application shell loads offline.
- [x] Downloaded inspection data remains available.
- [x] Cache updates work correctly.
- [x] User-specific data is not leaked through caches.
- [x] Offline startup tests pass.

---

# PHASE 13 — Integration and Quality Assurance

## Objective

Validate the entire application as one integrated system.

## Tasks

1. Verify frontend/backend integration.
2. Verify authentication and authorization.
3. Verify database migrations.
4. Verify all core CRUD workflows.
5. Verify inspection lifecycle.
6. Verify offline editing.
7. Verify push synchronization.
8. Verify pull synchronization.
9. Verify idempotency.
10. Verify conflict resolution.
11. Verify user isolation.
12. Verify responsive behavior.
13. Verify accessibility.
14. Run security tests.
15. Run performance checks.
16. Resolve critical defects.

## Essential end-to-end scenarios

### Scenario A — Complete inspection online

1. Admin logs in.
2. Admin creates a site.
3. Admin creates a checklist.
4. Admin creates an inspection.
5. Admin assigns an inspector.
6. Inspector logs in.
7. Inspector completes the inspection.
8. Inspector submits it.
9. Admin reviews the completed inspection.

### Scenario B — Complete inspection offline

1. Inspector logs in while online.
2. Inspector downloads an assignment.
3. Internet connection is disabled.
4. Inspector opens the downloaded inspection.
5. Inspector completes checklist answers.
6. Browser is refreshed.
7. Local answers remain available.
8. Internet connection is restored.
9. Synchronization begins.
10. Backend accepts the operations.
11. Inspector sees the synchronized state.
12. Admin can view the updated inspection.

### Scenario C — Duplicate operation

1. Create a local operation.
2. Send it to the backend.
3. Simulate a lost response.
4. Retry the same operation ID.
5. Confirm that no duplicate record is created.

### Scenario D — Conflict

1. Download an inspection answer.
2. Modify it offline.
3. Update the same answer from another authorized session.
4. Reconnect.
5. Confirm that a conflict is detected.
6. Review both values.
7. Resolve the conflict.
8. Confirm the resolution is recorded.

### Scenario E — Interrupted synchronization

1. Start push or pull synchronization.
2. Interrupt the browser or network.
3. Restart the application.
4. Verify pending work remains.
5. Retry synchronization.
6. Verify no changes are lost or duplicated.

## Deliverables

- Passing automated test suite.
- End-to-end test results.
- Security test results.
- Defect report.
- Integration verification.

## Acceptance criteria

- [x] Core online workflows pass.
- [x] Offline workflow passes.
- [x] Duplicate retry tests pass.
- [x] Conflict tests pass.
- [x] Interrupted synchronization tests pass.
- [x] User isolation tests pass.
- [x] Responsive UI checks pass.
- [x] No unresolved critical security defects remain.
- [x] Release-blocking defects are resolved.

---

# PHASE 14 — Deployment and Release

## Objective

Prepare Fieldmark for a production deployment.

## Tasks

1. Prepare production frontend build.
2. Configure production FastAPI settings.
3. Provision production PostgreSQL.
4. Configure production secrets.
5. Configure HTTPS.
6. Configure trusted CORS origins.
7. Configure secure cookies.
8. Apply database migrations.
9. Configure backend hosting.
10. Configure frontend hosting.
11. Configure backups.
12. Configure logs and monitoring.
13. Verify health checks.
14. Run production smoke tests.
15. Document deployment and recovery.

## Deployment considerations

### Frontend

- Build optimized production assets.
- Configure production API URL.
- Verify service-worker registration.
- Verify offline application startup.
- Configure correct SPA fallback routing.

### Backend

- Run FastAPI with a production ASGI server configuration.
- Disable development-only debug behavior.
- Load secrets from protected configuration.
- Restrict CORS origins.
- Configure secure cookies.
- Configure database connection pooling.
- Apply migrations through the deployment process.

### Database

- Use a dedicated database account.
- Restrict network access.
- Configure backups.
- Test database restoration.
- Monitor storage and connection usage.

### Operational readiness

- Configure structured logs.
- Monitor API availability.
- Monitor synchronization failures.
- Monitor database health.
- Establish a backup retention policy.
- Document rollback procedures.

## Deliverables

- Production frontend.
- Production backend.
- Production database.
- Deployment instructions.
- Backup and recovery instructions.
- Release verification checklist.

## Acceptance criteria

- [ ] Frontend is deployed.
- [ ] Backend is deployed.
- [ ] PostgreSQL connection works.
- [ ] Migrations are applied successfully.
- [ ] HTTPS works.
- [ ] Secure authentication works.
- [ ] Offline workflows work in the deployed environment.
- [ ] Synchronization works in the deployed environment.
- [ ] Backup and restoration procedures are documented.
- [ ] Production smoke tests pass.

---

## 4. Recommended Milestone Checkpoints

Use these checkpoints to assess project progress.

| Milestone | Completed phases | Expected result |
|---|---|---|
| M1 | 0–2 | Project and backend foundation |
| M2 | 3–4 | Secure online business workflows |
| M3 | 5 | Backend synchronization foundation |
| M4 | 6–8 | Functional frontend and inspection workflow |
| M5 | 9 | Durable offline persistence |
| M6 | 10–11 | Reliable synchronization and conflict management |
| M7 | 12–13 | PWA and verified integrated application |
| M8 | 14 | Production release |

A milestone is complete only when its acceptance criteria are met.

---

## 5. Critical Dependencies

The following dependencies must be respected.

```text id="6s7x9u"
PROJECT FOUNDATION
        |
        v
DATABASE FOUNDATION
        |
        v
BACKEND FOUNDATION
        |
        v
AUTHENTICATION
        |
        v
CORE BUSINESS APIs
        |
        v
BACKEND SYNC FOUNDATION
        |
        +----------------------+
        |                      |
        v                      v
FRONTEND FOUNDATION      SYNC API VALIDATION
        |
        v
ADMIN FEATURES
        |
        v
INSPECTOR WORKFLOW
        |
        v
OFFLINE PERSISTENCE
        |
        v
SYNC ENGINE
        |
        v
CONFLICT MANAGEMENT
        |
        v
PWA AND INTEGRATION TESTS
        |
        v
DEPLOYMENT
```

Some frontend and backend tasks can proceed in parallel after their contracts and dependencies are stable.

However, the following must not be skipped:

- Database design before database implementation.
- API contract agreement before frontend/backend integration.
- Local persistence before reliable offline editing.
- Idempotency before safe synchronization retries.
- Conflict detection before conflict resolution UI.
- End-to-end testing before production release.

---

## 6. Definition of Phase Completion

A phase is complete only when:

1. All required implementation tasks are finished.
2. Expected files and deliverables exist.
3. Automated tests for the phase pass.
4. Acceptance criteria are satisfied.
5. Documentation reflects implementation changes.
6. No known unresolved critical defects remain.
7. Changes are committed to Git.

Do not advance based only on a partially implemented feature.

---

## 7. Git and Change Management

Use small, meaningful commits.

Suggested commit examples:

```text
chore: initialize Fieldmark project
feat(database): create initial PostgreSQL schema
feat(auth): implement JWT authentication
feat(users): implement user management APIs
feat(inspections): implement inspection workflow
feat(sync): implement idempotent push endpoint
feat(sync): implement safe pull change feed
feat(frontend): create admin dashboard
feat(offline): add Dexie local persistence
feat(sync): implement synchronization engine
feat(conflicts): implement conflict resolution
test: add offline synchronization scenarios
docs: update deployment instructions
```

Do not commit:

- `.env` files containing secrets.
- Database credentials.
- Access tokens.
- Refresh tokens.
- Private signing keys.
- User inspection data.

---

## 8. Risk Management

| Risk | Impact | Mitigation |
|---|---|---|
| Lost offline data | Critical | Durable IndexedDB transactions and recovery tests |
| Duplicate operations | High | Idempotency ledger and stable operation IDs |
| Missing pull changes | Critical | Snapshot-safe change-feed cursor design |
| Unauthorized access | Critical | Backend RBAC and resource-level authorization |
| Refresh-token theft | High | HTTP-only cookies, rotation, and revocation |
| Conflicting answers | High | Version checks and explicit resolution |
| Browser storage failure | High | Error handling and clear user feedback |
| Interrupted synchronization | High | Durable queue and transactional cursor updates |
| Incorrect template revisions | High | Immutable published revisions |
| Poor mobile usability | Medium | Mobile-first inspection testing |
| Deployment configuration errors | High | Production smoke tests and environment validation |

---

## 9. Final Development Strategy

Fieldmark must be built in the following broad order:

1. Establish the project and database foundation.
2. Build the backend and authentication.
3. Complete core inspection business APIs.
4. Implement backend synchronization guarantees.
5. Build the frontend foundation and business workflows.
6. Implement durable local persistence.
7. Build the synchronization engine.
8. Implement conflict resolution.
9. Add PWA functionality.
10. Verify the complete offline-first workflow.
11. Deploy and monitor the application.

The most important milestone is not the completion of the dashboard or CRUD pages.

It is successfully completing an inspection offline, preserving its data after a browser restart, synchronizing it exactly once when connectivity returns, and detecting conflicts without silently losing either version.

That workflow defines the core reliability of Fieldmark.