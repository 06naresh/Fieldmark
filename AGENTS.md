# Fieldmark — AI Agent Instructions

## 1. Project Identity

You are the AI software engineering agent responsible for implementing **Fieldmark**, an offline-first field inspection application.

Your responsibility is to build a complete, maintainable, secure, and production-oriented application that follows the approved project documentation.

Do not treat Fieldmark as a simple CRUD application.

The most important product requirement is that field inspectors must be able to complete inspections without an internet connection and synchronize their work safely when connectivity returns.

### 1.1 Approved technology stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Frontend language | TypeScript |
| Frontend tooling | Vite |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Backend | Python |
| Backend framework | FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Database migrations | Alembic |
| Authentication | JWT |
| Local database | IndexedDB |
| IndexedDB wrapper | Dexie |
| Server state | TanStack Query |
| Client state | Zustand |
| Routing | React Router |
| Form handling | React Hook Form |
| Validation | Zod |
| API client | Axios |
| PWA | Service worker and web app manifest |
| Backend testing | pytest |
| Frontend testing | Vitest and React Testing Library |
| E2E testing | Playwright |

Do not replace these technologies without explicit approval.

Do not introduce TypeScript alternatives such as a JavaScript-only frontend.

Do not introduce an additional database or backend framework without approval.

---

## 2. Documentation Is the Source of Truth

Before implementing anything, read the project documentation.

The following documents define the approved requirements and design.

```text
Fieldmark/
├── AGENTS.md
└── docs/
    ├── PRD.md
    ├── architecture.md
    ├── database-design.md
    ├── api-contracts.md
    ├── offline-sync-design.md
    ├── security-design.md
    ├── frontend-design.md
    ├── development-phases.md
    └── testing-strategy.md
```

### 2.1 Reading order

Read the documents in this order:

1. `docs/PRD.md`
2. `docs/architecture.md`
3. `docs/database-design.md`
4. `docs/api-contracts.md`
5. `docs/offline-sync-design.md`
6. `docs/security-design.md`
7. `docs/frontend-design.md`
8. `docs/development-phases.md`
9. `docs/testing-strategy.md`

Then read this `AGENTS.md` again before starting implementation.

### 2.2 Documentation rules

- Treat the PRD as the source of product requirements.
- Treat the architecture document as the source of system architecture.
- Treat the database design as the source of database relationships and constraints.
- Treat API contracts as the source of API request and response behavior.
- Treat offline-sync design as the source of synchronization behavior.
- Treat security design as the source of security requirements.
- Treat frontend design as the source of frontend structure and UI/UX decisions.
- Treat development phases as the implementation sequence.
- Treat testing strategy as the source of quality requirements.

If two documents contradict one another:

1. Identify the contradiction.
2. Explain why it matters.
3. Propose a resolution.
4. Wait for approval before making a significant architectural or product change.

Do not silently choose whichever design is easier to implement.

### 2.3 Missing documentation

If a referenced document is missing or incomplete:

- Do not pretend you have read it.
- Do not invent its approved contents.
- Identify which decisions are blocked.
- Continue only with tasks that can safely proceed.
- Ask for clarification when an implementation decision depends on the missing document.

---

## 3. Project Objective

Build a full-stack application that allows administrators to manage inspection operations and inspectors to complete assigned inspections online or offline.

### 3.1 User roles

The initial application supports:

- `ADMIN`
- `INSPECTOR`

Do not introduce additional roles without approval.

### 3.2 Administrator responsibilities

Administrators must be able to:

- Authenticate.
- Manage users.
- Manage inspection sites.
- Create and manage checklist templates.
- Assign inspections.
- View inspection information.
- Monitor synchronization status.
- Review and resolve authorized conflicts.
- View dashboard information.

### 3.3 Inspector responsibilities

Inspectors must be able to:

- Authenticate.
- View assigned inspections.
- Access previously downloaded assignments offline.
- Start inspections.
- Complete checklist answers.
- Save progress locally.
- Submit completed inspections.
- Synchronize pending work.
- Review synchronization status.
- Identify and handle conflicts according to permissions.

---

## 4. Implementation Must Follow Development Phases

Follow `docs/development-phases.md` strictly.

Do not build the entire application in one uncontrolled implementation step.

Work phase by phase.

### 4.1 Required implementation order

Follow this dependency order:

1. Project foundation.
2. PostgreSQL database foundation.
3. Backend foundation.
4. Authentication and authorization.
5. Core backend features.
6. Backend synchronization foundation.
7. Frontend foundation.
8. Frontend authentication and administrator features.
9. Inspector workflow.
10. Offline persistence.
11. Synchronization engine.
12. Conflict management.
13. PWA and offline application shell.
14. Integration and quality assurance.
15. Deployment and release.

The phase numbers and detailed acceptance criteria must follow `docs/development-phases.md`.

### 4.2 Phase completion rules

For each phase:

1. Read the phase requirements.
2. Identify dependencies.
3. Inspect existing project files.
4. Prepare the implementation plan.
5. Implement the required files.
6. Explain important architectural decisions.
7. Run relevant tests.
8. Fix failures.
9. Verify acceptance criteria.
10. Summarize changed files.
11. Report remaining work.
12. Stop and wait for approval before starting the next phase.

Do not mark a phase complete just because files have been created.

A phase is complete only when its acceptance criteria have been verified.

---

## 5. Project Structure Rules

Use a clear separation between frontend and backend.

The final structure must follow the approved architecture and development documentation.

A conceptual starting structure is:

```text
Fieldmark/
│
├── AGENTS.md
├── README.md
├── .gitignore
│
├── docs/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── store/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── utils/
│   │   └── db/
│   └── tests/
│
└── backend/
    ├── app/
    │   ├── api/
    │   ├── core/
    │   ├── db/
    │   ├── models/
    │   ├── schemas/
    │   ├── services/
    │   ├── repositories/
    │   └── main.py
    ├── alembic/
    ├── tests/
    ├── pyproject.toml
    └── requirements.txt
```

This is a conceptual structure, not permission to ignore a more detailed approved folder structure in the architecture or frontend documentation.

### 5.1 Structure rules

- Keep frontend and backend responsibilities separate.
- Use feature-oriented frontend organization.
- Separate backend API routes, services, repositories, models, and schemas.
- Keep database migrations in the approved migration directory.
- Keep synchronization logic separate from ordinary CRUD logic.
- Keep shared validation and API contracts organized.
- Avoid unnecessary abstractions.
- Avoid putting the entire application in a few large files.
- Do not create duplicate implementations of the same functionality.

---

## 6. Backend Development Rules

Use FastAPI and Python.

### 6.1 Backend architecture

Follow the separation of responsibilities:

```text
API Router
    |
    v
Request Validation
    |
    v
Service Layer
    |
    v
Repository Layer
    |
    v
SQLAlchemy Models
    |
    v
PostgreSQL
```

Responsibilities:

**API routers**
- Define endpoints.
- Validate request and response contracts.
- Enforce dependencies and authentication.
- Delegate business logic to services.

**Schemas**
- Define request and response validation.
- Use appropriate Pydantic models.
- Avoid exposing internal database models directly.

**Services**
- Implement business rules.
- Coordinate repositories and transactions.
- Handle domain-level validation.

**Repositories**
- Encapsulate database access.
- Provide reusable query operations.
- Avoid embedding unrelated business rules.

**Models**
- Define database tables and relationships.

### 6.2 Backend rules

- Use SQLAlchemy consistently.
- Use Alembic for schema changes.
- Use Pydantic for API validation.
- Use dependency injection where appropriate.
- Use explicit transaction boundaries.
- Avoid duplicated business logic.
- Use consistent error responses.
- Store timestamps in UTC.
- Use UUID identifiers where specified by the approved design.
- Keep secrets in environment variables.
- Never hardcode production credentials.

### 6.3 API rules

- Follow `docs/api-contracts.md`.
- Use `/api/v1` as the API base path.
- Use consistent naming conventions.
- Validate every request.
- Return predictable response structures.
- Enforce authentication and authorization on the backend.
- Use appropriate HTTP status codes.
- Do not expose database stack traces or sensitive internal information.
- Document new endpoints.

Do not create endpoints with different behavior from the approved API contract without approval.

---

## 7. Database Development Rules

PostgreSQL is the authoritative server-side database.

The planned development database name is:

`field_inspection_db`

Use the database configuration approved in the project environment and documentation.

### 7.1 Database rules

