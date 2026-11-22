# Fieldmark — Testing Strategy

## 1. Purpose

This document defines the testing strategy, quality standards, test coverage, and release acceptance criteria for **Fieldmark**, an offline-first field inspection application.

Fieldmark must remain reliable in both online and offline environments. Testing must verify not only that individual features work, but also that local data remains safe during network interruptions, browser restarts, synchronization failures, duplicate requests, and concurrent updates.

The testing strategy covers:

- Backend unit and integration testing.
- REST API testing.
- PostgreSQL schema and migration testing.
- Authentication and authorization testing.
- Frontend component and integration testing.
- IndexedDB/Dexie persistence testing.
- Offline-first workflow testing.
- Synchronization and conflict-resolution testing.
- PWA and service-worker testing.
- Security and privacy testing.
- End-to-end testing.
- Performance, accessibility, and browser compatibility.
- Continuous integration and release quality gates.

---

## 2. Testing Goals

The primary testing goals are:

1. Verify that every functional requirement in the PRD is implemented correctly.
2. Ensure that inspectors can complete inspections without an internet connection.
3. Ensure locally saved inspection data survives page refreshes and browser restarts.
4. Prevent duplicate records when synchronization requests are retried.
5. Prevent silent overwriting of inspection data.
6. Ensure users can access only authorized resources.
7. Verify that synchronization resumes safely after network interruptions.
8. Ensure database constraints protect data integrity.
9. Verify that the application works across supported browsers and screen sizes.
10. Detect regressions before code is merged or deployed.

### 2.1 Testing principles

| Principle | Standard |
|---|---|
| Test critical business rules | Every important business rule must have automated coverage |
| Test failure scenarios | Test network failures, invalid data, retries, and interrupted operations |
| Protect offline data | Never assume that a successful UI interaction means data is safely persisted |
| Test authorization at the server | Frontend route protection is not sufficient |
| Verify synchronization outcomes | A request returning HTTP 200 does not automatically mean every operation succeeded |
| Preserve user data | Conflicts and failures must not silently discard local changes |
| Repeatability | Automated tests should produce predictable results |
| Isolation | Tests must not depend on execution order or shared mutable test data |

---

## 3. Testing Architecture

Fieldmark uses separate testing layers.

```text
                    Fieldmark Testing
                           |
          +----------------+----------------+
          |                |                |
       Backend          Frontend          Database
          |                |                |
       Unit Tests      Component Tests    Schema Tests
       API Tests       Integration Tests  Constraint Tests
       Auth Tests      IndexedDB Tests    Migration Tests
       RBAC Tests      Offline Tests
          |                |
          +----------------+
                   |
             Sync Testing
                   |
        +----------+----------+
        |          |          |
      Push       Pull      Conflicts
        |          |          |
     Idempotency  Cursors   Resolution
        |          |          |
        +----------+----------+
                   |
              E2E Testing
                   |
        Admin and Inspector Workflows
```

### 3.1 Testing layers

| Layer | Purpose |
|---|---|
| Unit | Test individual functions and business rules |
| Integration | Test communication between application modules |
| API | Verify HTTP endpoints, validation, responses, and authorization |
| Database | Verify schema, constraints, transactions, and migrations |
| Component | Verify individual React components |
| Frontend integration | Verify interactions between pages, state, repositories, and API services |
| Offline | Verify application behavior without network connectivity |
| Synchronization | Verify push, pull, retries, idempotency, and conflict handling |
| E2E | Verify complete workflows through the browser |
| Non-functional | Verify performance, accessibility, security, and browser compatibility |

---

## 4. Testing Technology

Use the following tools unless project implementation requires a compatible alternative.

### 4.1 Backend

| Tool | Purpose |
|---|---|
| pytest | Test execution |
| pytest fixtures | Reusable test setup |
| HTTPX | FastAPI endpoint testing |
| FastAPI TestClient | API integration testing where appropriate |
| SQLAlchemy | Database integration testing |
| Alembic | Migration testing |
| unittest.mock or pytest-mock | Dependency and external-service mocking |
| Coverage.py | Backend coverage measurement |

### 4.2 Frontend

| Tool | Purpose |
|---|---|
| Vitest | Unit and integration tests |
| React Testing Library | React component testing |
| user-event | Simulate realistic user interactions |
| MSW | Mock API requests |
| fake-indexeddb | IndexedDB tests in a Node-based test environment |
| Playwright | Browser-based E2E testing |
| axe-core | Accessibility checks |

### 4.3 Database

- PostgreSQL for realistic integration testing.
- Isolated test database for every test run or test session.
- Alembic for migration verification.
- SQL queries and SQLAlchemy assertions for database integrity.

### 4.4 General testing rules

- Do not use production credentials in tests.
- Do not run destructive tests against the development or production database.
- Do not rely on external services being available.
- Mock external services when their behavior is not the subject of the test.
- Use real PostgreSQL for tests involving PostgreSQL-specific behavior.
- Use deterministic fixtures and test data.
- Keep tests independent and repeatable.

---

# 5. Backend Testing Strategy

## 5.1 Backend unit tests

Unit tests verify isolated business logic without requiring a running HTTP server or production database.

Test the following areas:

### Authentication

- Password hashing.
- Password verification.
- Access-token creation.
- Access-token expiration.
- Invalid token rejection.
- Refresh-token generation.
- Refresh-token hashing.
- Refresh-token expiration.
- Refresh-token rotation rules.
- Revoked refresh-token rejection.

