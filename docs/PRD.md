# Fieldmark – Product Requirements Document (PRD)

**Project Name:** Fieldmark  
**Product Type:** Offline-First Field Inspection Management System  
**Document Version:** 1.0  
**Status:** Approved for Development Planning  
**Frontend:** React + TypeScript + Vite  
**Backend:** Python + FastAPI  
**Database:** PostgreSQL  
**Architecture:** Offline-First Progressive Web Application (PWA)

---

# 1. Product Overview

## 1.1 Introduction

Fieldmark is an offline-capable field inspection management application designed for organizations whose employees perform inspections at locations with unreliable or unavailable internet connectivity.

Field inspectors frequently work at construction sites, factories, warehouses, industrial facilities, and remote locations where continuous internet access cannot be guaranteed.

Traditional web applications depend heavily on an active internet connection. This creates problems when inspectors need to access inspection assignments, complete checklists, record observations, and submit reports while offline.

Fieldmark solves this problem by implementing an offline-first architecture.

The application stores previously downloaded inspection information locally on the inspector's device. Inspectors can continue their work without an internet connection. Any changes made offline are saved in local storage and placed into a persistent synchronization queue.

When connectivity becomes available again, Fieldmark automatically synchronizes pending changes with the central backend.

The system also protects against duplicate operations, concurrent modifications, synchronization failures, and accidental data loss.

## 1.2 Product Vision

Build a reliable, secure, and user-friendly field inspection platform that allows inspectors to perform their work regardless of internet availability.

Fieldmark must provide a consistent inspection experience in both online and offline environments.

The application should ensure that:

- Inspectors can access previously downloaded information offline.
- Inspection progress is saved locally.
- Offline submissions are not lost.
- Changes synchronize automatically when connectivity returns.
- Duplicate synchronization requests do not create duplicate records.
- Concurrent modifications are detected and handled safely.
- Users always understand the current synchronization status.

## 1.3 Problem Statement

Field inspection operations frequently take place in environments where network connectivity is unreliable.

This causes several problems:

1. Inspectors cannot access inspection assignments without internet connectivity.
2. Inspection forms may become inaccessible when the network disappears.
3. Work completed offline may be lost if the application does not persist data locally.
4. Retrying failed requests can create duplicate records.
5. Concurrent updates can overwrite newer inspection information.
6. Users have difficulty understanding whether their changes were saved locally or submitted to the server.
7. Administrators cannot reliably monitor pending or failed synchronization operations.

Fieldmark addresses these challenges through local persistence, durable synchronization queues, idempotent APIs, optimistic concurrency control, and clear connectivity feedback.

---

# 2. Product Objectives

The primary objectives are:

1. Provide uninterrupted inspection functionality during network interruptions.
2. Store inspection assignments and related information locally.
3. Allow inspectors to create, update, save, and submit inspection reports offline.
4. Synchronize local changes automatically when connectivity returns.
5. Prevent duplicate updates through idempotency.
6. Detect concurrent modifications using version-based conflict detection.
7. Provide secure authentication and role-based authorization.
8. Provide administrators with centralized inspection and synchronization management.
9. Build an installable Progressive Web Application.
10. Provide reliable automated testing for offline and synchronization scenarios.

## 2.1 Success Criteria

The project will be considered successful when:

- An inspector can access previously downloaded inspections without internet access.
- An inspector can complete and submit an inspection offline.
- Locally saved changes survive browser refreshes and application restarts.
- Pending operations synchronize after connectivity returns.
- Repeated requests do not duplicate business operations.
- Conflicting updates are detected without silently overwriting data.
- Failed synchronization operations remain available for retry.
- Administrators can monitor inspection and synchronization activity.
- Automated tests validate critical offline and synchronization workflows.

---

# 3. Target Users

Fieldmark initially supports two user roles.

## 3.1 Administrator

Administrators manage the organization's inspection operations.

Responsibilities:

- Manage inspector accounts.
- Manage inspection locations.
- Create checklist templates.
- Create inspection assignments.
- Assign inspections to inspectors.
- Monitor inspection progress.
- Review submitted inspection reports.
- Monitor synchronization activity.
- Review and resolve synchronization conflicts.
- Deactivate users, sites, and assignments when necessary.

Administrators have organization-wide access according to their permissions.

## 3.2 Field Inspector

Field inspectors perform assigned inspections.

Responsibilities:

- Log in to Fieldmark.
- Download assigned inspection information.
- View assigned sites and inspection details.
- Complete inspection checklists.
- Record observations and notes.
- Save inspection drafts.
- Submit completed inspections.
- Continue working without internet connectivity.
- Review pending synchronization operations.
- Retry eligible failed synchronization operations.
- Review conflicts affecting their inspections.

Inspectors must only access inspection records assigned to them or otherwise explicitly authorized.

---

# 4. User Stories

## 4.1 Authentication

- As an administrator, I want to create inspector accounts so that employees can access Fieldmark.
- As an inspector, I want to log in securely so that I can access my assignments.
- As a user, I want my session to remain valid according to the configured authentication policy.
- As a user, I want to log out securely.
- As an administrator, I want to deactivate accounts when employees no longer require access.

## 4.2 Inspection Management

- As an administrator, I want to create inspection assignments.
- As an administrator, I want to assign inspections to specific inspectors.
- As an administrator, I want to associate inspections with sites and checklist templates.
- As an inspector, I want to view my assigned inspections.
- As an inspector, I want to access inspection details.
- As an inspector, I want to view the checklist associated with an inspection.

## 4.3 Offline Functionality

- As an inspector, I want to download my assigned inspections while online.
- As an inspector, I want to access previously downloaded inspections while offline.
- As an inspector, I want to complete checklists without internet access.
- As an inspector, I want my changes saved locally.
- As an inspector, I want to refresh or reopen the application without losing saved work.
- As an inspector, I want the application to clearly indicate when I am offline.

## 4.4 Synchronization

- As an inspector, I want pending changes to synchronize automatically when connectivity returns.
- As an inspector, I want to manually initiate synchronization.
- As an inspector, I want to see which operations are pending.
- As an inspector, I want to know whether an operation was successfully synchronized.
- As an inspector, I want failed operations to remain available for retry.
- As an inspector, I want to be notified when a conflict requires attention.

## 4.5 Administration

- As an administrator, I want to monitor inspection completion statistics.
- As an administrator, I want to view all inspectors' inspection activity.
- As an administrator, I want to monitor synchronization failures.
- As an administrator, I want to investigate conflicts.
- As an administrator, I want to review submitted reports.

---

# 5. Functional Requirements

## 5.1 Authentication and Authorization

**FR-AUTH-01:** The system shall support secure user authentication.

**FR-AUTH-02:** The system shall support ADMIN and INSPECTOR roles.

**FR-AUTH-03:** The system shall use JWT access tokens.

**FR-AUTH-04:** The system shall use rotating refresh tokens stored securely in HTTP-only cookies.

**FR-AUTH-05:** The system shall support secure logout and refresh-token revocation.

**FR-AUTH-06:** The backend shall enforce role-based authorization.

**FR-AUTH-07:** The backend shall verify resource ownership and assignment permissions.

**FR-AUTH-08:** The system shall prevent inactive accounts from accessing protected resources.

**FR-AUTH-09:** The application shall support an offline reopening policy for previously authenticated users on the same device.

**FR-AUTH-10:** The application shall not store raw passwords or refresh tokens in IndexedDB.

## 5.2 User Management

**FR-USER-01:** Administrators shall be able to create inspector accounts.

**FR-USER-02:** Administrators shall be able to view users.

**FR-USER-03:** Administrators shall be able to update user information.

**FR-USER-04:** Administrators shall be able to deactivate users.

**FR-USER-05:** Users shall be able to view their profile information.

