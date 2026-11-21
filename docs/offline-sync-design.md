# Offline Synchronization Design

## 1. Purpose

Fieldmark must allow inspectors to complete inspection work even when internet connectivity is unavailable or unreliable.

The application must save inspection data locally, maintain a durable synchronization queue, and synchronize changes with the FastAPI backend when connectivity becomes available.

The offline synchronization system must prevent:

- Lost inspection data.
- Duplicate operations.
- Silent overwriting of newer server data.
- Incorrect synchronization status.
- Data leakage between users.
- Incomplete synchronization after application restarts.
- Incorrect cursor advancement during pull synchronization.

This document defines the offline-first architecture, local storage model, synchronization lifecycle, conflict handling, retry strategy, and testing requirements.

---

## 2. Core Principles

The offline synchronization system must follow these principles.

| Principle | Description |
|---|---|
| Local-first writes | Save user changes to IndexedDB before attempting network synchronization. |
| Durable queue | Store pending operations persistently so they survive browser refreshes and application restarts. |
| Idempotency | Retrying an operation must not create duplicate server records. |
| Version control | Detect when the server record has changed since the local copy was downloaded. |
| Explicit conflict handling | Never silently overwrite conflicting inspection data. |
| User isolation | Synchronize only records the authenticated user is authorized to access. |
| Safe retries | Retry temporary failures without changing operation identity. |
| Transactional local updates | Apply pulled changes and update the cursor safely. |
| Observable synchronization | Clearly communicate pending, syncing, failed, and conflict states. |

---

## 3. Offline-First Architecture

Fieldmark uses the browser's IndexedDB database as its primary local persistence layer.

Dexie.js provides a convenient interface for managing IndexedDB.

### Architecture

```text
                 FIELD INSPECTOR
                        |
                        v
                 REACT APPLICATION
                        |
            +-----------+-----------+
            |                       |
            v                       v
       Inspection UI           Sync Center
            |                       |
            v                       v
       Application Services    Sync Engine
            |                       |
            v                       v
       IndexedDB (Dexie)       Sync Queue
            |                       |
            +-----------+-----------+
                        |
                 Connectivity Check
                        |
                 Internet Available?
                    /       \
                  No         Yes
                  |           |
                  v           v
              Stay Offline  FastAPI Backend
                                 |
                                 v
                             PostgreSQL
```

### Important rule

The UI must never depend on a successful API response to save an inspector's work.

The correct sequence is:

1. Inspector edits an inspection.
2. Frontend validates the input.
3. Frontend saves the change to IndexedDB.
4. Frontend creates or updates a pending synchronization operation.
5. UI displays the locally saved information.
6. Sync engine uploads the operation when connectivity is available.
7. Backend validates and processes the operation.
8. Frontend updates the operation status after receiving the result.

---

## 4. Technology Responsibilities

| Technology | Responsibility |
|---|---|
| React | Inspection interface and synchronization UI |
| TypeScript | Type-safe local and synchronization models |
| Dexie.js | IndexedDB database management |
| IndexedDB | Persistent offline application data |
| FastAPI | Server-side synchronization APIs |
| PostgreSQL | Authoritative server-side records |
| SQLAlchemy | Database operations |
| Pydantic | Request and response validation |
| JWT | Authentication |
| Service Worker | Application caching and offline loading |
| Workbox or compatible tooling | Service worker implementation |
| TanStack Query | Server-state management where appropriate |
| Zustand | Client-side application and synchronization state |

TanStack Query must not be treated as the offline database. IndexedDB is responsible for durable offline persistence.

---

## 5. IndexedDB Database Design

Create a Dexie database named:

`fieldmark_local_db`

The local database must contain the following tables.

### 5.1 local_users

Stores the local account context needed to isolate offline data.

Suggested fields:

| Field | Type | Description |
|---|---|---|
| id | string | Local record ID |
| server_user_id | string | Server user UUID |
| email | string | Account email |
| role | string | ADMIN or INSPECTOR |
| last_authenticated_at | string | Last successful online authentication |
| offline_access_expires_at | string | Offline access expiry |
| created_at | string | Local creation time |

Do not store plaintext passwords or refresh tokens in IndexedDB.

Offline authentication must only be permitted after a successful online authentication, subject to the application's offline access policy.

### 5.2 local_sites

Caches sites available to the authenticated user.