### User management

- Create an administrator.
- Create an inspector.
- Validate email uniqueness.
- Validate password requirements.
- Activate a user.
- Deactivate a user.
- Reject invalid role values.
- Prevent invalid user-state transitions.

### Inspection management

- Create an inspection.
- Start an inspection.
- Save an answer.
- Update a draft answer.
- Validate mandatory checklist items.
- Submit an inspection.
- Reject invalid submission states.
- Prevent unauthorized transitions.

### Synchronization

- Generate stable operation identifiers.
- Validate operation payloads.
- Calculate payload hashes.
- Identify duplicate operations.
- Detect payload-hash mismatches.
- Validate entity versions.
- Calculate retry eligibility.
- Classify temporary and permanent failures.
- Validate conflict-resolution rules.

### Example backend unit test structure

```text
backend/tests/
├── conftest.py
├── unit/
│   ├── test_password_hashing.py
│   ├── test_jwt_tokens.py
│   ├── test_user_service.py
│   ├── test_inspection_service.py
│   ├── test_sync_idempotency.py
│   ├── test_sync_validation.py
│   └── test_conflict_resolution.py
├── integration/
├── api/
└── security/
```

The exact file structure may evolve with the backend implementation.

## 5.2 Backend API tests

Every API endpoint must have tests for:

1. Successful requests.
2. Missing authentication.
3. Invalid authentication.
4. Insufficient permissions.
5. Invalid request bodies.
6. Missing required fields.
7. Invalid field formats.
8. Missing resources.
9. Duplicate resources.
10. Unexpected service or database failures.

### Authentication API tests

| Endpoint | Test scenarios |
|---|---|
| `POST /api/v1/auth/login` | Valid login, incorrect password, unknown email, inactive user |
| `POST /api/v1/auth/signup` | Valid inspector registration, duplicate email, invalid password, role-field rejection, rate limiting, subsequent login |
| `POST /api/v1/auth/refresh` | Valid refresh, expired refresh, revoked refresh, token rotation |
| `GET /api/v1/auth/me` | Valid access token, missing token, expired token |
| `POST /api/v1/auth/logout` | Valid logout, repeated logout, invalid refresh session |

### User API tests

- Administrator can create users.
- Administrator can list users.
- Administrator can update users.
- Administrator can deactivate users.
- Inspector cannot create users.
- Inspector cannot access administrator-only operations.
- A user cannot elevate their own role.
- Inactive users cannot authenticate.

### Site API tests

- Administrator can create a site.
- Administrator can update site information.
- Administrator can deactivate a site.
- Inspector can access only authorized sites.
- Invalid site identifiers return appropriate errors.
- Duplicate or invalid site information is rejected.

### Inspection API tests

- Administrator can assign an inspection.
- Inspector can view assigned inspections.
- Inspector can start an authorized inspection.
- Inspector cannot access another inspector's restricted inspection.
- Invalid checklist answers are rejected.
- Submission validates mandatory answers.
- Repeated submission does not create duplicate results.
- Submitted inspection data follows the defined editing policy.

### API response validation

Verify:

- HTTP status code.
- Response schema.
- Field names.
- Data types.
- Error response structure.
- Pagination metadata.
- Date and timestamp formats.
- No unintended sensitive information in responses.

---

# 6. Database Testing Strategy

PostgreSQL is the source of truth for synchronized application data.

Database tests must verify schema correctness, constraints, transactions, migrations, and relationships.

## 6.1 Schema tests

Verify that all approved tables exist:

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

The final schema may introduce additional supporting tables when required by the approved database design.

Test:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Not-null constraints.
- Check constraints.
- Indexes.
- Default values.
- Timestamp fields.
- Soft-deletion or deactivation behavior where applicable.
- Referential integrity.

## 6.2 Relationship tests

Verify that:

- Every inspection references a valid site.
- Every inspection references its assigned inspector.
- Every checklist item belongs to a valid template.
- Every answer belongs to a valid inspection and checklist item.
- Every refresh token belongs to a valid user.
- Every device registration belongs to the correct user.
- Every synchronization operation is associated with its originating user/device context.
- Every conflict references the correct entity and operation context.

## 6.3 Transaction tests

Test:

- Successful transaction commits.
- Failed transaction rollback.
- Partial database updates do not leave inconsistent records.
- Concurrent updates do not bypass version checks.
- Duplicate idempotency records are rejected or safely handled.
- Inspection submission is atomic according to the approved lifecycle model.
- Sync operation outcomes are persisted consistently.

## 6.4 Migration tests

For every migration:

1. Start with the previous supported schema.
2. Run the migration.
3. Verify expected tables and columns.
4. Verify constraints and indexes.
5. Verify existing data remains valid.
6. Run the application against the migrated schema.
7. Test downgrade only when a safe downgrade is explicitly supported.

A production migration must never be considered successful solely because Alembic reports completion.

## 6.5 Database isolation

Tests must use an isolated database.

Recommended test configuration:

```text
Development:
    field_inspection_db

Testing:
    field_inspection_test_db

Production:
    Configured separately
```

Never run database cleanup commands against production.

---

# 7. Authentication and Security Testing

Security tests are mandatory because Fieldmark handles user accounts, site information, inspection records, and potentially sensitive operational data.

## 7.1 Password security

Test:

- Passwords are hashed before storage.
- Plaintext passwords are never stored.
- Password hashes are not returned by APIs.
- Incorrect passwords are rejected.
- Password validation is enforced.
- Authentication errors do not unnecessarily reveal whether an account exists.

## 7.2 JWT testing

Test:

- Valid access tokens are accepted.
- Expired access tokens are rejected.
- Invalid signatures are rejected.
- Tampered tokens are rejected.
- Tokens with invalid claims are rejected.
- Token expiration is enforced.
- Refresh tokens cannot be used as access tokens.

## 7.3 Refresh-token security

Test:

- Refresh tokens are stored as hashes on the server.
- Refresh-token rotation invalidates the previous token.
- Reuse of a rotated token is detected.
- Logout revokes the relevant session.
- Expired tokens cannot refresh a session.
- Refresh-token cookies use appropriate Secure, HttpOnly, and SameSite settings in production.
- CSRF protection is tested for cookie-authenticated state-changing operations where required.

## 7.4 Role-based access control

Initial roles:

- `ADMIN`
- `INSPECTOR`

Test the following:

| Action | ADMIN | INSPECTOR |
|---|---|---|
| Manage users | Allowed | Denied |
| Manage sites | Allowed | Denied |
| Manage checklist templates | Allowed | Denied |
| Assign inspections | Allowed | Denied |
| View authorized assignments | Allowed | Allowed |
| Complete assigned inspections | According to policy | Allowed |
| View administrator dashboard | Allowed | Denied |
| Access Sync Center | According to permissions | Own synchronization data |

Tests must verify server-side enforcement, not just frontend visibility.

## 7.5 Resource-level authorization

Test:

- Inspector A cannot access Inspector B's restricted inspection.
- Inspector cannot change another user's assignments.
- Inspector cannot download unauthorized site data.
- User cannot modify another user's profile unless permitted.
- Sync pull cannot expose another user's changes.
- Sync push cannot modify resources outside the authenticated user's permissions.
- Device identifiers cannot be used to impersonate another user.

## 7.6 Offline authentication security

Test:

- Previously authenticated users can reopen the application offline only under the approved offline-session policy.
- An unauthenticated user cannot bypass login by opening a protected route.
- Offline access follows configured session-expiration rules.
- Locally stored user context is scoped to the authenticated account.
- Switching accounts does not expose another user's local records.
- Offline permission information is treated as potentially stale.
- Revoked or deactivated accounts are rejected when the application next communicates with the server.

Offline authentication cannot guarantee real-time permission revocation while disconnected. The application must make this limitation explicit in its security design.

## 7.7 Local data security

Test:

- Sensitive information is not unnecessarily written to browser storage.
- Authentication secrets are not stored in unsafe locations.
- Logs do not contain passwords, access tokens, refresh tokens, or unnecessary personal information.
- Local logout behavior protects data belonging to other accounts.
- Unsynchronized data is not silently destroyed during logout.
- Browser storage limitations and device compromise risks are documented.

Do not claim that IndexedDB is automatically encrypted. Any local encryption design must have its own key-management and recovery tests.

---

# 8. Frontend Testing Strategy

## 8.1 React component tests

Test reusable UI components independently.

Examples:

```text
frontend/src/
    components/
        common/
            Button
            Input
            Modal
            ConfirmDialog
            StatusBadge
            LoadingSpinner
        sync/
            SyncStatus
            SyncProgress
            ConflictCard
```

Test:

- Correct rendering.
- User interactions.
- Form validation messages.
- Disabled states.
- Loading states.
- Error states.
- Empty states.
- Keyboard accessibility.
- Responsive behavior where relevant.

## 8.2 Page-level tests

Test important pages:

### Authentication

- Login form displays correctly and links to signup.
- Invalid login shows an error.
- Valid login navigates to the correct dashboard.
- Signup form validates required fields, password length, and password confirmation.
- Successful signup creates a session and navigates to the inspector dashboard.
- Failed signup preserves entered values and displays the server error.
- Inactive users cannot access protected pages.
- Session expiration is handled correctly.

### Administrator pages

- Dashboard displays expected summary values.
- User list loads correctly.
- User creation form validates input.
- Site management works.
- Checklist templates can be managed.
- Inspection assignments display correct information.

### Inspector pages

- Assigned inspections are displayed.
- Inspection details are correct.
- Checklist answers can be entered.
- Required questions are validated.
- Offline changes show a pending-sync status.
- Previously saved work is restored after reopening the application.

### Sync Center

- Pending operations are displayed.
- Sync progress is visible.
- Failed operations show useful information.
- Retry controls work.
- Conflicts are clearly identified.
- Successful synchronization updates local status.

## 8.3 Frontend state testing

Test the interaction between:

- Zustand application state.
- TanStack Query server state.
- Dexie local persistence.
- API client.
- Offline detection.
- Synchronization services.

Ensure that:

- Server state is not incorrectly treated as local persistent state.
- Local data remains available when network requests fail.
- Failed API calls do not erase saved local records.
- UI status reflects the actual persistence and synchronization state.

---

# 9. IndexedDB and Local Persistence Testing

Dexie and IndexedDB are essential to Fieldmark's offline behavior.

These tests must verify that the browser can safely store and retrieve inspection data.

## 9.1 Repository tests

Test:

- Create a local inspection.
- Read a local inspection.
- Update a local inspection.
- Delete a clean local record when allowed.
- Retrieve all pending inspections.
- Retrieve records belonging to a particular user.
- Retrieve records belonging to a particular device.
- Save checklist answers.
- Save synchronization operations.
- Update synchronization status.
- Retrieve conflict snapshots.

## 9.2 Persistence tests

Test:

1. Save an inspection locally.
2. Refresh the page.
3. Reopen the application.
4. Retrieve the inspection.
5. Verify that all answers and metadata remain unchanged.

Also test:

- Browser restart.
- Tab closure and reopening.
- Offline page reload.
- Interrupted writes.
- IndexedDB transaction failure.
- Storage quota exhaustion.
- Corrupted or unavailable local database recovery behavior.

## 9.3 Transaction tests

When saving an inspection and creating its sync operation, verify that the related local changes are committed atomically.

For example:

```text
User submits inspection answer
            |
            v
Save answer in IndexedDB
            |
            v
Create durable sync operation
            |
            v
Commit local transaction
            |
            v
Show saved/pending status
```

If the transaction fails, the application must not show a misleading success state.

## 9.4 Local data lifecycle tests

Test:

- Local data is scoped to the correct account.
- Switching accounts does not reveal another user's data.
- Pending operations survive application restarts.
- Logout does not silently delete unsynchronized records.
- Local data cleanup follows an explicit, tested policy.
- Server-confirmed synchronization does not leave stale pending operations.

---

# 10. Offline Testing Strategy

Offline behavior is a core feature, not an optional enhancement.

## 10.1 Network-state testing

Test the application in:

- Normal online mode.
- Offline mode.
- Slow network mode.
- Unstable network mode.
- Connection lost during a request.
- Connection restored during synchronization.
- Server temporarily unavailable.
- Browser restarted while offline.

## 10.2 Offline inspection workflow

The following workflow is mandatory:

```text
Authenticate online
        |
        v
Download assigned inspection
        |
        v
Disconnect internet
        |
        v
Open inspection
        |
        v
Enter checklist answers
        |
        v
Save answers locally
        |
        v
Refresh browser
        |
        v
Verify saved answers
        |
        v
Reconnect internet
        |
        v
Synchronize changes
        |
        v
Verify server records
```

Every step must be tested.

## 10.3 Offline failure scenarios

| Scenario | Expected behavior |
|---|---|
| Internet disappears while entering answers | Local work remains available |
| Browser refresh while offline | Previously committed local data remains available |
| API request fails | Local data is not discarded |
| Browser closes unexpectedly | Committed local data remains available |
| Server is unavailable | Sync operations remain pending |
| Connection returns | Sync resumes safely |
| Sync is interrupted | Already accepted operations are not duplicated |
| User opens another account | Previous account data is not exposed |

## 10.4 Offline limitations

Tests must verify that the application communicates limitations accurately:

- New assignments cannot be fetched while offline.
- Server-side permission changes cannot be discovered immediately while disconnected.
- Background Sync is not guaranteed to be available in every browser.
- The user can initiate foreground synchronization when online.
- Local storage availability depends on browser/device capacity and browser policies.

Foreground synchronization is the baseline. Background Sync is an enhancement, not a requirement for correctness.

---

# 11. Synchronization Testing Strategy

Synchronization is one of the highest-risk parts of Fieldmark.

It must be tested independently from ordinary CRUD operations.

## 11.1 Push synchronization tests

Endpoint:

`POST /api/v1/sync/push`

Test:

- Push one valid operation.
- Push multiple valid operations.
- Push an invalid operation.
- Push an operation referencing an unavailable resource.
- Push an operation without required metadata.
- Push duplicate operation IDs.
- Push operations in dependency order.
- Push an operation with a stale base version.
- Push while the server is temporarily unavailable.
- Push when authentication has expired.
- Push after permissions have been revoked.

The server must provide an explicit result for every submitted operation.

Possible operation outcomes:

- Accepted.
- Already applied.
- Conflict.
- Rejected.
- Retryable failure.

An HTTP-level success response must not be interpreted as proof that all operations were accepted.

## 11.2 Idempotency tests

Each sync operation must have a stable operation ID.

Test:

1. Submit an operation.
2. Confirm successful server processing.
3. Submit the exact same operation again.
4. Verify that the server does not create a duplicate.
5. Verify that the original outcome is returned or safely identified.

Also test:

- Same operation ID with a different payload.
- Same operation ID with a different payload hash.
- Concurrent duplicate requests.
- Retry after a timeout where the original server request may already have committed.
- Retry after client restart.

Expected behavior:

| Situation | Expected result |
|---|---|
| Same ID, same payload | Idempotent result |
| Same ID, changed payload | Reject as an idempotency violation |
| Different ID, same business operation | Apply business-level uniqueness rules |
| Concurrent duplicate request | Only one effective application |

Idempotency records and business changes must be committed consistently.

## 11.3 Dependency-order testing

Test sequences such as:

```text
Create inspection
       |
       v
Update inspection
       |
       v
Add answer
       |
       v
Submit inspection
```

Verify that:

- Dependent operations are not sent before required parent operations.
- A failed parent operation does not cause invalid child operations to be applied.
- Retries preserve operation identity.
- The application does not reorder operations in a way that violates business rules.
- Any operation coalescing follows explicit, tested rules.

## 11.4 Pull synchronization tests

Endpoint:

`GET /api/v1/sync/pull`