**FR-USER-06:** Inspectors shall not be able to manage other users.

## 5.3 Site Management

**FR-SITE-01:** Administrators shall be able to create inspection sites.

**FR-SITE-02:** Administrators shall be able to update site information.

**FR-SITE-03:** Administrators shall be able to deactivate sites.

**FR-SITE-04:** Administrators shall be able to view all sites.

**FR-SITE-05:** Inspectors shall be able to view sites associated with their assignments.

## 5.4 Checklist Template Management

**FR-CHECK-01:** Administrators shall be able to create checklist templates.

**FR-CHECK-02:** Administrators shall be able to add checklist questions.

**FR-CHECK-03:** Administrators shall be able to update checklist templates.

**FR-CHECK-04:** The system shall maintain checklist template versions.

**FR-CHECK-05:** Supported response types shall include:

- PASS / FAIL / NOT_APPLICABLE.
- YES / NO.
- TEXT.
- NUMBER.

**FR-CHECK-06:** Checklist questions shall support required and optional responses.

**FR-CHECK-07:** Existing inspection assignments shall retain the checklist template version associated with them.

## 5.5 Inspection Assignment Management

**FR-INSP-01:** Administrators shall be able to create inspection assignments.

**FR-INSP-02:** Administrators shall be able to associate assignments with sites.

**FR-INSP-03:** Administrators shall be able to assign inspectors.

**FR-INSP-04:** Administrators shall be able to associate checklist templates.

**FR-INSP-05:** Administrators shall be able to define scheduled inspection dates.

**FR-INSP-06:** Inspectors shall be able to view assigned inspections.

**FR-INSP-07:** Inspectors shall be able to access inspection details.

**FR-INSP-08:** The system shall support the following assignment statuses:

- ASSIGNED
- IN_PROGRESS
- COMPLETED
- CANCELLED

**FR-INSP-09:** Assignment status and synchronization status shall be tracked separately.

## 5.6 Inspection Execution

**FR-EXEC-01:** Inspectors shall be able to open assigned inspections.

**FR-EXEC-02:** Inspectors shall be able to complete checklist questions.

**FR-EXEC-03:** Inspectors shall be able to enter notes for individual checklist items.

**FR-EXEC-04:** Inspectors shall be able to enter overall inspection observations.

**FR-EXEC-05:** Inspectors shall be able to save an inspection as a draft.

**FR-EXEC-06:** Inspectors shall be able to submit completed inspections.

**FR-EXEC-07:** The system shall validate required checklist responses before submission.

**FR-EXEC-08:** The system shall preserve locally saved inspection data.

**FR-EXEC-09:** The system shall prevent unauthorized modification of submitted reports.

## 5.7 Local Persistence

**FR-LOCAL-01:** The frontend shall use IndexedDB through Dexie.js.

**FR-LOCAL-02:** The application shall store previously downloaded inspection assignments locally.

**FR-LOCAL-03:** The application shall store relevant site and checklist information locally.

**FR-LOCAL-04:** The application shall store locally created inspection results.

**FR-LOCAL-05:** The application shall maintain a persistent synchronization queue.

**FR-LOCAL-06:** Local data shall remain available after browser refreshes.

**FR-LOCAL-07:** Local data shall remain available after temporary browser or application closure, subject to browser storage availability.

**FR-LOCAL-08:** The application shall track local record versions and synchronization metadata.

**FR-LOCAL-09:** Unsynchronized local changes shall not be automatically deleted.

**FR-LOCAL-10:** Local records shall be scoped to the authenticated user and device.

## 5.8 Network Connectivity

**FR-NET-01:** The application shall detect browser online/offline status.

**FR-NET-02:** The application shall display a visible offline indicator.

**FR-NET-03:** The application shall display an online indicator when connectivity is available.

**FR-NET-04:** The application shall verify actual API availability rather than relying only on navigator.onLine.

**FR-NET-05:** The application shall remain usable when the API server is temporarily unavailable, using previously cached data.