| Field | Type | Description |
|---|---|---|
| id | string | Local/server UUID |
| name | string | Site name |
| location | string | Site location |
| status | string | Site status |
| server_version | number | Last known server version |
| updated_at | string | Last known update |

### 5.3 local_inspections

Stores locally available inspection assignments and their current state.

| Field | Type | Description |
|---|---|---|
| id | string | Inspection UUID |
| site_id | string | Associated site |
| template_id | string | Checklist template |
| inspector_id | string | Assigned inspector |
| status | string | Inspection status |
| server_version | number | Last known server version |
| local_updated_at | string | Last local update |
| server_updated_at | string | Last server update |
| sync_status | string | Current synchronization state |

### 5.4 local_checklist_templates

Stores downloaded checklist templates.

| Field | Type | Description |
|---|---|---|
| id | string | Template UUID |
| name | string | Template name |
| revision | number | Template revision |
| status | string | Template status |
| items | array | Cached checklist items |
| downloaded_at | string | Local download time |

A downloaded template revision must remain associated with the inspection that uses it.

Do not silently replace an inspection's template revision when the server publishes a newer revision.

### 5.5 local_inspection_answers

Stores locally saved inspection answers.

| Field | Type | Description |
|---|---|---|
| id | string | Answer UUID |
| inspection_id | string | Associated inspection |
| checklist_item_id | string | Checklist item |
| value | JSON | Answer value |
| remarks | string | Inspector remarks |
| server_version | number | Last known answer version |
| local_updated_at | string | Last local update |
| sync_status | string | Synchronization state |

Answers must remain available after page refreshes and browser restarts.

### 5.6 sync_queue

Stores operations that must be synchronized with the backend.

| Field | Type | Description |
|---|---|---|
| id | string | Unique operation UUID |
| user_id | string | Owner of the operation |
| device_id | string | Originating device |
| entity_type | string | Entity type |
| entity_id | string | Entity UUID |
| operation_type | string | CREATE, UPDATE, DELETE, or SUBMIT |
| payload | JSON | Immutable operation payload |
| payload_hash | string | Hash of the canonical payload |
| base_version | number or null | Version on which the change was based |
| dependencies | string array | Operations that must finish first |
| status | string | Queue status |
| attempts | number | Number of attempts |
| next_retry_at | string or null | Scheduled retry time |
| created_at | string | Operation creation time |
| last_attempt_at | string or null | Last attempt time |
| last_error | JSON or null | Last failure details |

Operation IDs must be generated once and remain unchanged across retries.

The queue must preserve operation dependencies. For example, an inspection creation must be accepted before a dependent answer operation can be processed.

### 5.7 sync_metadata

Stores synchronization metadata.

| Field | Type | Description |
|---|---|---|
| id | string | Metadata key |
| value | JSON | Metadata value |
| updated_at | string | Last metadata update |

Example metadata:

- Last successful pull cursor.
- Last successful synchronization time.
- Device ID.
- Last synchronization error.
- Current authenticated user ID.

### 5.8 sync_conflicts

Stores local information about unresolved conflicts.

| Field | Type | Description |
|---|---|---|
| id | string | Conflict UUID |
| operation_id | string | Related operation |
| entity_type | string | Entity type |
| entity_id | string | Entity UUID |
| local_snapshot | JSON | Local version |
| server_snapshot | JSON | Server version |
| conflict_type | string | Conflict category |
| status | string | OPEN, RESOLVED |
| created_at | string | Conflict creation time |
| resolved_at | string or null | Resolution time |

---

## 6. Synchronization Queue Lifecycle

Every locally created or modified record that requires server synchronization must produce a durable operation.

### Queue statuses

| Status | Meaning |
|---|---|
| PENDING | Waiting for synchronization |
| PROCESSING | Currently being uploaded |
| SYNCED | Successfully processed by the server |
| FAILED | A retryable operation failed |
| CONFLICT | Requires conflict resolution |
| REJECTED | Server rejected the operation |
| CANCELLED | Operation was safely cancelled before processing |

### Queue lifecycle