Test:

- Initial pull.
- Incremental pull.
- Empty pull.
- Multiple pages.
- Pull after local changes.
- Pull with tombstones.
- Pull after a network interruption.
- Pull with expired authentication.
- Pull with user-specific authorization.
- Pull while new server changes are being committed.

Verify:

- Only authorized changes are returned.
- Pagination does not skip changes.
- Duplicate delivery is safe.
- Tombstones are applied correctly.
- Local pending edits are not silently overwritten.
- The pull cursor advances only after all changes in the returned batch have been successfully applied to IndexedDB.

## 11.5 Pull cursor safety

A simple database sequence or auto-increment ID must not be assumed to represent transaction commit order.

For example, two transactions can allocate identifiers in one order and commit in another. A client using a naïve high-water cursor can skip a change.

The synchronization implementation must use a commit-safe change-feed strategy, such as:

- A serialized per-scope change-log ordering mechanism.
- A commit-ordered event log.
- A snapshot-safe cursor strategy.

The final implementation must document its chosen strategy.

Tests must simulate concurrent transactions and verify:

- No committed change is skipped.
- Changes are not exposed before they are committed.
- Pagination remains complete.
- Cursor advancement is safe across interrupted pulls.
- Authorization filtering does not cause cursor-related omissions.

## 11.6 Atomic local pull application

Test this sequence:

1. Receive a pull batch.
2. Apply all changes to IndexedDB.
3. Update the pull cursor.
4. Commit the transaction.

If applying any change fails:

- The transaction must roll back where supported by the chosen implementation.
- The cursor must not advance past unapplied changes.
- The next pull must safely return the required changes again.

## 11.7 Retry testing

Test:

- Temporary network failure.
- Server timeout.
- HTTP 429 response.
- HTTP 500 response.
- Permanent validation error.
- Authorization failure.
- Conflict response.

Retry behavior must distinguish retryable and permanent failures.

Expected rules:

- Use bounded exponential backoff with jitter for retryable failures.
- Respect `Retry-After` when provided.
- Do not continuously retry permanent validation failures.
- Preserve the operation ID and original payload across retries.
- Display failed or rejected operations clearly.
- Provide a safe manual retry path where appropriate.

## 11.8 Multi-tab synchronization testing

If multiple browser tabs are supported, test:

- Two tabs attempting to synchronize simultaneously.
- A tab closing while synchronization is active.
- A lock expiring after an interrupted process.
- Two tabs editing the same local record.
- Duplicate push prevention across tabs.

Use an explicit synchronization lock or equivalent coordination mechanism.

The application must not depend on an assumption that only one browser tab will ever be open.

---

# 12. Conflict Detection and Resolution Testing

Fieldmark must not silently overwrite important inspection data.

## 12.1 Conflict detection

Test:

1. Inspector downloads an inspection at version 1.
2. Inspector A modifies the inspection offline.
3. A server-side update creates version 2.
4. Inspector A reconnects and attempts to push the version 1-based change.
5. Server detects the stale base version.
6. A conflict is recorded.

Verify:

- The original server snapshot is preserved.
- The local snapshot is preserved.
- The conflict references the correct entity.
- The conflict is visible to the authorized user.
- The stale update is not silently accepted.

## 12.2 Conflict resolution

Test:

- Keep server version.
- Keep local version where the user has permission.
- Apply an explicitly supported merged version.
- Reject invalid resolution choices.
- Resolve an already resolved conflict.
- Attempt resolution without permission.
- Resolve when the server record has changed again.

A resolution must use version checking. If the server changes after the conflict snapshot was created, the resolution must not silently overwrite the newer version.

## 12.3 Conflict auditability

Verify that the system records:

- Conflict identifier.
- Related entity.
- Relevant operation identifier.
- Local snapshot or preserved local data.
- Server snapshot or preserved server data.
- Conflict detection time.
- Resolution choice.
- Resolution actor.
- Resolution timestamp.

Retention and access to conflict snapshots must follow the approved security and privacy policy.

---

# 13. PWA and Service Worker Testing

Service-worker caching and IndexedDB persistence are different systems and must be tested separately.

## 13.1 PWA tests

Verify:

- Application manifest is valid.
- Application can be installed where supported.
- Service worker registers correctly.
- Application shell loads offline after the required assets have been cached.
- Cached assets update correctly after deployment.
- Old caches are cleaned up safely.
- Failed asset updates do not leave the application unusable.

Phase 12 automated coverage verifies the manifest and icon set, service-worker registration and update banner behavior, shell precache inputs, offline navigation fallback, stale-while-revalidate behavior, API/authenticated request exclusion, optional asset failures, and obsolete cache cleanup. Phase 13 end-to-end coverage verifies production service-worker control, offline refresh with durable IndexedDB data, cache-boundary safety, and absence of unsafe auth storage. Browser-driven installation prompts and deployed reload smoke tests remain part of deployment verification.

## 13.2 Cache testing

Test:

- Initial application load online.
- Reload after assets are cached.
- Reload offline.
- Application update after a new deployment.
- Old cached JavaScript with newer API responses.
- Failed service-worker installation.
- Failed cache update.
- Cache storage unavailable.

Never cache sensitive API responses indiscriminately.

## 13.3 Background Sync fallback

Test:

- Browser supports Background Sync.
- Browser does not support Background Sync.
- Background Sync registration fails.
- Background Sync is interrupted.
- Foreground sync still works.