**FR-NET-06:** The application shall not discard user changes when network requests fail.

## 5.9 Synchronization Queue

**FR-SYNC-01:** Every locally modified business record requiring server synchronization shall generate a durable operation.

**FR-SYNC-02:** Each synchronization operation shall have a unique operation ID.

**FR-SYNC-03:** The queue shall support CREATE and UPDATE operations.

**FR-SYNC-04:** Each update shall include the base version on which the local modification was made.

**FR-SYNC-05:** The queue shall track operation status.

**FR-SYNC-06:** The queue shall track retry count and timestamps.

**FR-SYNC-07:** The application shall process pending operations when connectivity returns.

**FR-SYNC-08:** The application shall support manual synchronization.

**FR-SYNC-09:** The application shall process independent operations even when another operation fails.

**FR-SYNC-10:** The application shall only mark operations synchronized after receiving a valid server acknowledgement.

**FR-SYNC-11:** The application shall preserve operations with uncertain outcomes and retry them using the same operation ID and payload.

## 5.10 Idempotency

**FR-IDEM-01:** Every synchronization operation shall contain a unique idempotency identifier.

**FR-IDEM-02:** The backend shall persist successfully processed operation identifiers.

**FR-IDEM-03:** Repeated requests using the same operation ID and identical payload shall not create duplicate business updates.

**FR-IDEM-04:** Reusing an operation ID with a different payload shall be rejected.

**FR-IDEM-05:** Idempotency records and the corresponding business changes shall be committed transactionally.

**FR-IDEM-06:** The backend shall return the previously stored operation outcome when a duplicate request is received.

## 5.11 Conflict Management

**FR-CONFLICT-01:** Inspection records shall maintain version numbers.

**FR-CONFLICT-02:** Every update shall include its expected base version.

**FR-CONFLICT-03:** The backend shall compare the submitted base version with the current server version.

**FR-CONFLICT-04:** Stale updates shall not silently overwrite newer server records.

**FR-CONFLICT-05:** Version mismatches shall produce a conflict response.

**FR-CONFLICT-06:** The system shall preserve the local attempted changes.

**FR-CONFLICT-07:** The system shall store a snapshot of the latest server version for review.

**FR-CONFLICT-08:** Authorized users shall be able to review conflicts.

**FR-CONFLICT-09:** Conflict resolution shall require an explicit decision.

**FR-CONFLICT-10:** A resolved change shall generate a new synchronization operation with an appropriate base version.

## 5.12 Retry Mechanism

**FR-RETRY-01:** The application shall automatically retry eligible temporary failures.

**FR-RETRY-02:** The retry mechanism shall use exponential backoff.

**FR-RETRY-03:** Retry delays shall include random jitter.

**FR-RETRY-04:** Retry attempts shall be recorded.

**FR-RETRY-05:** Permanent validation failures shall not be retried automatically.

**FR-RETRY-06:** Conflicts shall require review instead of automatic retries.

**FR-RETRY-07:** Users shall be able to manually retry eligible failed operations.

## 5.13 Bidirectional Synchronization

**FR-PULL-01:** The application shall download server-side changes.

**FR-PULL-02:** The application shall upload local changes.

**FR-PULL-03:** The backend shall support incremental pull requests using opaque cursors.

**FR-PULL-04:** The backend shall provide an ordered and reliable change feed.

**FR-PULL-05:** The frontend shall apply pulled changes transactionally.

**FR-PULL-06:** The frontend shall advance its pull cursor only after successfully applying the corresponding changes.

**FR-PULL-07:** The application shall download newly assigned inspections.

**FR-PULL-08:** The application shall detect updated or deactivated server records.

## 5.14 Progressive Web Application

**FR-PWA-01:** Fieldmark shall be installable as a Progressive Web Application.

**FR-PWA-02:** The application shall use a service worker.

**FR-PWA-03:** The application shell shall be cached.