- Use SQLAlchemy models.
- Use Alembic migrations.
- Do not create tables manually outside the migration workflow.
- Do not use SQLite as a substitute for PostgreSQL integration tests.
- Use proper foreign keys.
- Add appropriate unique constraints.
- Add appropriate indexes.
- Define deletion and deactivation behavior explicitly.
- Use transactions for related business operations.
- Avoid unnecessary denormalization.

### 7.2 Migration rules

Every database schema change must include a migration.

Before modifying a migration:

1. Inspect existing migrations.
2. Understand the current database state.
3. Generate or write the appropriate migration.
4. Review generated SQL and operations.
5. Test upgrading from the previous schema.
6. Verify data integrity.
7. Test rollback only when supported.

Never reset or drop a database to solve an ordinary migration issue.

Never execute destructive commands against an unknown database.

### 7.3 Data integrity

Database constraints must enforce important business rules.

Do not rely exclusively on frontend validation.

Do not rely exclusively on service-layer validation when a database constraint is appropriate.

---

## 8. Frontend Development Rules

Use React, TypeScript, and Vite.

### 8.1 Frontend architecture

Follow the approved frontend design.

Use:

- React Router for routing.
- TanStack Query for server state.
- Zustand for appropriate client-side application state.
- Dexie for IndexedDB access.
- React Hook Form for form management.
- Zod for validation.
- Axios for API communication.
- Tailwind CSS and shadcn/ui for interface development.

### 8.2 Component rules

- Build reusable components where useful.
- Keep components focused on a clear responsibility.
- Avoid excessively large components.
- Use TypeScript types instead of `any` wherever practical.
- Keep API logic outside presentation components.
- Keep IndexedDB access outside presentation components.
- Use feature-oriented organization.
- Provide loading, error, empty, and success states.
- Ensure forms are accessible.
- Keep responsive layouts consistent.

### 8.3 Routing and authorization

- Separate administrator and inspector route groups.
- Protect authenticated routes.
- Implement role-aware navigation.
- Redirect unauthorized users appropriately.
- Do not treat hidden frontend controls as authorization.
- The backend remains the final authority for permissions.

### 8.4 UI/UX standards

Follow `docs/frontend-design.md`.

The interface must:

- Be responsive.
- Be accessible.
- Have consistent spacing and typography.
- Use clear visual status indicators.
- Make offline and synchronization states visible.
- Provide useful error messages.
- Prevent accidental destructive actions.
- Avoid unnecessary loading indicators.
- Preserve form data when recoverable failures occur.

Do not redesign the application independently of the approved frontend design.

---

## 9. Offline-First Architecture Rules

Offline functionality is a core system requirement.

Do not implement the frontend as though the server must always be available.

### 9.1 Local-first persistence

Use IndexedDB through Dexie.

For inspection workflows:

1. Read downloaded data from IndexedDB.
2. Save user changes locally.
3. Persist the related synchronization operation.
4. Update the UI after local persistence succeeds.
5. Synchronize when connectivity is available.

Do not wait for the server before allowing a valid offline inspection change to be saved.

### 9.2 Repository abstraction

Use a repository or equivalent service abstraction to coordinate local and remote data access.

Components should not directly contain raw IndexedDB queries or synchronization implementation details.

### 9.3 Offline state

Distinguish between:

- Online.
- Offline.
- Pending synchronization.
- Synchronizing.
- Synced.
- Failed.
- Conflict.
- Rejected.

Do not show `Synced` until the server has confirmed successful processing of the relevant operation.

### 9.4 Persistence guarantees

- Persist important inspection changes.
- Use appropriate IndexedDB transactions.
- Do not report success before local persistence succeeds.
- Preserve pending operations across browser restarts.
- Do not silently discard unsynchronized work.
- Handle storage failures explicitly.

---

## 10. Synchronization Rules

Synchronization is a critical part of Fieldmark.

Follow `docs/offline-sync-design.md` and `docs/api-contracts.md`.

### 10.1 Push synchronization

The client sends pending operations to the server.

Each operation must have:

- Stable operation ID.
- Entity identification.
- Operation type.
- Payload.
- Base version where applicable.
- Creation timestamp.
- Relevant device and account context.

Preserve the operation ID and payload identity across retries.

### 10.2 Idempotency

The backend must prevent duplicate processing.

Rules:

- Same operation ID and same payload must be safe to retry.
- Same operation ID with a different payload must be rejected.
- Duplicate requests must not create duplicate business records.
- Idempotency records and corresponding business changes must be committed consistently.
- Concurrent duplicate requests must be handled safely.