```text
           LOCAL CHANGE
                |
                v
          SAVE TO INDEXEDDB
                |
                v
           PENDING QUEUE
                |
                v
         INTERNET AVAILABLE?
             /       \
           No         Yes
           |           |
           |           v
           |        PROCESSING
           |           |
           |           v
           |       SEND TO API
           |           |
           |     +-----+------+
           |     |     |      |
           |     v     v      v
           |   SYNCED CONFLICT FAILED
           |             |
           |             v
           |        RETRY POLICY
           |
           v
       WAIT FOR NETWORK
```

The queue must not be cleared merely because an HTTP request was sent.

An operation can be marked `SYNCED` only after the backend confirms its successful processing.

---

## 7. Creating a Local Operation

When an inspector updates an answer, the frontend must save the answer and its synchronization operation together in a Dexie transaction.

Example:

```typescript
await db.transaction(
  "rw",
  db.local_inspection_answers,
  db.sync_queue,
  async () => {
    await db.local_inspection_answers.put({
      id: answer.id,
      inspection_id: answer.inspection_id,
      checklist_item_id: answer.checklist_item_id,
      value: answer.value,
      remarks: answer.remarks,
      server_version: answer.server_version,
      local_updated_at: new Date().toISOString(),
      sync_status: "PENDING",
    });

    await db.sync_queue.add({
      id: crypto.randomUUID(),
      user_id: currentUser.id,
      device_id: deviceId,
      entity_type: "INSPECTION_ANSWER",
      entity_id: answer.id,
      operation_type: "UPDATE",
      payload: answer,
      payload_hash: await calculatePayloadHash(answer),
      base_version: answer.server_version,
      dependencies: [],
      status: "PENDING",
      attempts: 0,
      next_retry_at: null,
      created_at: new Date().toISOString(),
      last_attempt_at: null,
      last_error: null,
    });
  }
);
```

This example illustrates the intended behavior. The final implementation must ensure the hashing operation and transaction boundaries are compatible with Dexie's transaction lifecycle.

For repeated edits to the same answer, define an explicit coalescing strategy:

- Preserve operation identity if the operation has already been sent.
- Do not modify the payload of an operation currently being processed.
- A pending, unsent operation may be replaced or safely coalesced according to a documented rule.
- Never remove a dependent operation that is still required.

---

## 8. Push Synchronization

Push synchronization uploads locally queued operations to the backend.

Endpoint:

`POST /api/v1/sync/push`

### Example request

```json
{
  "device_id": "device-uuid",
  "operations": [
    {
      "operation_id": "operation-uuid",
      "entity_type": "INSPECTION_ANSWER",
      "entity_id": "answer-uuid",
      "operation_type": "UPDATE",
      "base_version": 3,
      "payload_hash": "sha256-hash",
      "payload": {
        "inspection_id": "inspection-uuid",
        "checklist_item_id": "item-uuid",
        "value": "PASS",
        "remarks": "No visible damage"
      }
    }
  ]
}
```

### Example response

```json
{
  "success": true,
  "results": [
    {
      "operation_id": "operation-uuid",
      "status": "ACCEPTED",
      "entity_id": "answer-uuid",
      "server_version": 4,
      "message": "Operation synchronized successfully"
    }
  ]
}
```

Possible operation outcomes:

- `ACCEPTED`: The server successfully processed the operation.
- `CONFLICT`: The server detected a version conflict.
- `REJECTED`: The operation failed a business rule or authorization check.
- `RETRYABLE_ERROR`: The operation failed due to a temporary server-side problem.

The backend must return an explicit outcome for every submitted operation.

### Push processing rules

1. Authenticate the request.
2. Validate the device and user context.
3. Validate each operation.
4. Verify operation ID and payload hash.
5. Check idempotency records.
6. Check the entity's base version.
7. Check authorization and business rules.
8. Process the operation in a database transaction.
9. Persist its result for idempotent retries.
10. Return an outcome for each operation.

The server must never trust a user ID supplied only inside an operation payload. The authenticated identity and authorization rules determine ownership.

---

## 9. Idempotency

Idempotency prevents duplicate records when the same operation is submitted multiple times.

Example:

1. Client sends operation `operation-123`.
2. Server successfully processes it.
3. Network connection fails before the client receives the response.
4. Client retries `operation-123`.
5. Server recognizes the operation and returns its previously stored result.

### Required backend behavior

Maintain a durable operation ledger.

A ledger record should include:

- Operation ID.
- Authenticated user ID.
- Device ID.
- Payload hash.
- Processing status.
- Original result.
- Creation and completion timestamps.