**FR-PWA-04:** JavaScript, CSS, fonts, icons, and other required static assets shall be available offline after successful caching.

**FR-PWA-05:** Inspection business data shall be stored in IndexedDB.

**FR-PWA-06:** Synchronization requests shall use the network and shall not be falsely treated as cached successful responses.

**FR-PWA-07:** The foreground synchronization mechanism shall work even when Background Sync is unavailable.

## 5.15 Dashboard

**FR-DASH-01:** Administrators shall see organization-wide inspection statistics.

**FR-DASH-02:** Inspectors shall see their own assigned inspection statistics.

**FR-DASH-03:** The dashboard shall display total inspections.

**FR-DASH-04:** The dashboard shall display pending inspections.

**FR-DASH-05:** The dashboard shall display completed inspections.

**FR-DASH-06:** The dashboard shall display synchronization status.

**FR-DASH-07:** The dashboard shall display pending synchronization operations.

**FR-DASH-08:** The dashboard shall display recent activity.

**FR-DASH-09:** Offline dashboard information shall be based on locally available data and clearly identified as potentially outdated.

## 5.16 Sync Center

**FR-CENTER-01:** Users shall be able to view synchronization status.

**FR-CENTER-02:** Users shall be able to see pending operations.

**FR-CENTER-03:** Users shall be able to see successfully synchronized operations.

**FR-CENTER-04:** Users shall be able to view eligible failed operations.

**FR-CENTER-05:** Users shall be able to retry eligible failed operations.

**FR-CENTER-06:** Users shall be able to view synchronization errors.

**FR-CENTER-07:** Users shall be able to view the last successful synchronization time.

**FR-CENTER-08:** Administrators shall be able to monitor synchronization activity across users.

**FR-CENTER-09:** Inspectors shall only be able to view their own synchronization information.

---

# 6. Application Pages

## 6.1 Public Pages

- Login.

## 6.2 Administrator Pages

- Administrator Dashboard.
- User Management.
- Site Management.
- Inspection Management.
- Checklist Template Management.
- Inspection Reports.
- Sync Center.
- Conflict Management.
- Profile and Settings.

## 6.3 Inspector Pages

- Inspector Dashboard.
- My Inspections.
- Inspection Details.
- Inspection Checklist Form.
- Inspection History.
- Sync Center.
- Conflict Review.
- Profile and Settings.

---

# 7. Business Rules

The following business rules must be enforced throughout the application.

## 7.1 Inspection Rules

1. An inspection must belong to a valid site.
2. An inspection must have an assigned inspector.
3. An inspection must reference a valid checklist template version.
4. Only authorized inspectors can modify their assigned inspection results.
5. Required checklist questions must be answered before submission.
6. Submitted inspection reports cannot be silently overwritten.
7. An inspection's assignment status must remain separate from its synchronization status.

## 7.2 Offline Rules

1. Offline access requires previously downloaded information.
2. An inspector cannot access a newly assigned inspection that has never been downloaded to the device.
3. Locally saved changes must survive browser refreshes.
4. Pending operations must remain in the queue until acknowledged or explicitly handled.
5. Local data must be associated with the authenticated user and device.
6. The application must clearly communicate whether data is locally saved or synchronized.
7. Local offline access does not imply that server-side permissions have been permanently validated.

## 7.3 Synchronization Rules

1. Each operation must have a unique operation ID.
2. Every retry of an uncertain operation must use the same operation ID and identical payload.
3. Duplicate operations must not duplicate business changes.
4. Stale updates must be detected.
5. Conflict resolution must be explicit.
6. Temporary failures must not delete queued operations.
7. Permanent validation failures must be reported to the user.
8. Pull changes must be applied before advancing the corresponding cursor.
9. Synchronization must respect operation dependencies.
10. Successfully acknowledged operations must be marked synchronized locally.

## 7.4 Security Rules