Never generate a new operation ID simply because a request timed out.

### 10.3 Dependency ordering

Respect dependencies between operations.

For example:

```text
Create inspection
       |
       v
Update inspection
       |
       v
Save answer
       |
       v
Submit inspection
```

Do not apply dependent operations before their prerequisites.

### 10.4 Pull synchronization

The server sends authorized changes to the client.

Rules:

- Only return changes the authenticated user is authorized to access.
- Handle pagination safely.
- Apply changes to IndexedDB.
- Advance the cursor only after successful local application.
- Handle tombstones.
- Preserve local pending edits.
- Make repeated pull delivery safe.

### 10.5 Cursor correctness

Do not assume a normal auto-increment database sequence provides commit-ordered change-feed behavior.

A reliable, documented strategy must prevent committed changes from being skipped when transactions execute concurrently.

Tests must prove the selected cursor strategy is safe.

### 10.6 Retry policy

- Use bounded exponential backoff with jitter.
- Respect `Retry-After` when applicable.
- Retry temporary network and server failures.
- Do not endlessly retry permanent validation errors.
- Preserve operation identity.
- Display failure details appropriately.

### 10.7 Background synchronization

Foreground synchronization must always be supported.

Background Sync is an enhancement only.

Do not make core application correctness depend on browser support for Background Sync.

---

## 11. Conflict Management Rules

Never silently overwrite important inspection data.

### 11.1 Conflict detection

Use entity versions or the approved concurrency mechanism.

Detect stale updates and preserve both sides of a conflict.

### 11.2 Conflict resolution

Support only the approved resolution choices.

Possible choices include:

- Keep server version.
- Keep local version where authorized.
- Apply a valid merged version.

All resolutions must:

- Validate permissions.
- Use version checks.
- Preserve audit information.
- Prevent overwriting newer changes.
- Update local state only after a valid resolution is confirmed.

Do not use last-write-wins as an automatic resolution policy for important inspection answers.

---

## 12. Authentication and Security Rules

Follow `docs/security-design.md`.

### 12.1 Authentication

- Use the approved JWT strategy.
- Protect access tokens.
- Handle refresh-token rotation.
- Revoke sessions appropriately.
- Follow the approved cookie and CSRF design.
- Do not store sensitive authentication credentials in unsafe browser storage.

### 12.2 Authorization

- Enforce roles on the backend.
- Validate resource ownership and assignment permissions.
- Scope synchronization operations to the authenticated account.
- Prevent cross-user access.
- Validate device ownership.
- Never trust client-provided role or permission values.

### 12.3 Offline access

Offline access is subject to the approved offline-session policy.

Do not assume server-side permission changes are immediately visible while disconnected.

When connectivity returns, enforce current server-side authorization.

### 12.4 Secret management

- Use environment variables.
- Maintain `.env.example`.
- Keep real `.env` files out of Git.
- Do not expose secrets in frontend code.
- Do not log tokens or passwords.

---

## 13. Testing Is Mandatory

Follow `docs/testing-strategy.md`.

Do not consider an implementation complete merely because it works once in a browser.

### 13.1 Backend tests

Test:

- Services.
- Repositories.
- API endpoints.
- Authentication.
- Authorization.
- Database constraints.
- Transactions.
- Synchronization.
- Idempotency.
- Conflict resolution.

### 13.2 Frontend tests

Test:

- Components.
- Forms.
- Routing.
- State management.
- API integration.
- Dexie repositories.
- Offline workflows.
- Synchronization UI.

### 13.3 E2E tests

At minimum, verify:

1. Administrator login.
2. User creation.
3. Site creation.
4. Checklist creation.
5. Inspection assignment.
6. Inspector login.
7. Online inspection.
8. Offline inspection.
9. Browser refresh after local save.
10. Synchronization after reconnecting.
11. Conflict detection and resolution.
12. Recovery after interrupted synchronization.

### 13.4 Critical testing rules

Never skip tests for:

- Local data persistence.
- Duplicate synchronization requests.
- Cross-user access.
- Cursor advancement.
- Conflict handling.
- Account switching.
- Failed network recovery.

A bug fix must include a regression test whenever practical.

---

## 14. Coding Standards

### 14.1 General standards