The application must remain correct without Background Sync.

---

# 14. Security and Privacy Testing

Perform security checks throughout development.

## 14.1 Input validation

Test:

- Invalid email addresses.
- Extremely long text.
- Unexpected JSON fields.
- Invalid UUIDs.
- Invalid enum values.
- Malformed dates.
- Unsupported file types if attachments are added in a future phase.
- SQL injection attempts.
- Cross-site scripting payloads.
- Invalid request content types.

## 14.2 API security

Test:

- Missing authentication.
- Invalid authentication.
- Inadequate permissions.
- Resource enumeration.
- Cross-user data access.
- Rate-limit behavior for sensitive endpoints.
- Refresh-token replay.
- CSRF protections where cookie authentication requires them.
- CORS configuration.
- Error messages that expose internal implementation details.

## 14.3 Browser security

Verify:

- HTTPS is used in production.
- Secure cookie settings are correct.
- Content Security Policy is appropriately configured.
- Sensitive values are not logged.
- No production secrets are bundled into frontend assets.
- Dependency scanning is part of CI.
- Service-worker caching does not expose another user's sensitive information.

## 14.4 Privacy checks

Test:

- User data is scoped correctly.
- Logs contain no unnecessary sensitive data.
- Data deletion follows the approved retention policy.
- Local account switching is safe.
- Conflict snapshots are accessible only to authorized users.

---

# 15. End-to-End Testing Strategy

E2E tests verify complete user workflows through a real browser.

Use Playwright for browser automation.

## 15.1 Administrator workflow

Test:

```text
Administrator opens Fieldmark
          |
          v
Logs in
          |
          v
Opens dashboard
          |
          v
Creates inspector
          |
          v
Creates site
          |
          v
Creates checklist template
          |
          v
Assigns inspection
          |
          v
Verifies assignment
```

Acceptance criteria:

- Every action completes successfully.
- Invalid form input is rejected.
- Data appears in the correct pages.
- Server-side authorization is enforced.

## 15.2 Inspector online workflow

Test:

```text
Inspector logs in
        |
        v
Views assigned inspections
        |
        v
Opens an inspection
        |
        v
Completes checklist
        |
        v
Submits inspection
        |
        v
Receives server confirmation
        |
        v
Views updated status
```

Acceptance criteria:

- Only authorized assignments are displayed.
- Mandatory answers are validated.
- Submitted data appears on the server.
- Duplicate submissions are prevented.

## 15.3 Inspector offline workflow

This is a release-critical E2E test.

```text
Inspector logs in online
        |
        v
Downloads assignment
        |
        v
Browser goes offline
        |
        v
Inspector opens assignment
        |
        v
Completes checklist
        |
        v
Saves local changes
        |
        v
Refreshes browser
        |
        v
Verifies local data
        |
        v
Browser reconnects
        |
        v
Sync begins
        |
        v
Server confirms operation
        |
        v
UI displays Synced
```

Acceptance criteria:

- No inspection data is lost.
- Local persistence works after refresh.
- Operation IDs remain stable.
- The server receives the intended data exactly once.
- The UI displays accurate synchronization status.

## 15.4 Conflict workflow

Test:

- Download inspection on two clients.
- Modify the same inspection from both clients.
- Synchronize one client.
- Synchronize the second client.
- Verify conflict detection.
- Open conflict details.
- Resolve conflict.
- Verify the final server state.
- Verify the resolution audit record.

## 15.5 Recovery workflow

Test:

- Stop the backend during synchronization.
- Confirm pending operations remain stored.
- Restart the backend.
- Reconnect the client.
- Retry synchronization.
- Verify no duplicate records.
- Verify all eligible operations reach the correct final status.

## 15.6 Account-switching workflow

Test:

- User A logs in.
- User A creates unsynchronized local work.
- User A logs out.
- User B logs in on the same browser.
- Verify User B cannot see User A's private records.
- Verify User A's pending data is handled according to the explicit account-switching policy.
- User A logs in again and verifies that recoverable work is still available.

---

# 16. Performance Testing

Performance tests should cover both online and offline workloads.

## 16.1 Backend performance

Measure:

- Login response time.
- Dashboard response time.
- Inspection list response time.
- Inspection detail response time.
- Sync push response time.
- Sync pull response time.
- Large batch processing.
- Database query performance.

## 16.2 Frontend performance

Measure:

- Initial page load.
- Application shell startup.
- Local inspection retrieval.
- Large checklist rendering.
- Sync Center rendering.
- IndexedDB read/write performance.
- Memory use during long inspection sessions.

## 16.3 Synchronization performance

Test:

- Small operation batches.
- Large operation batches.
- Multiple inspectors synchronizing simultaneously.
- Repeated retries.
- Large pull responses.
- Slow network conditions.

Avoid setting arbitrary performance targets before realistic workload expectations are agreed upon.

Record baseline measurements and define release thresholds before production rollout.

---

# 17. Accessibility and Responsive Testing

Fieldmark must remain usable on desktop, tablet, and mobile devices.

Test:

- Keyboard navigation.
- Visible focus indicators.
- Accessible form labels.
- Appropriate heading hierarchy.
- Screen-reader-friendly status messages.
- Color contrast.
- Error messages associated with inputs.
- Touch target usability.
- Responsive layouts.
- Navigation behavior on narrow screens.
- Dark and light themes if both are implemented.