1. Passwords must never be stored as plaintext.
2. JWT access tokens must be short-lived.
3. Refresh tokens must be protected in HTTP-only cookies.
4. Backend endpoints must enforce authorization.
5. Inspectors must not access other inspectors' private records.
6. Device synchronization must be associated with the authenticated user.
7. Local data must not be exposed across user sessions on shared devices.
8. All online communication must use HTTPS in production.

---

# 8. Non-Functional Requirements

## 8.1 Reliability

- The application must tolerate temporary network failures.
- Local changes must remain durable.
- Synchronization must support retries.
- Duplicate operations must be handled safely.
- Conflicting modifications must be detected.

## 8.2 Performance

- Previously cached inspection records should open without waiting for the network.
- Local draft saving should feel immediate.
- The synchronization engine should process operations in manageable batches.
- API endpoints should support pagination.
- Incremental synchronization should avoid unnecessary full-data downloads.

## 8.3 Security

- Use secure authentication.
- Apply role-based access control.
- Validate incoming API data.
- Protect sensitive local information.
- Enforce server-side ownership checks.
- Apply rate limits to sensitive endpoints.
- Avoid exposing sensitive information in application logs.

## 8.4 Usability

- Online and offline states must be clearly visible.
- Local saving and server synchronization must be distinguishable.
- Error messages must be understandable.
- Retry actions must be easy to access.
- Conflict messages must explain what happened.
- The application must be responsive across desktop, tablet, and mobile devices.

## 8.5 Maintainability

- Follow modular frontend and backend architectures.
- Use TypeScript for frontend code.
- Use type-checked Python code where practical.
- Maintain API contracts.
- Use database migrations.
- Include automated tests.
- Maintain clear documentation.

## 8.6 Compatibility

- Support modern Chromium-based browsers.
- Support modern Firefox and Safari where the required PWA and IndexedDB capabilities are available.
- Provide a functional foreground synchronization mechanism independent of Background Sync support.
- Gracefully handle browser storage limitations.

---

# 9. Technology Stack

## 9.1 Frontend

| Technology | Responsibility |
|---|---|
| React | UI development |
| TypeScript | Static type safety |
| Vite | Development and build tooling |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| React Router | Routing |
| TanStack Query | Server state |
| Zustand | Client state |
| Dexie.js | IndexedDB |
| React Hook Form | Form handling |
| Zod | Validation |
| Axios | HTTP requests |
| Workbox / compatible service worker tooling | PWA caching |
| Vitest | Unit testing |
| React Testing Library | Component testing |
| Playwright | E2E testing |

## 9.2 Backend

| Technology | Responsibility |
|---|---|
| Python | Backend language |
| FastAPI | REST API |
| Pydantic | Request and response validation |
| SQLAlchemy | ORM |
| Alembic | Database migrations |
| PostgreSQL | Relational database |
| Argon2id | Password hashing |
| JWT | Access authentication |
| Pytest | Automated testing |
| HTTPX | API testing |

Exact stable dependency versions must be verified for compatibility and locked before implementation.

## 9.3 Infrastructure

- Git and GitHub.
- PostgreSQL.
- pgAdmin for database inspection.
- Environment-based configuration.
- HTTPS for production.
- Docker Compose for reproducible local infrastructure, if adopted during implementation.

---

# 10. Database Requirements

The initial PostgreSQL database shall be named:

`field_inspection_db`

The database shall contain the following 12 core tables:

| Table | Purpose |
|---|---|
| users | User accounts and roles |
| refresh_tokens | Refresh-token sessions |
| sites | Physical inspection locations |
| inspections | Inspection assignments |
| checklist_templates | Reusable checklist templates |
| checklist_items | Checklist questions |
| inspection_results | Inspection reports |
| inspection_answers | Individual checklist answers |
| sync_operations | Idempotency and operation history |
| sync_devices | Registered inspector devices |
| sync_conflicts | Conflict tracking and resolution |
| sync_changes | Server-side incremental change feed |

Database design requirements:

1. Use UUID primary keys.
2. Use timezone-aware timestamps.
3. Use foreign keys and appropriate constraints.
4. Use indexes for frequently queried columns.
5. Use JSONB for flexible inspection answers and synchronization payloads.
6. Use optimistic concurrency version numbers.
7. Use database transactions for synchronization operations.
8. Maintain synchronization history.
9. Version checklist templates.
10. Use soft deletion where necessary to protect offline synchronization consistency.

The detailed schema, indexes, constraints, and entity relationships are specified in `database-design.md`.

---

# 11. Synchronization Requirements

Synchronization must support two directions.

## 11.1 Push

Device to server.

The application uploads locally created or modified inspection information.

Endpoint:

`POST /api/v1/sync/push`

## 11.2 Pull

Server to device.

The application downloads newly created or modified server records.

Endpoint:

`GET /api/v1/sync/pull`

The pull mechanism shall use opaque cursors and a reliable server-side change feed.

## 11.3 Idempotency

Every operation must have a unique operation identifier.

The backend must return the previously recorded result when it receives an identical operation again.

An operation ID reused with a different payload must be rejected.

## 11.4 Conflict Detection

The system must use optimistic concurrency control.

The backend must reject stale updates and preserve enough information for conflict review.

## 11.5 Retry

Temporary failures must be retried using exponential backoff with jitter.

Permanent validation failures and conflicts must not be retried automatically.

## 11.6 Synchronization Status

The system must distinguish:

- Pending.
- Syncing.
- Synced.
- Failed.
- Conflict.
- Rejected.

The application must never report that a change was synchronized until the server has acknowledged it.

---

# 12. User Interface Requirements

Fieldmark must provide a professional, clean, and responsive industrial-management interface.

## 12.1 Design Principles

- Clear navigation.
- Consistent visual hierarchy.
- Accessible form controls.
- Responsive layouts.
- Readable status indicators.
- Minimal unnecessary interactions.
- Clear error and success messages.

## 12.2 Connectivity Indicator

The application shall display the following states:

| State | Message |
|---|---|
| Online | Connected |
| Offline | You are offline. Your changes will be saved on this device. |
| Syncing | Synchronizing your changes... |
| Synced | All changes synchronized successfully. |
| Failed | Some changes could not be synchronized. |
| Conflict | An update needs your attention. |

## 12.3 Local Save Feedback

When an inspector saves a draft or submits an offline inspection, the application must explicitly confirm local persistence.

Example:

"Saved on this device. Waiting for an internet connection to synchronize."

This message must not imply that the server has received the data.

---

# 13. Scope

## 13.1 Included in Initial Release

- Authentication and authorization.
- Administrator and inspector roles.
- User management.
- Site management.
- Checklist template management.
- Inspection assignments.
- Inspection execution.
- Local inspection persistence.
- IndexedDB storage.
- Offline application access.
- Synchronization queue.
- Bidirectional synchronization.
- Idempotency protection.
- Optimistic concurrency.
- Conflict management.
- Automatic retry.
- Sync Center.
- PWA installability.
- Automated tests.
- Project documentation.

## 13.2 Excluded from Initial Release

The following features are not required for the initial MVP:

- Live GPS tracking.
- Real-time inspector location monitoring.
- Offline maps.
- Image and video attachments.
- Digital signatures.
- Barcode and QR code scanning.
- Push notifications.
- Advanced reporting and analytics.
- Multi-organization SaaS tenancy.
- Complex custom checklist builders.
- Native Android or iOS applications.
- Advanced device fleet management.

These features may be considered in future releases.

---

# 14. Risks and Mitigation

| Risk | Mitigation |
|---|---|
| Browser storage is unavailable or full | Detect storage failures and clearly notify users |
| Device loses power during an inspection | Persist changes frequently |
| Server response is lost | Retry using the same idempotency key |
| Duplicate synchronization request | Server-side idempotency |
| Concurrent inspection updates | Version-based conflict detection |
| User logs out on a shared device | Apply user-scoped local data protection |
| Refresh token expires while offline | Permit the documented offline reopening policy, then revalidate online |
| Browser closes during synchronization | Preserve queue state and resume later |
| Background Sync unsupported | Use foreground synchronization |
| Administrator deactivates an inspector | Revalidate authorization on the server |