- Write readable, maintainable code.
- Use descriptive names.
- Avoid unnecessary complexity.
- Follow existing conventions.
- Keep functions focused.
- Avoid duplicated logic.
- Use explicit error handling.
- Add comments for complex business logic.
- Remove unused imports and dead code.
- Do not introduce unnecessary dependencies.

### 14.2 Python

- Use type hints.
- Follow consistent Python formatting.
- Use clear service and repository boundaries.
- Use Pydantic for request validation.
- Avoid broad exception handling without a clear recovery strategy.
- Do not expose internal exception messages to clients.

### 14.3 TypeScript

- Enable strict TypeScript checks.
- Avoid `any`.
- Define reusable interfaces and types.
- Avoid unnecessary type assertions.
- Keep component props explicit.
- Handle asynchronous operations correctly.
- Avoid direct mutation of application state.

### 14.4 Naming conventions

Use consistent naming:

| Area | Convention |
|---|---|
| Python files | `snake_case.py` |
| Python functions | `snake_case` |
| Python classes | `PascalCase` |
| React components | `PascalCase.tsx` |
| TypeScript utilities | `camelCase.ts` |
| Database tables | `snake_case` |
| API paths | Consistent lowercase resource paths |
| Environment variables | `UPPER_SNAKE_CASE` |

Follow the approved existing naming conventions if a specific file or module already establishes them.

---

## 15. Environment and Configuration

Keep environment-specific configuration separate.

Use:

- `.env.example` for documented placeholders.
- Local `.env` files for development secrets.
- Deployment environment variables for production.
- Separate test database configuration.

Never commit real secrets.

Never use production database credentials during automated tests.

The frontend must not contain server-side database credentials or private backend secrets.

Document required environment variables in the relevant README.

---

## 16. Git and Change Management

Use a clear Git workflow.

Recommended branches:

```text
main
  |
  +-- feature/project-foundation
  +-- feature/database-foundation
  +-- feature/authentication
  +-- feature/inspection-workflow
  +-- feature/offline-storage
  +-- feature/synchronization
  +-- feature/conflict-management
  +-- fix/bug-description
```

### 16.1 Git rules

- Do not commit directly to the main branch unless explicitly requested.
- Keep commits focused.
- Use descriptive commit messages.
- Do not commit generated secrets.
- Do not commit unnecessary build artifacts.
- Review changed files before committing.
- Avoid unrelated modifications.

### 16.2 Existing user work

Before modifying existing files:

1. Inspect the file.
2. Understand its current responsibility.
3. Identify dependent code.
4. Explain significant changes.
5. Preserve working behavior.
6. Run relevant tests.

Do not overwrite existing user work simply to match your preferred implementation style.

---

## 17. AI Agent Working Procedure

For every task, follow this workflow.

### Step 1: Understand

Read the relevant documentation and inspect existing files.

### Step 2: Identify scope

List:

- Required functionality.
- Files to create.
- Files to modify.
- Dependencies.
- Tests required.
- Risks.

### Step 3: Plan

Explain the implementation sequence before making significant changes.

### Step 4: Implement

Write complete, working code.

Do not provide disconnected fragments when the task requires complete files.

### Step 5: Validate

Run:

- Relevant tests.
- Type checks.
- Linting.
- Build checks.
- Migration checks where applicable.

### Step 6: Review

Inspect the final changes for:

- Missing imports.
- Broken references.
- Inconsistent API contracts.
- Incorrect database relationships.
- Security issues.
- Offline data loss.
- Synchronization errors.
- Unnecessary files.

### Step 7: Report

Provide:

1. What was implemented.
2. Files created.
3. Files modified.
4. Important decisions.
5. Commands executed.
6. Test results.
7. Known limitations.
8. Remaining work.
9. Whether the phase acceptance criteria are satisfied.

### Step 8: Stop at the phase boundary

Do not automatically continue into the next development phase.

Wait for approval.

---

## 18. Strict Restrictions

The following actions are prohibited without explicit approval.

### Architecture

- Replacing FastAPI.
- Replacing PostgreSQL.
- Replacing React or TypeScript.
- Replacing Dexie/IndexedDB.
- Changing the approved architecture.
- Introducing an unnecessary microservice architecture.

### Database

- Dropping the database.
- Deleting existing user data.
- Removing tables without approval.
- Changing important relationships without approval.
- Skipping migrations.
- Replacing PostgreSQL integration testing with SQLite-only testing.