The uniqueness scope must be explicitly defined, such as a unique operation ID within an authenticated user/device context.

If an existing operation ID is submitted with a different payload hash, reject it as an idempotency violation.

A duplicate operation with an identical payload must return the original result rather than executing the business operation again.

The idempotency ledger and the business data changes must be committed atomically.

---

## 10. Pull Synchronization

Pull synchronization downloads server-side changes that the current device does not already have.

Endpoint:

`GET /api/v1/sync/pull`

Example:

```http
GET /api/v1/sync/pull?cursor=opaque-cursor&limit=100
```

### Example response

```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "change_id": "change-uuid",
        "entity_type": "SITE",
        "entity_id": "site-uuid",
        "operation": "UPDATE",
        "server_version": 5,
        "data": {
          "name": "North Facility",
          "location": "Hyderabad"
        }
      }
    ],
    "next_cursor": "opaque-next-cursor",
    "has_more": false
  }
}
```

### Pull processing rules

1. Read the last successfully stored cursor.
2. Request the next batch of changes.
3. Validate the response.
4. Apply changes to IndexedDB.
5. Apply the entire batch and its new cursor in a single local transaction.
6. Continue if `has_more` is true.
7. Stop when all available changes are processed.

The cursor must only advance after the associated changes have been successfully applied to IndexedDB.

If the application crashes before the transaction commits, the previous cursor must remain available so the batch can be downloaded again.

### Important cursor design requirement

A simple database sequence or `BIGSERIAL` value must not automatically be treated as a safe commit-ordered change cursor.

Concurrent transactions can allocate sequence values in one order and commit in another. A client using a naïve high-water mark can miss changes that commit later with a lower sequence value.

The backend must implement a snapshot-safe, commit-ordered change-feed strategy.

Possible approaches include:

- A serialized change-log writer with a committed cursor.
- A transactional per-scope change counter that serializes updates.
- Another explicitly proven snapshot-safe change-feed design.

The selected implementation must document how it prevents missing changes during concurrent writes and pagination.

The cursor must also be opaque to the frontend and scoped to the authenticated user's authorized data.

---

## 11. Conflict Detection

A conflict occurs when a local update is based on an older server version.

Example:

```text
Server version: 5
Inspector downloads version: 5

Inspector goes offline.

Another authorized user updates the same record.

Server version becomes: 6

Inspector edits the old local version and reconnects.

Client submits base_version: 5.

Server detects that the current version is 6.

Result: CONFLICT
```

### Conflict response

```json
{
  "success": true,
  "results": [
    {
      "operation_id": "operation-123",
      "status": "CONFLICT",
      "entity_id": "answer-123",
      "server_version": 6,
      "message": "The record was modified on the server"
    }
  ]
}
```

### Conflict handling requirements

- Preserve the local version.
- Preserve the current server version.
- Store both snapshots locally.
- Mark the operation as `CONFLICT`.
- Show the conflict in Sync Center.
- Require an explicit resolution decision.
- Record the resolution for audit purposes.

Do not use automatic last-write-wins for important inspection answers.

---

## 12. Conflict Resolution

The application must provide a conflict resolution workflow.

Example:

```text
             SYNC CONFLICT
                   |
                   v
          LOAD LOCAL SNAPSHOT
                   |
                   v
          LOAD SERVER SNAPSHOT
                   |
                   v
          SHOW DIFFERENCES
                   |
                   v
           INSPECTOR REVIEWS
                   |
          +--------+--------+
          |        |        |
          v        v        v
       Accept   Keep Local  Manual
       Server               Review
          |        |        |
          +--------+--------+
                   |
                   v
          SUBMIT RESOLUTION
                   |
                   v
          SERVER VALIDATION
                   |
                   v
           RESOLUTION SAVED
```

Possible resolution strategies:

**Accept Server Version**

- Discard the conflicting local modification only after the user confirms.
- Update the local record with the server snapshot.
- Mark the obsolete operation as resolved.

**Keep Local Version**

- Create a new operation based on the latest server version.
- Include the current server version as the new `base_version`.
- Preserve the original operation and its conflict history.
- Let the server validate the new operation.

**Manual Resolution**

- Display local and server values.
- Allow the user to prepare a corrected value.
- Submit the result as a new operation using the latest known server version.

All resolution operations must be authenticated, authorized, version-checked, and auditable.