---

# 15. Acceptance Criteria

The application must satisfy the following conditions before the initial release.

## Authentication

- [ ] Administrator can log in.
- [ ] Inspector can log in.
- [ ] Invalid credentials are rejected.
- [ ] Role-based authorization works.
- [ ] Refresh-token rotation works.
- [ ] Logout revokes the refresh session.

## Inspection Management

- [ ] Administrator can create sites.
- [ ] Administrator can create checklist templates.
- [ ] Administrator can create assignments.
- [ ] Administrator can assign inspectors.
- [ ] Inspector can view assigned inspections.
- [ ] Inspector can complete checklists.
- [ ] Inspector can save drafts.
- [ ] Inspector can submit reports.

## Offline Functionality

- [ ] Inspection information can be downloaded.
- [ ] Previously downloaded information is available offline.
- [ ] Offline inspection forms work.
- [ ] Local changes persist after refresh.
- [ ] Local changes survive application closure.
- [ ] Offline status is visible.
- [ ] Locally saved data is distinguishable from server-synchronized data.

## Synchronization

- [ ] Offline changes enter the queue.
- [ ] Reconnection triggers synchronization.
- [ ] Manual synchronization works.
- [ ] Push synchronization works.
- [ ] Pull synchronization works.
- [ ] Duplicate requests are safe.
- [ ] Conflicts are detected.
- [ ] Conflicting local changes are preserved.
- [ ] Temporary failures trigger retries.
- [ ] Permanent errors are reported.
- [ ] Synchronization history is available.

## PWA

- [ ] Application can be installed.
- [ ] Application shell loads offline after caching.
- [ ] Required assets are available offline.
- [ ] Business data is stored in IndexedDB.
- [ ] Foreground synchronization works independently of Background Sync.

## Testing

- [ ] Backend tests pass.
- [ ] Frontend tests pass.
- [ ] Synchronization tests pass.
- [ ] Idempotency tests pass.
- [ ] Conflict tests pass.
- [ ] Retry tests pass.
- [ ] Offline E2E tests pass.

---

# 16. Definition of Done

Fieldmark's initial release is complete when all in-scope features are implemented, tested, and documented.

The most important completion requirement is:

**An authenticated inspector must be able to download assigned inspection data, disconnect from the internet, complete and submit an inspection, refresh or reopen the application without losing the saved report, reconnect to the internet, and synchronize the report exactly once without silently overwriting newer server data.**

The project must also demonstrate reliable authentication, role-based authorization, bidirectional synchronization, retry handling, and conflict detection.

---

# 17. Future Enhancements

Potential future improvements include:

1. Inspection image attachments.
2. Digital signatures.
3. GPS-based site verification.
4. QR code equipment identification.
5. Advanced inspection analytics.
6. Push notifications.
7. Offline map support.
8. PDF inspection report generation.
9. Device-level encryption enhancements.
10. Advanced organization and team management.

These enhancements must not compromise the reliability of the core offline-first architecture.

---

# 18. Final Product Definition

Fieldmark is an offline-first field inspection management platform that allows administrators to manage inspection operations and field inspectors to complete assigned inspections regardless of internet connectivity.

The application uses React, TypeScript, Vite, FastAPI, PostgreSQL, and IndexedDB.

Its primary engineering capabilities are:

- Local data persistence.
- Durable synchronization queues.
- Bidirectional synchronization.
- Idempotent operation processing.
- Optimistic concurrency control.
- Conflict detection and resolution.
- Automatic retry.
- Secure authentication and authorization.
- Progressive Web Application support.

**Product Goal: Reliable inspections, even without an internet connection.**