Use automated accessibility checks alongside manual keyboard and screen-reader testing.

Automated accessibility checks do not replace manual review.

---

# 18. Browser Compatibility Testing

Test the supported browser matrix defined by the project before release.

At minimum, validate the intended desktop and mobile browser environments.

Pay special attention to:

- IndexedDB availability.
- IndexedDB transaction behavior.
- Service-worker support.
- Cache API behavior.
- Storage quota behavior.
- Offline reload behavior.
- Background Sync availability.
- Browser restart persistence.
- Multi-tab coordination.

If a browser does not support an enhancement such as Background Sync, the application must fall back to foreground synchronization.

---

# 19. Test Data and Fixtures

Test data must be deterministic and reusable.

Recommended test fixtures:

```text
Test Users:
    admin@example.test
    inspector1@example.test
    inspector2@example.test

Test Sites:
    Site A
    Site B

Test Checklist:
    Safety Inspection Checklist

Test Inspection:
    Inspection assigned to Inspector 1

Test Sync Operations:
    Valid operation
    Duplicate operation
    Invalid operation
    Stale-version operation
    Retryable operation
    Conflict operation
```

Rules:

- Use synthetic test data.
- Never copy production personal data into automated test fixtures.
- Create isolated records for tests.
- Clean up test data safely.
- Avoid tests that depend on hardcoded database IDs.
- Use factories or fixtures for repeatable setup.

---

# 20. Continuous Integration Testing

Automated checks must run before code is merged into the main branch.

Recommended CI workflow:

```text
Developer creates branch
          |
          v
Pushes changes
          |
          v
CI starts
          |
          v
Backend lint and type checks
          |
          v
Backend unit tests
          |
          v
Database integration tests
          |
          v
Frontend lint and type checks
          |
          v
Frontend unit tests
          |
          v
Build frontend and backend
          |
          v
Security and dependency checks
          |
          v
E2E tests
          |
          v
All required checks pass?
       /       \
     Yes        No
      |          |
      v          v
 Allow merge   Block merge
```

## 20.1 Pull request quality gates

A pull request must:

- Pass backend tests.
- Pass frontend tests.
- Pass required type checks.
- Pass linting.
- Build successfully.
- Pass database migration checks when applicable.
- Pass security checks configured as mandatory.
- Include tests for new business logic.
- Include tests for bug fixes.
- Avoid introducing secrets.
- Preserve existing offline and synchronization behavior.

## 20.2 Main branch requirements

The main branch must remain deployable.

Do not merge a change that breaks:

- Authentication.
- Authorization.
- Inspection data persistence.
- Database integrity.
- Offline operation.
- Synchronization correctness.
- Conflict handling.

## 20.3 Deployment tests

Before production deployment:

1. Verify environment variables.
2. Verify database connectivity.
3. Run approved migrations.
4. Verify backend health.
5. Verify frontend production build.
6. Verify HTTPS and cookie configuration.
7. Verify service-worker behavior.
8. Verify login and role-based navigation.
9. Verify an online inspection workflow.
10. Verify an offline inspection and synchronization workflow.
11. Verify logs do not expose secrets.
12. Verify backup and recovery procedures.

---

# 21. Test Coverage Standards

Coverage is useful for identifying untested code, but it does not prove application correctness.

Recommended minimum targets:

| Area | Target |
|---|---:|
| Critical backend business logic | 90% |
| Backend overall line coverage | 80% |
| Synchronization logic | 90% |
| Authentication and authorization logic | 90% |
| Frontend overall line coverage | 75% |
| Critical frontend workflows | 85% |
| Database constraints | Explicit tests for every critical constraint |
| E2E workflows | All release-critical user journeys |

Coverage targets are engineering goals. Critical security and synchronization scenarios must be tested even if coverage metrics already pass.

Do not write meaningless tests just to increase coverage.

---

# 22. Test Organization

Recommended backend structure:

```text
backend/
└── tests/
    ├── conftest.py
    ├── factories/
    ├── unit/
    │   ├── test_auth.py
    │   ├── test_users.py
    │   ├── test_inspections.py
    │   ├── test_idempotency.py
    │   └── test_conflicts.py
    ├── integration/
    │   ├── test_database.py
    │   ├── test_transactions.py
    │   ├── test_migrations.py
    │   └── test_sync_services.py
    ├── api/
    │   ├── test_auth_api.py
    │   ├── test_users_api.py
    │   ├── test_sites_api.py
    │   ├── test_inspections_api.py
    │   └── test_sync_api.py
    └── security/
        ├── test_auth_security.py
        ├── test_rbac.py
        └── test_resource_permissions.py
```

Recommended frontend structure:

```text
frontend/
└── src/
    ├── components/
    │   └── __tests__/
    ├── features/
    │   ├── auth/
    │   │   └── __tests__/
    │   ├── inspections/
    │   │   └── __tests__/
    │   └── sync/
    │       └── __tests__/
    ├── db/
    │   └── __tests__/
    └── test/
        ├── setup.ts
        ├── fixtures/
        ├── mocks/
        └── helpers/
```

Recommended E2E structure:

```text
frontend/
└── e2e/
    ├── auth.spec.ts
    ├── admin-workflow.spec.ts
    ├── inspector-online.spec.ts
    ├── inspector-offline.spec.ts
    ├── sync-recovery.spec.ts
    ├── conflict-resolution.spec.ts
    └── account-switching.spec.ts
```