---

## 13. Retry Strategy

Temporary network failures must not permanently block synchronization.

Use exponential backoff with jitter.

Example retry schedule:

| Attempt | Approximate delay |
|---|---|
| 1 | 2 seconds |
| 2 | 4 seconds |
| 3 | 8 seconds |
| 4 | 16 seconds |
| 5 | 32 seconds |
| 6 | 60 seconds |

The exact values should be configurable.

The retry delay should include random jitter to reduce simultaneous retries from multiple devices.

### Retryable failures

- Network unavailable.
- Request timeout.
- Temporary server error.
- HTTP 429, respecting `Retry-After`.
- Temporary service unavailability.

### Non-retryable failures

- Invalid payload.
- Authentication or authorization rejection.
- Invalid business state.
- Unsupported operation.
- Idempotency violation.

A `401` response should trigger the defined authentication recovery process, not an endless retry loop.

A `409` version conflict must enter conflict handling rather than ordinary retry.

After the configured retry limit:

- Keep the operation and its error details.
- Mark it as `FAILED`.
- Show the error in Sync Center.
- Allow a user-authorized retry after the cause is addressed.

---

## 14. Dependency Ordering

Some operations depend on earlier operations.

Example:

```text
CREATE INSPECTION
       |
       v
CREATE ANSWER
       |
       v
UPDATE ANSWER
       |
       v
SUBMIT INSPECTION
```

The synchronization engine must respect these dependencies.

Requirements:

- An operation must not be processed before its required dependencies.
- Failed dependencies must prevent dependent operations from being submitted.
- Dependency failures must be visible.
- Operations must not be reordered in a way that changes business meaning.
- The backend must validate the actual business state rather than trusting client-side ordering alone.

Where practical, group independent operations into batches while preserving dependencies.

---

## 15. Network Detection

Use browser network events as hints:

```typescript
window.addEventListener("online", () => {
  // Request a connectivity check and schedule synchronization.
});

window.addEventListener("offline", () => {
  // Update the application connectivity state.
});
```

`navigator.onLine` does not prove that the backend is reachable.

The application must distinguish:

- Browser reports offline.
- Browser reports online but API is unreachable.
- API is reachable.
- API is reachable but authentication has expired.

Use a lightweight backend health check or a successful API response to confirm backend connectivity.

Local editing must remain available even if the backend is unreachable.

---

## 16. Synchronization Engine

Create a dedicated synchronization service.

Suggested frontend structure:

```text
src/
└── services/
    └── sync/
        ├── syncEngine.ts
        ├── syncQueue.ts
        ├── pushSync.ts
        ├── pullSync.ts
        ├── conflictResolver.ts
        ├── retryManager.ts
        ├── connectivityManager.ts
        ├── operationFactory.ts
        ├── dependencyManager.ts
        └── syncTypes.ts
```

### Responsibilities

| File | Responsibility |
|---|---|
| syncEngine.ts | Coordinates complete synchronization |
| syncQueue.ts | Reads and updates pending operations |
| pushSync.ts | Sends queued operations |
| pullSync.ts | Downloads server changes |
| conflictResolver.ts | Manages conflict workflows |
| retryManager.ts | Calculates retry timing |
| connectivityManager.ts | Tracks network and backend availability |
| operationFactory.ts | Creates consistent sync operations |
| dependencyManager.ts | Checks operation dependencies |
| syncTypes.ts | Shared TypeScript synchronization types |

### Synchronization sequence

The engine must:

1. Verify that the user has an authorized active session.
2. Verify offline/online access policy.
3. Confirm backend connectivity.
4. Acquire a synchronization lock for the current user and device.
5. Load eligible operations.
6. Process operations in dependency order.
7. Submit operations in bounded batches.
8. Persist every returned operation outcome.
9. Preserve conflicts and rejected operations.
10. Pull available server changes.
11. Apply pulled changes transactionally.
12. Persist the successful pull cursor.
13. Update synchronization timestamps.
14. Release the synchronization lock.

A failed push batch must not cause unrelated successful operation results to be discarded.

The synchronization engine must be safe against duplicate execution caused by multiple tabs or overlapping triggers.

Use an appropriate locking strategy, such as Web Locks where supported, with a safe fallback for environments without that capability.

---

## 17. Synchronization Triggers

Synchronization should be triggered by:

- Successful login while online.
- Application startup when an authenticated user is online.
- Browser `online` event.
- Manual Sync Now action.
- Completion of an inspection.
- A scheduled foreground check while the application is active.

Do not start an uncontrolled synchronization request after every keystroke.

Use debouncing and a queue-based scheduling strategy.

### Background synchronization

Browser Background Sync support is not universal.

Foreground synchronization is the required baseline.

Background Sync may be implemented as an enhancement where supported, but Fieldmark must remain correct when the feature is unavailable.

A service worker must not be treated as a replacement for the durable IndexedDB queue or server-side idempotency.

---

## 18. Sync Center UI

Fieldmark must include a dedicated Sync Center.

The Sync Center should display:

- Current network status.
- Backend connectivity status.
- Last successful synchronization.
- Pending operation count.
- Currently processing operation count.
- Failed operation count.
- Conflict count.
- Rejected operation count.
- Operation history.
- Last error details.
- Retry action.
- Conflict resolution action.

### Status indicators

| Status | UI label |
|---|---|
| PENDING | Waiting to sync |
| PROCESSING | Syncing |
| SYNCED | Synced |
| FAILED | Failed |
| CONFLICT | Needs attention |
| REJECTED | Rejected |

Do not display `Synced` before the server has acknowledged successful processing.

Provide clear feedback when local changes are saved but not yet synchronized.

---

## 19. Offline Authentication and User Isolation

Offline support must not weaken authentication.

Requirements:

- The user must authenticate online at least once before offline access is enabled.
- Offline access must have a bounded validity period.
- Offline access must be scoped to the previously authenticated user and device.
- Never store plaintext passwords.
- Never store refresh tokens in IndexedDB.
- Do not allow one user's cached records to appear in another user's session.
- Clear or securely isolate cached account data when switching accounts.
- Do not silently delete unsynchronized changes during logout.
- Handle expired offline access with a clear reauthentication message.

Offline access cannot immediately detect server-side account suspension, role changes, or permission revocation.

Therefore, privileged operations and server-side changes must always be validated by the backend when connectivity returns.

The local application must restrict offline functionality to the capabilities and data already authorized and downloaded.

---

## 20. Data Deletion and Tombstones

Deleting a server record must be represented through a synchronization-safe deletion event.

The backend should publish tombstones in the change feed.

A tombstone identifies:

- Entity type.
- Entity ID.
- Deletion version or change position.
- Deletion timestamp.
- Relevant authorization scope.

The client must apply the tombstone only after checking whether the local record contains unsynchronized changes.

If dirty local changes exist, preserve them and surface the appropriate conflict or deletion warning.

Do not silently delete pending local work because a server deletion was received.

---

## 21. Performance and Reliability

The synchronization system must:

- Use bounded batch sizes.
- Avoid loading the entire local database into memory.
- Avoid unnecessary repeated API calls.
- Process large queues in manageable batches.
- Support pagination during pull synchronization.
- Keep operation payloads reasonably small.
- Handle browser termination safely.
- Resume synchronization after application restart.
- Keep the UI responsive during synchronization.
- Use database transactions for related local updates.

Initial batch-size targets should be configurable and validated through testing rather than assumed to be optimal.

---

## 22. Security Considerations

The implementation must address:

1. User-specific local data isolation.
2. Server-side authorization for every synchronized operation.
3. Input validation on both frontend and backend.
4. Safe handling of locally stored inspection information.
5. Secure authentication and refresh-token handling.
6. Protection against replay and duplicate operations.
7. Operation payload integrity through canonical payload hashing.
8. Protection against cross-user synchronization.
9. No trust in client-provided roles or ownership.
10. Auditability of conflict resolution and inspection submission.

IndexedDB is not automatically encrypted by the browser.

Do not claim that storing data in IndexedDB makes it secure against local device compromise or malicious scripts running in the application's origin.

Use appropriate device security, HTTPS, restrictive Content Security Policy, minimal data caching, and a carefully designed data-retention policy.

---

## 23. Testing Strategy

The offline synchronization system must have unit, integration, and end-to-end tests.

### Unit tests

Test:

- Operation creation.
- Operation ID stability.
- Payload hashing.
- Queue status transitions.
- Dependency ordering.
- Retry delay calculations.
- Conflict classification.
- Cursor persistence rules.

### Integration tests

Test:

- IndexedDB transaction behavior.
- Local answer and queue creation together.
- Push API processing.
- Duplicate operation handling.
- Payload hash mismatch.
- Server version conflicts.
- Pull synchronization.
- Tombstone processing.
- Authentication expiry.
- User data isolation.

### End-to-end tests

Test these real-world scenarios:

**Scenario 1: Complete an inspection offline**

1. Log in while online.
2. Download an inspection assignment.
3. Disconnect from the internet.
4. Open the inspection.
5. Complete checklist answers.
6. Refresh the browser.
7. Verify all answers remain available.
8. Reconnect to the internet.
9. Synchronize.
10. Verify that the server contains the submitted information.

**Scenario 2: Duplicate retry**

1. Create a local operation.
2. Send it to the backend.
3. Simulate a lost response.
4. Retry the same operation ID.
5. Verify that the server does not create a duplicate record.

**Scenario 3: Concurrent update**

1. Download an inspection answer.
2. Modify it offline.
3. Modify the same answer on the server.
4. Reconnect.
5. Verify that the backend reports a conflict.
6. Verify that both versions are preserved.

**Scenario 4: Application restart**

1. Create several pending operations.
2. Close the browser.
3. Reopen Fieldmark.
4. Verify that pending operations remain in IndexedDB.
5. Reconnect and synchronize.

**Scenario 5: Interrupted pull**

1. Start downloading a change batch.
2. Simulate application termination before the local transaction commits.
3. Restart the application.
4. Verify that the old cursor is still available.
5. Download and apply the batch again.
6. Verify that no changes are missing or duplicated.

**Scenario 6: User isolation**

1. Authenticate as Inspector A.
2. Create pending offline work.
3. Sign out using the defined unsynchronized-data policy.
4. Authenticate as Inspector B.
5. Verify that Inspector A's local data is not visible or synchronized under Inspector B.

---

## 24. Acceptance Criteria

Offline synchronization is considered complete when:

- [ ] Inspectors can open previously downloaded inspection assignments offline.
- [ ] Inspection answers are saved to IndexedDB before the UI reports them as saved.
- [ ] Local changes survive browser refreshes and restarts.
- [ ] Every required server-bound change has a durable synchronization operation.
- [ ] The queue preserves operation IDs across retries.
- [ ] Push synchronization processes operations idempotently.
- [ ] Every submitted operation receives an explicit outcome.
- [ ] Pull synchronization safely applies server changes.
- [ ] The pull cursor advances only after successful local application.
- [ ] Concurrent updates produce detectable conflicts.
- [ ] Local and server snapshots remain available for conflict resolution.
- [ ] Failed operations can be retried safely.
- [ ] Operation dependencies are respected.
- [ ] User-specific data isolation is enforced.
- [ ] Sync Center displays accurate synchronization states.
- [ ] Foreground synchronization works without Background Sync support.
- [ ] Automated tests cover offline editing, duplicate retries, conflicts, interrupted sync, and user isolation.

---

## 25. Implementation Boundaries

The offline synchronization implementation must remain separated into clear responsibilities.

- React components must not contain synchronization algorithms.
- Dexie database operations must be centralized.
- Queue creation must be handled by application services.
- Push and pull logic must remain separate.
- Conflict resolution must be explicit.
- Retry logic must be centralized.
- API contracts must follow `docs/api-contracts.md`.
- Database behavior must follow `docs/database-design.md`.
- Product behavior must follow `docs/PRD.md`.

Do not implement synchronization as a collection of unrelated API calls inside React components.

The sync engine must be independently testable.

---

## 26. Final Design Decision

Fieldmark will use an offline-first architecture with:

- React and TypeScript for the frontend.
- Dexie.js and IndexedDB for durable local persistence.
- A durable operation queue for pending changes.
- FastAPI for server-side push and pull synchronization.
- PostgreSQL for authoritative server records.
- Idempotency keys and payload hashes for safe retries.
- Version-based concurrency checks.
- Explicit conflict resolution.
- Snapshot-safe change-feed cursors.
- Foreground synchronization as the baseline.
- Background Sync as an optional enhancement.

The most important requirement is that an inspector must never lose completed inspection work simply because the internet connection disappears.

**Local persistence, durable queuing, safe synchronization, and explicit conflict handling are mandatory parts of Fieldmark—not optional enhancements.**