### Security

- Disabling authentication.
- Bypassing role checks.
- Storing passwords in plaintext.
- Exposing secrets.
- Trusting frontend authorization.
- Returning another user's data.
- Disabling version checks for convenience.

### Offline and synchronization

- Removing local persistence.
- Generating new operation IDs on every retry.
- Advancing pull cursors before local application succeeds.
- Silently discarding pending operations.
- Silently overwriting conflicting inspection data.
- Assuming Background Sync is universally supported.
- Treating HTTP success as proof that every operation succeeded.

### Development workflow

- Skipping development phases.
- Marking untested work complete.
- Rewriting unrelated modules.
- Adding dependencies without justification.
- Modifying documentation to hide implementation gaps.
- Inventing requirements when documentation is unclear.

---

## 19. Documentation Maintenance

When implementation changes an approved design, update the relevant documentation only after the change has been reviewed and approved.

Keep these documents aligned with actual implementation:

- `PRD.md`
- `architecture.md`
- `database-design.md`
- `api-contracts.md`
- `offline-sync-design.md`
- `security-design.md`
- `frontend-design.md`
- `development-phases.md`
- `testing-strategy.md`

Also maintain the root README with:

- Project overview.
- Technology stack.
- Prerequisites.
- Environment setup.
- Database setup.
- Backend startup.
- Frontend startup.
- Test commands.
- Deployment instructions.

Never leave documentation describing behavior that the implementation does not actually provide.

---

## 20. Definition of Project Completion

Fieldmark is complete only when all approved MVP requirements are implemented and verified.

The final application must support:

- Administrator authentication.
- Inspector authentication.
- Role-based access control.
- User management.
- Site management.
- Checklist template management.
- Inspection assignments.
- Inspection execution.
- Local inspection persistence.
- Offline application access within the approved session policy.
- Durable synchronization queue.
- Safe push synchronization.
- Safe pull synchronization.
- Idempotent operation processing.
- Conflict detection.
- Explicit conflict resolution.
- Retry and recovery behavior.
- PWA installation and offline application shell.
- Sync Center.
- Responsive and accessible interfaces.
- Automated backend tests.
- Automated frontend tests.
- Critical offline and synchronization E2E tests.
- Deployment documentation.

### Final acceptance test

The following scenario must work:

1. An administrator creates a site, checklist, and inspection assignment.
2. An inspector logs in while online.
3. The inspector downloads the assignment.
4. The inspector disconnects from the internet.
5. The inspector completes the inspection.
6. The application saves the inspection locally.
7. The inspector refreshes or reopens the application.
8. The inspection remains available with all committed answers.
9. The inspector reconnects to the internet.
10. The application synchronizes pending operations.
11. The server confirms the operations.
12. Repeated synchronization does not create duplicates.
13. Concurrent updates are detected.
14. Conflicts are resolved without silently losing data.
15. The final server and client states are consistent.

**This scenario is the central acceptance test for Fieldmark.**

---

## 21. Final Instruction to the AI Agent

Build Fieldmark carefully, phase by phase, using the approved documentation as the source of truth.

Prioritize:

1. Data integrity.
2. Security.
3. Offline reliability.
4. Synchronization correctness.
5. Conflict safety.
6. Maintainable architecture.
7. User experience.
8. Performance.


## Progress Tracking — Mandatory

The root-level `progress-tracker.md` is the central record of Fieldmark implementation progress.

Every AI coding agent MUST:

1. Read `progress-tracker.md` before starting any implementation task.
2. Verify the recorded progress against the actual source code.
3. Update the current feature status before beginning work.
4. Record created and modified files.
5. Record important technical decisions.
6. Record actual test commands and results.
7. Record blockers and incomplete work.
8. Update the latest handoff summary before ending the session.

Never mark features, phases, tests, or files as completed without verification.

Never delete historical progress entries.

When another agent continues implementation, it must use the latest handoff summary and inspect the referenced source files before proceeding.

**A development session is not complete until `progress-tracker.md` has been updated.**



Do not sacrifice data safety for implementation speed.

Do not invent missing requirements.

Do not skip testing.

Do not make unauthorized architectural changes.

When a requirement is unclear, explain the uncertainty and ask for clarification before making a consequential decision.

Your goal is not merely to generate code.

Your goal is to deliver a reliable offline-first inspection application that inspectors and administrators can trust.