Adapt these paths to the final project structure without creating duplicate test systems.

---

# 23. Suggested Test Commands

The final scripts must match the actual package configuration.

Typical backend commands:

```bash
# Run all backend tests
pytest

# Run unit tests
pytest tests/unit

# Run integration tests
pytest tests/integration

# Run API tests
pytest tests/api

# Run security tests
pytest tests/security

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

Typical frontend commands:

```bash
# Run frontend unit and component tests
npm run test

# Run tests in watch mode, if configured
npm run test:watch

# Run frontend coverage, if configured
npm run test:coverage

# Run frontend build
npm run build
```

Typical Playwright commands:

```bash
# Run E2E tests
npx playwright test

# Run a specific E2E test
npx playwright test e2e/inspector-offline.spec.ts

# Open the Playwright report
npx playwright show-report
```

These are suggested commands, not a requirement to create scripts with these exact names before the corresponding tooling is configured.

---

# 24. Release Acceptance Criteria

A release cannot be considered ready until all critical criteria pass.

## 24.1 Authentication and authorization

- [ ] Login works.
- [ ] Public signup creates only INSPECTOR accounts.
- [ ] Invalid credentials are rejected.
- [ ] Access-token expiration is enforced.
- [ ] Refresh-token rotation works.
- [ ] Logout revokes the appropriate session.
- [ ] Admin and inspector permissions are enforced by the backend.
- [ ] Cross-user resource access is prevented.

## 24.2 Database

- [ ] All approved tables exist.
- [ ] Relationships are correct.
- [ ] Constraints are enforced.
- [ ] Migrations run successfully.
- [ ] Transactions preserve data integrity.
- [ ] Test database is isolated from production.

## 24.3 Frontend

- [ ] All required pages render correctly.
- [ ] Forms validate input.
- [ ] Loading, empty, and error states work.
- [ ] Responsive navigation works.
- [ ] Accessible interactions are available.
- [ ] Build succeeds.

## 24.4 Offline functionality

- [ ] Previously downloaded inspections are available offline.
- [ ] Inspection answers save locally.
- [ ] Local changes survive page refresh.
- [ ] Local changes survive browser restart after committed writes.
- [ ] Offline status is visible.
- [ ] Network failures do not erase local data.
- [ ] Account switching does not expose another user's data.

## 24.5 Synchronization

- [ ] Pending operations survive application restart.
- [ ] Operation IDs remain stable across retries.
- [ ] Duplicate requests do not create duplicate records.
- [ ] Changed payloads with reused operation IDs are rejected.
- [ ] Dependency ordering is respected.
- [ ] Partial push outcomes are handled correctly.
- [ ] Pull cursor safety is verified.
- [ ] Pull cursor advances only after successful local application.
- [ ] Tombstones are applied correctly.
- [ ] Retry behavior distinguishes temporary and permanent failures.
- [ ] Multi-tab synchronization is safe where supported.

## 24.6 Conflict handling

- [ ] Stale updates are detected.
- [ ] Local snapshots are preserved.
- [ ] Server snapshots are preserved.
- [ ] Conflicts are visible to authorized users.
- [ ] Resolution requires valid permissions.
- [ ] Resolution uses version checks.
- [ ] Resolution is auditable.
- [ ] No silent last-write-wins behavior is used for critical inspection data.

## 24.7 PWA and deployment

- [ ] Manifest is valid.
- [ ] Service worker works.
- [ ] Cached application shell loads offline after successful caching.
- [ ] Sensitive API data is not indiscriminately cached.
- [ ] Foreground synchronization works without Background Sync.
- [ ] Production environment is configured securely.
- [ ] Health checks pass.
- [ ] Backup and recovery procedures are documented.

---

# 25. Critical Failure Conditions

The following failures block release regardless of overall test coverage:

1. An inspector loses committed inspection data after a browser refresh.
2. A duplicate sync request creates duplicate business records.
3. An unauthorized user can access another user's inspection.
4. A stale update silently overwrites newer server data.
5. A pull cursor skips committed changes.
6. A failed local pull application advances the cursor.
7. A logout or account switch silently deletes pending work.
8. A refresh-token replay is accepted contrary to the security policy.
9. A database migration causes data loss or invalid relationships.
10. A failed network request causes local inspection data to disappear.

Every critical failure must be fixed and covered by an automated regression test.

---

# 26. Definition of Done for Testing

A feature is considered complete only when:

- Its expected behavior is documented.
- Relevant unit tests exist.
- Relevant integration tests exist.
- API tests exist when an endpoint is involved.
- Authorization tests exist when protected data is involved.
- Offline tests exist when local persistence is involved.
- Synchronization tests exist when server communication is involved.
- Failure and recovery cases are tested.
- Tests pass in CI.
- No critical regression is introduced.
- Relevant documentation is updated.

---

# 27. Final Testing Standard

Fieldmark must be tested as an offline-first distributed application, not merely as a conventional CRUD application.

The most important quality guarantee is:

**An inspector must be able to complete and save an inspection without internet connectivity, safely close or refresh the application, reconnect later, synchronize the work without duplication, and resolve concurrent changes without losing data.**

All architecture, database, frontend, backend, and synchronization implementation decisions must support this guarantee.

No feature is considered production-ready until its normal behavior, failure behavior, recovery behavior, and security boundaries have been tested.