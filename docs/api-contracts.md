

# Fieldmark — API Contracts

## 1. Document Purpose

This document defines the REST API contracts for **Fieldmark**, an offline-capable field inspection application.

It is the communication contract between:

- React + TypeScript frontend.
- FastAPI backend.
- PostgreSQL database.
- IndexedDB-based offline synchronization system.

It defines:

- API conventions.
- Authentication endpoints.
- User management endpoints.
- Site management endpoints.
- Checklist template endpoints.
- Inspection endpoints.
- Inspection submission endpoints.
- Device registration endpoints.
- Synchronization push and pull endpoints.
- Conflict resolution endpoints.
- Request and response formats.
- Error handling.
- Authorization requirements.

The frontend and backend must follow these contracts consistently.

---

# 2. API Base Configuration

## 2.1 API Version

All API endpoints must use the versioned prefix:

```text
/api/v1
```

Example:

```text
https://api.example.com/api/v1/auth/login
```

The actual production domain will be configured during deployment.

## 2.2 Content Type

JSON requests must use:

```http
Content-Type: application/json
```

JSON responses must use:

```http
Content-Type: application/json
```

File upload endpoints, if introduced in a future phase, may use `multipart/form-data`.

## 2.3 API Naming Conventions

- Use lowercase resource names.
- Use plural resource names where appropriate.
- Use HTTP methods according to REST conventions.
- Use UUID identifiers.
- Use `snake_case` for JSON property names.
- Use UTC timestamps in ISO 8601 format.
- Return consistent error structures.

Example:

```http
GET /api/v1/inspections
GET /api/v1/inspections/{inspection_id}
POST /api/v1/inspections
PATCH /api/v1/inspections/{inspection_id}
```

---

# 3. Authentication and Authorization

## 3.1 Authentication Method

Fieldmark uses:

- JWT access tokens.
- Refresh tokens.
- Secure refresh-token handling.
- Role-based access control.

The initial roles are:

```text
ADMIN
INSPECTOR
```

## 3.2 Access Token

Authenticated API requests must include:

```http
Authorization: Bearer <access_token>
```

Access tokens should be short-lived.

The backend must validate:

- Token signature.
- Expiration.
- Issuer and audience where configured.
- User identity.
- Current user account status.
- Relevant authorization permissions.

## 3.3 Refresh Token

Use an HTTP-only, Secure, appropriately configured SameSite cookie for refresh-token delivery where supported by the deployment architecture.

The refresh token must not be exposed unnecessarily to JavaScript.

For cookie-based refresh:

- Configure credentialed requests in the frontend API client.
- Configure the backend's CORS allowed origins explicitly.
- Enable credentials only for trusted origins.
- Protect the refresh endpoint against cross-site request forgery using an appropriate SameSite and CSRF strategy.
- Rotate refresh tokens.
- Store only token hashes in PostgreSQL.

The refresh-token transport must be consistent across development and production environments.

---

# 4. Standard Response Formats

## 4.1 Successful Single Resource Response

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Example Resource"
  }
}
```

## 4.2 Successful Collection Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Example Resource"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## 4.3 Successful Action Response

```json
{
  "message": "Operation completed successfully."
}
```

## 4.4 Error Response

All API errors must follow a consistent structure.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The supplied data is invalid.",
    "details": [
      {
        "field": "email",
        "message": "Enter a valid email address."
      }
    ],
    "request_id": "request-correlation-id"
  }
}
```

### Error Fields

| Field | Description |
|---|---|
| `code` | Stable machine-readable error code |
| `message` | Human-readable error message |
| `details` | Optional field-level or operation-level details |
| `request_id` | Identifier for troubleshooting |

Do not expose stack traces, SQL errors, secrets, or internal implementation details.

---

# 5. HTTP Status Codes

Use the following status codes consistently.

| Status | Meaning |
|---|---|
| `200 OK` | Successful request |
| `201 Created` | Resource created |
| `202 Accepted` | Operation accepted for asynchronous processing |
| `204 No Content` | Successful request without response body |
| `400 Bad Request` | Invalid request structure |
| `401 Unauthorized` | Authentication missing or invalid |
| `403 Forbidden` | User lacks permission |
| `404 Not Found` | Resource not found or not accessible |
| `409 Conflict` | Resource state or version conflict |
| `422 Unprocessable Entity` | Validation or business-rule failure |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected backend error |
| `503 Service Unavailable` | Temporary service unavailability |

Use `409 Conflict` for optimistic concurrency failures and idempotency-key reuse with a different payload.

The exact response body must still follow the standard error structure.

---

# 6. Authentication APIs

## 6.1 Login

**Endpoint**

```http
POST /api/v1/auth/login
```

**Access:** Public.

### Request

```json
{
  "email": "inspector@example.com",
  "password": "user-password"
}
```

### Successful Response

```json
{
  "data": {
    "access_token": "jwt-access-token",
    "token_type": "bearer",
    "expires_in": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "John Inspector",
      "email": "inspector@example.com",
      "role": "INSPECTOR"
    }
  }
}
```

The refresh token must be delivered through the configured secure cookie, not included in the JSON response.

### Rules

- Validate email and password.
- Reject inactive users.
- Return a generic authentication error for invalid credentials.
- Apply rate limiting.
- Record the refresh-token session securely.
- Register or associate the device through the device-registration workflow.

---

## 6.2 Refresh Access Token

**Endpoint**

```http
POST /api/v1/auth/refresh
```

**Access:** Valid refresh-token cookie.

### Request

No JSON request body is required when the refresh token is transported through a cookie.

### Successful Response

```json
{
  "data": {
    "access_token": "new-jwt-access-token",
    "token_type": "bearer",
    "expires_in": 900
  }
}
```

The backend must rotate the refresh token and set the replacement cookie.

### Rules

- Validate the refresh token.
- Verify that the session is active.
- Reject revoked or expired tokens.
- Rotate the refresh token.
- Detect refresh-token reuse where supported.
- Revoke compromised sessions according to the security policy.

---

## 6.3 Get Current User

**Endpoint**

```http
GET /api/v1/auth/me
```

**Access:** Authenticated user.

### Successful Response

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "John Inspector",
    "email": "inspector@example.com",
    "role": "INSPECTOR",
    "is_active": true
  }
}
```

The frontend uses this endpoint to restore and validate the online user session.

---

## 6.4 Logout

**Endpoint**

```http
POST /api/v1/auth/logout
```

**Access:** Authenticated session.

### Request

```json
{
  "logout_all_devices": false
}
```

### Successful Response

```json
{
  "message": "Logged out successfully."
}
```

### Rules

- Revoke the current refresh-token session.
- Clear the refresh-token cookie.
- If `logout_all_devices` is true, revoke all of the user's active refresh-token sessions, subject to authorization and policy.
- Do not assume server-side logout automatically deletes local offline data.
- Local unsynchronized data must be protected according to the logout policy defined in `offline-sync-design.md`.

---

## 6.5 Public Inspector Signup

**Endpoint**

```http
POST /api/v1/auth/signup
```

**Access:** Public.

### Request

```json
{
  "full_name": "Sam Inspector",
  "email": "sam.inspector@example.com",
  "password": "inspector-password"
}
```

The request does not accept a `role` field. Public signup always creates an active `INSPECTOR` account. `ADMIN` accounts must be created through the ADMIN-only user-management endpoint.

### Successful Response

`201 Created`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Sam Inspector",
    "email": "sam.inspector@example.com",
    "role": "INSPECTOR",
    "is_active": true
  }
}
```

### Rules

- Validate full name, email, and password using the documented password policy.
- Normalize the email address to lowercase.
- Reject duplicate email addresses with `409 Conflict`.
- Apply signup rate limiting independently from login rate limiting.
- Never return a password hash or a session token from this endpoint.
- The client must use `POST /api/v1/auth/login` after successful signup to establish a session.
- A newly registered inspector has no inspection assignments until an administrator assigns work.

---

# 7. User Management APIs

All user-management endpoints require `ADMIN` permissions unless explicitly stated otherwise.

## 7.1 Create User

```http
POST /api/v1/users
```

**Access:** ADMIN.

### Request

```json
{
  "full_name": "Jane Inspector",
  "email": "jane@example.com",
  "password": "temporary-password",
  "role": "INSPECTOR"
}
```

### Response

`201 Created`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Jane Inspector",
    "email": "jane@example.com",
    "role": "INSPECTOR",
    "is_active": true
  }
}
```

Never return password hashes.

## 7.2 List Users

```http
GET /api/v1/users?page=1&page_size=20&search=jane
```

**Access:** ADMIN.

### Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "Jane Inspector",
      "email": "jane@example.com",
      "role": "INSPECTOR",
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## 7.3 Get User

```http
GET /api/v1/users/{user_id}
```

**Access:** ADMIN.

## 7.4 Update User

```http
PATCH /api/v1/users/{user_id}
```

**Access:** ADMIN.

### Request

```json
{
  "full_name": "Jane Updated",
  "role": "INSPECTOR",
  "is_active": true
}
```

All fields are optional, but at least one valid field must be supplied.

## 7.5 Deactivate User

```http
PATCH /api/v1/users/{user_id}/status
```

**Access:** ADMIN.

### Request

```json
{
  "is_active": false
}
```

Use deactivation instead of physically deleting users who have historical records.

The backend must revoke sessions and prevent further synchronization when a user is deactivated.

---

# 8. Site Management APIs

All site-management endpoints require `ADMIN` permissions.

## 8.1 Create Site

```http
POST /api/v1/sites
```

### Request

```json
{
  "name": "Hyderabad Inspection Center",
  "site_code": "HYD-001",
  "address": "Example Industrial Area",
  "city": "Hyderabad",
  "state": "Telangana",
  "postal_code": "500001",
  "country": "India",
  "description": "Main inspection facility"
}
```

### Response

`201 Created`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Hyderabad Inspection Center",
    "site_code": "HYD-001",
    "address": "Example Industrial Area",
    "city": "Hyderabad",
    "state": "Telangana",
    "is_active": true,
    "version": 1
  }
}
```

## 8.2 List Sites

```http
GET /api/v1/sites?page=1&page_size=20&is_active=true
```

**Access:** ADMIN and authorized INSPECTOR users.

Inspectors must only receive sites they are permitted to access.

## 8.3 Get Site

```http
GET /api/v1/sites/{site_id}
```

**Access:** ADMIN and authorized INSPECTOR users.

## 8.4 Update Site

```http
PATCH /api/v1/sites/{site_id}
```

**Access:** ADMIN.

### Request

```json
{
  "name": "Updated Inspection Center",
  "description": "Updated site description",
  "version": 1
}
```

The submitted version is used for optimistic concurrency validation.

## 8.5 Deactivate Site

```http
PATCH /api/v1/sites/{site_id}/status
```

### Request

```json
{
  "is_active": false,
  "version": 2
}
```

Historical inspection records must remain accessible.

---

# 9. Checklist Template APIs

All template-management endpoints require `ADMIN` permissions unless stated otherwise.

## 9.1 Create Template

```http
POST /api/v1/checklist-templates
```

### Request

```json
{
  "name": "Safety Inspection",
  "description": "General workplace safety checklist",
  "items": [
    {
      "question": "Is the emergency exit accessible?",
      "description": "Check that no objects block the exit.",
      "response_type": "YES_NO",
      "is_required": true,
      "display_order": 1
    },
    {
      "question": "Describe any visible safety issue.",
      "response_type": "TEXT",
      "is_required": false,
      "display_order": 2
    }
  ]
}
```

### Response

`201 Created`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Safety Inspection",
    "template_version": 1,
    "is_active": true,
    "items": [
      {
        "id": "650e8400-e29b-41d4-a716-446655440000",
        "question": "Is the emergency exit accessible?",
        "response_type": "YES_NO",
        "is_required": true,
        "display_order": 1
      }
    ]
  }
}
```

## 9.2 List Templates

```http
GET /api/v1/checklist-templates?page=1&page_size=20
```

**Access:** ADMIN and authorized INSPECTOR users.

## 9.3 Get Template

```http
GET /api/v1/checklist-templates/{template_id}
```

**Access:** ADMIN and authorized INSPECTOR users.

The endpoint should support retrieving a specific template revision.

Example:

```http
GET /api/v1/checklist-templates/{template_id}?template_version=1
```

## 9.4 Create Template Revision

```http
POST /api/v1/checklist-templates/{template_id}/revisions
```

**Access:** ADMIN.

### Request

```json
{
  "name": "Safety Inspection",
  "description": "Updated safety checklist",
  "items": [
    {
      "question": "Is the emergency exit accessible?",
      "response_type": "YES_NO",
      "is_required": true,
      "display_order": 1
    }
  ]
}
```

The backend creates a new immutable revision.

Existing inspections must continue referencing their originally assigned revision.

## 9.5 Deactivate Template

```http
PATCH /api/v1/checklist-templates/{template_id}/status
```

### Request

```json
{
  "is_active": false
}
```

Deactivation must not invalidate existing inspection assignments.

---

# 10. Inspection Assignment APIs

## 10.1 Create Inspection Assignment

```http
POST /api/v1/inspections
```

**Access:** ADMIN.

### Request

```json
{
  "site_id": "550e8400-e29b-41d4-a716-446655440000",
  "template_id": "650e8400-e29b-41d4-a716-446655440000",
  "template_version": 1,
  "assigned_to": "750e8400-e29b-41d4-a716-446655440000",
  "title": "Monthly Safety Inspection",
  "instructions": "Inspect all assigned safety items.",
  "scheduled_at": "2026-12-01T09:00:00Z",
  "due_at": "2026-12-01T17:00:00Z"
}
```

### Response

`201 Created`

```json
{
  "data": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "site_id": "550e8400-e29b-41d4-a716-446655440000",
    "template_id": "650e8400-e29b-41d4-a716-446655440000",
    "template_version": 1,
    "assigned_to": "750e8400-e29b-41d4-a716-446655440000",
    "title": "Monthly Safety Inspection",
    "status": "ASSIGNED",
    "version": 1
  }
}
```

## 10.2 List Inspections

```http
GET /api/v1/inspections?page=1&page_size=20&status=ASSIGNED
```

**Access:** ADMIN and INSPECTOR.

### Authorization Rules

- Administrators can access inspections according to administrative permissions.
- Inspectors can only access their own authorized assignments.
- The backend must enforce this filtering even if the frontend supplies additional filters.

## 10.3 Get Inspection

```http
GET /api/v1/inspections/{inspection_id}
```

**Access:** Authorized ADMIN or assigned INSPECTOR.

The response should include:

- Inspection information.
- Site information.
- Assigned template revision.
- Checklist items.
- Current answers.
- Current version.
- Current lifecycle status.

## 10.4 Update Inspection Assignment

```http
PATCH /api/v1/inspections/{inspection_id}
```

**Access:** ADMIN, subject to lifecycle restrictions.

### Request

```json
{
  "title": "Updated Monthly Safety Inspection",
  "due_at": "2026-12-02T17:00:00Z",
  "version": 1
}
```

The backend must validate the submitted version.

## 10.5 Start Inspection

```http
POST /api/v1/inspections/{inspection_id}/start
```

**Access:** Assigned INSPECTOR or authorized ADMIN.

### Request

```json
{
  "version": 1
}
```

### Response

```json
{
  "data": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "status": "IN_PROGRESS",
    "version": 2
  }
}
```

---

# 11. Inspection Answer APIs

## 11.1 Save Inspection Answer

```http
PUT /api/v1/inspections/{inspection_id}/answers/{checklist_item_id}
```

**Access:** Assigned inspector or authorized administrator, subject to inspection state.

### Request

```json
{
  "answer_value": true,
  "notes": "Emergency exit is clear.",
  "base_version": 1
}
```

### Response

```json
{
  "data": {
    "id": "950e8400-e29b-41d4-a716-446655440000",
    "inspection_id": "850e8400-e29b-41d4-a716-446655440000",
    "checklist_item_id": "650e8400-e29b-41d4-a716-446655440000",
    "answer_value": true,
    "notes": "Emergency exit is clear.",
    "version": 2
  }
}
```

### Rules

- The item must belong to the inspection's assigned template revision.
- The answer type must match the checklist response type.
- The backend must check the inspection's editable state.
- The backend must validate `base_version`.
- The operation must not overwrite a newer server-side answer.

## 11.2 Get Inspection Answers

```http
GET /api/v1/inspections/{inspection_id}/answers
```

**Access:** Authorized users.

### Response

```json
{
  "data": [
    {
      "id": "950e8400-e29b-41d4-a716-446655440000",
      "checklist_item_id": "650e8400-e29b-41d4-a716-446655440000",
      "answer_value": true,
      "notes": "Emergency exit is clear.",
      "version": 2
    }
  ]
}
```

---

# 12. Inspection Submission API

## 12.1 Submit Inspection

```http
POST /api/v1/inspections/{inspection_id}/submit
```

**Access:** Assigned INSPECTOR or authorized ADMIN.

### Request

```json
{
  "summary": "All required safety checks completed.",
  "overall_status": "PASS",
  "version": 3,
  "submission_id": "7d9f4f0e-5f60-4f4e-aad4-8f9f1b6e6b11"
}
```

`submission_id` is a client-generated stable UUID used to make the submission idempotent.

### Successful Response

`201 Created`

```json
{
  "data": {
    "result_id": "a50e8400-e29b-41d4-a716-446655440000",
    "inspection_id": "850e8400-e29b-41d4-a716-446655440000",
    "submission_number": 1,
    "overall_status": "PASS",
    "submitted_at": "2026-12-01T12:00:00Z",
    "inspection_status": "SUBMITTED"
  }
}
```

### Rules

- Required answers must be present.
- All answer types must be valid.
- The inspection must be in a submittable state.
- The submitted version must be validated.
- A duplicate `submission_id` must not create a second submission.
- A duplicate `submission_id` with a different summary, overall status, or version must be rejected.
- Submission and corresponding status changes must be committed atomically.
- The submission result must preserve the submitted snapshot.

### Offline Submission

Offline submission must first be stored locally as a pending operation.

The UI may display:

```text
Saved locally — Waiting to sync
```

It must not display:

```text
Successfully submitted to server
```

until the server acknowledges the submission.

---

# 13. Dashboard APIs

## 13.1 Get Dashboard Summary

```http
GET /api/v1/dashboard/summary
```

**Access:** ADMIN and INSPECTOR.

The backend must calculate results according to the current user's permissions.

### Example Response

```json
{
  "data": {
    "total_inspections": 100,
    "assigned_inspections": 20,
    "in_progress_inspections": 15,
    "submitted_inspections": 55,
    "reviewed_inspections": 10
  }
}
```

Administrators may receive organization-wide summaries.

Inspectors must receive summaries limited to their authorized inspection assignments.

---

# 14. Device Registration APIs

The device endpoints are canonical at `/api/v1/devices`. The equivalent `/api/v1/sync/devices` paths are registered as aliases so both this contract and the phase implementation list are satisfied. Both path sets share the same handlers and authorization rules.

## 14.1 Register Device

```http
POST /api/v1/devices
```

**Access:** Authenticated user.

### Request

```json
{
  "device_name": "Office Laptop",
  "device_fingerprint": "installation-generated-identifier"
}
```

### Response

`201 Created`

```json
{
  "data": {
    "id": "b50e8400-e29b-41d4-a716-446655440000",
    "device_name": "Office Laptop",
    "is_active": true
  }
}
```

The device identifier is subsequently used by synchronization operations.

It must never be treated as a substitute for a valid access token.

## 14.2 List My Devices

```http
GET /api/v1/devices
```

**Access:** Authenticated user.

Return only the current user's devices unless an administrator has an explicit administrative device-management permission.

## 14.3 Revoke Device

```http
POST /api/v1/devices/{device_id}/revoke
```

**Access:** Device owner or authorized administrator.

### Response

```json
{
  "message": "Device revoked successfully."
}
```

A revoked device cannot continue synchronization.

---

# 15. Synchronization APIs

Synchronization is a core Fieldmark feature.

It requires carefully defined request identity, ordering, authorization, idempotency, and cursor semantics.

## 15.1 Synchronization Push

**Endpoint**

```http
POST /api/v1/sync/push
```

**Access:** Authenticated user and registered active device.

### Request

```json
{
  "device_id": "b50e8400-e29b-41d4-a716-446655440000",
  "operations": [
    {
      "operation_id": "7d9f4f0e-5f60-4f4e-aad4-8f9f1b6e6b11",
      "operation_type": "UPDATE",
      "entity_type": "inspection_answer",
      "entity_id": "950e8400-e29b-41d4-a716-446655440000",
      "base_version": 1,
      "payload": {
        "inspection_id": "850e8400-e29b-41d4-a716-446655440000",
        "checklist_item_id": "650e8400-e29b-41d4-a716-446655440000",
        "answer_value": true,
        "notes": "Emergency exit is clear."
      }
    }
  ]
}
```

### Operation Fields

| Field | Description |
|---|---|
| `operation_id` | Stable client-generated UUID |
| `operation_type` | CREATE, UPDATE, DELETE, SUBMIT |
| `entity_type` | Target resource type |
| `entity_id` | Target resource identifier |
| `base_version` | Version on which the change was based |
| `payload` | Operation data |

The backend computes a canonical SHA-256 payload identity from `operation_id`, `operation_type`, `entity_type`, `entity_id`, `base_version`, and `payload`. Canonical JSON uses sorted keys, compact separators, UTF-8 text, and no non-finite numbers. Clients must not submit a `payload_hash`; unknown operation fields are rejected.

For a new local record, `base_version` may be null if the operation type and resource creation policy permit it.

### Successful Response

```json
{
  "data": {
    "results": [
      {
        "operation_id": "7d9f4f0e-5f60-4f4e-aad4-8f9f1b6e6b11",
        "status": "ACCEPTED",
        "entity_id": "950e8400-e29b-41d4-a716-446655440000",
        "server_version": 2
      }
    ]
  }
}
```

### Conflict Response Within Batch

A conflict should be returned as an operation-level result so other independent operations in the batch can be processed.

```json
{
  "data": {
    "results": [
      {
        "operation_id": "7d9f4f0e-5f60-4f4e-aad4-8f9f1b6e6b11",
        "status": "CONFLICT",
        "entity_id": "950e8400-e29b-41d4-a716-446655440000",
        "base_version": 1,
        "server_version": 2,
        "message": "The record has changed on the server."
      }
    ]
  }
}
```

### Rejected Operation

```json
{
  "operation_id": "7d9f4f0e-5f60-4f4e-aad4-8f9f1b6e6b11",
  "status": "REJECTED",
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You are not permitted to update this inspection."
  }
}
```

### Push Rules

1. The authenticated user must own or be authorized to use the registered device.
2. Every operation must have a stable operation ID.
3. Retrying must reuse the same operation ID and identical logical payload.
4. The backend must verify payload identity.
5. Operations affecting the same entity must preserve dependency order.
6. Independent operations may be processed separately.
7. The server must validate record versions.
8. Conflicts must be recorded.
9. Accepted operations must be acknowledged only after durable commit.
10. The backend must enforce batch-size limits.
11. One invalid operation must not accidentally roll back unrelated independent operations unless the batch contract explicitly requires atomic processing.
12. The response must provide a result for every operation received.

Operation-level `status` values are `ACCEPTED`, `CONFLICT`, `REJECTED`, and
`RETRYABLE_ERROR`. `RETRYABLE_ERROR` indicates a temporary server-side failure;
the client must retry with the same `operation_id` and identical payload. The
backend does not finalize a temporary failure in the idempotency ledger, so the
retry is processed normally.
Authorization failures inside a batch use the operation error code
`PERMISSION_DENIED`. Each operation is committed in its own savepoint, so a
failed operation does not roll back unrelated operations in the same batch.

---

## 15.2 Synchronization Pull

**Endpoint**

```http
GET /api/v1/sync/pull
```

**Access:** Authenticated user and registered active device.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `device_id` | UUID | Yes | Registered device |
| `cursor` | String | No | Last successfully applied cursor |
| `limit` | Integer | No | Maximum number of events |

Example:

```http
GET /api/v1/sync/pull?device_id=b50e8400-e29b-41d4-a716-446655440000&cursor=opaque-cursor-value&limit=100
```

### Successful Response

```json
{
  "data": {
    "changes": [
      {
        "change_id": "c50e8400-e29b-41d4-a716-446655440000",
        "entity_type": "inspection",
        "entity_id": "850e8400-e29b-41d4-a716-446655440000",
        "change_type": "UPDATE",
        "entity_version": 2,
        "payload": {
          "status": "IN_PROGRESS",
          "version": 2
        }
      }
    ],
    "next_cursor": "next-opaque-cursor",
    "has_more": false
  }
}
```

### Pull Rules

- The cursor must be treated as an opaque value by the frontend.
- The server must enforce authorization for every returned change.
- The cursor must represent a safe, consistent position in the change feed.
- The frontend must not generate or modify the cursor.
- The frontend must apply returned changes to IndexedDB before saving `next_cursor`.
- If local application fails, the previous cursor must remain unchanged.
- The server must support pagination without skipping committed changes.
- Deletions must be represented by tombstones.

The cursor may encode internal ordering information, but its structure is an implementation detail.

---

## 15.3 Get Synchronization Status

```http
GET /api/v1/sync/status?device_id=b50e8400-e29b-41d4-a716-446655440000
```

**Access:** Authenticated user and registered active device.

### Response

```json
{
  "data": {
    "device_id": "b50e8400-e29b-41d4-a716-446655440000",
    "is_active": true,
    "last_seen_at": "2026-12-01T12:00:00Z",
    "open_conflicts": 2
  }
}
```

The server cannot know about all unsynchronized local operations because those may never have reached it. The frontend must combine this response with its IndexedDB queue to display a complete synchronization summary.

---

# 16. Conflict Management APIs

## 16.1 List Conflicts

```http
GET /api/v1/sync/conflicts?page=1&page_size=20&status=OPEN
```

**Access:** Authorized user.

Inspectors may see conflicts associated with their own authorized operations.

Administrators may see conflicts according to their administrative permissions.

### Response

```json
{
  "data": [
    {
      "id": "d50e8400-e29b-41d4-a716-446655440000",
      "operation_id": "c50e8400-e29b-41d4-a716-446655440000",
      "entity_type": "inspection_answer",
      "entity_id": "950e8400-e29b-41d4-a716-446655440000",
      "base_version": 1,
      "server_version": 2,
      "status": "OPEN",
      "resolution_type": null,
      "resolved_by": null,
      "resolved_at": null,
      "created_at": "2026-12-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## 16.2 Get Conflict Details

```http
GET /api/v1/sync/conflicts/{conflict_id}
```

**Access:** Authorized user.

### Response

```json
{
  "data": {
    "id": "d50e8400-e29b-41d4-a716-446655440000",
    "operation_id": "c50e8400-e29b-41d4-a716-446655440000",
    "entity_type": "inspection_answer",
    "entity_id": "950e8400-e29b-41d4-a716-446655440000",
    "base_version": 1,
    "server_version": 2,
    "local_payload": {
      "answer_value": false,
      "notes": "Local observation"
    },
    "server_payload": {
      "answer_value": true,
      "notes": "Server observation"
    },
    "status": "OPEN",
    "resolution_type": null,
    "resolved_by": null,
    "resolved_at": null
  }
}
```

Sensitive data must be filtered according to authorization rules.

Conflict responses include the originating client `operation_id` so a device can correlate a server conflict with its local queue record. `resolution_type`, `resolved_by`, and `resolved_at` are audit metadata and are `null` while the conflict is open.

## 16.3 Resolve Conflict

```http
POST /api/v1/sync/conflicts/{conflict_id}/resolve
```

**Access:** Authorized user, subject to conflict type and available resolution options.

### Request

```json
{
  "resolution_type": "KEEP_SERVER",
  "expected_server_version": 2
}
```

Other possible resolution types:

- `KEEP_LOCAL`
- `MANUAL_MERGE`
- `ADMIN_RESOLUTION`

### Successful Response

```json
{
  "data": {
    "conflict_id": "d50e8400-e29b-41d4-a716-446655440000",
    "status": "RESOLVED",
    "resolution_type": "KEEP_SERVER",
    "resolved_at": "2026-12-01T12:30:00Z"
  }
}
```

### Rules

- The server must verify the user's permissions.
- The server must revalidate the current entity version.
- Resolution must be auditable.
- A stale resolution attempt must be rejected.
- The client must update its local record only after receiving an authoritative resolution response.

---

# 17. Health Check APIs

## 17.1 Basic Health

```http
GET /health
```

**Access:** Public or restricted according to hosting requirements.

### Response

```json
{
  "status": "healthy"
}
```

## 17.2 Readiness

```http
GET /health/ready
```

Checks whether required dependencies, including PostgreSQL, are available.

### Response

```json
{
  "status": "ready",
  "database": "connected"
}
```

Do not expose database credentials, connection strings, or internal infrastructure details.

---

# 18. Pagination, Filtering, and Sorting

Collection endpoints should support consistent pagination.

Example:

```http
GET /api/v1/inspections?page=1&page_size=20&status=ASSIGNED
```

### Standard Parameters

| Parameter | Description |
|---|---|
| `page` | Page number, starting at 1 |
| `page_size` | Maximum records per page |
| `search` | Optional search text |
| `status` | Optional status filter |
| `sort_by` | Allowed sort field |
| `sort_order` | `asc` or `desc` |

### Rules

- Enforce a maximum page size.
- Validate sort fields against an allowlist.
- Never concatenate user-supplied SQL fragments.
- Apply authorization filtering before returning records.
- Use cursor pagination where appropriate for large change feeds.

---

# 19. API Authorization Matrix

| API Group | ADMIN | INSPECTOR |
|---|---:|---:|
| Login | Yes | Yes |
| Refresh token | Yes | Yes |
| Current user | Yes | Yes |
| Logout | Yes | Yes |
| User management | Yes | No |
| Site management | Yes | No |
| View authorized sites | Yes | Yes |
| Checklist template management | Yes | No |
| View assigned templates | Yes | Yes |
| Create inspection assignment | Yes | No |
| View authorized inspections | Yes | Yes |
| Update inspection assignment | Yes | No |
| Save inspection answers | As permitted | Own assignments |
| Submit inspection | As permitted | Own assignments |
| Dashboard | Administrative view | Own assignments |
| Device registration | Yes | Yes |
| Device management | Authorized | Own devices |
| Synchronization push | Authorized | Own operations |
| Synchronization pull | Authorized | Authorized data |
| Conflict management | Authorized | Own authorized conflicts |

The backend must enforce this matrix at the service or authorization layer. Hiding frontend buttons is not sufficient security.

---

# 20. API Validation Rules

All incoming requests must be validated using Pydantic models.

### General Validation

- UUID fields must contain valid UUIDs.
- Required fields must be present.
- Strings must respect maximum lengths.
- Email addresses must be valid and normalized.
- Enum fields must contain supported values.
- Timestamps must include timezone information.
- Pagination values must be within configured limits.

### Inspection Validation

- Site must exist and be active when creating an assignment.
- Assigned user must exist, be active, and have the INSPECTOR role.
- Template revision must exist and be available.
- Checklist answers must belong to the assigned template revision.
- Required answers must be supplied before submission.
- Inspection status transitions must be valid.

### Synchronization Validation

- Device must be registered and active.
- Device must belong to the authenticated user.
- Operation ID must be valid.
- Operation type must be supported.
- Payload must match the entity type.
- Entity ownership and permissions must be verified.
- Base version must be validated.
- Reused operation IDs must have matching request hashes.

---

# 21. Frontend API Client Requirements

The frontend should have one centralized API client.

Suggested responsibilities:

- Configure the base API URL.
- Attach access tokens.
- Include credentials when refreshing through cookies.
- Handle expired access tokens.
- Coordinate token refresh.
- Prevent multiple simultaneous refresh requests.
- Normalize API errors.
- Apply request timeouts.
- Support cancellation when requests are no longer needed.

Example structure:

```text
src/
└── services/
    └── api/
        ├── client.ts
        ├── auth.api.ts
        ├── users.api.ts
        ├── sites.api.ts
        ├── templates.api.ts
        ├── inspections.api.ts
        ├── sync.api.ts
        └── conflicts.api.ts
```

### Important Offline Rule

Do not let a failed network request erase local data.

If a request fails because the browser is offline:

1. Preserve the locally saved record.
2. Preserve its pending operation.
3. Update the synchronization status.
4. Retry according to the retry policy.

The API client must not become the owner of local persistence.

---

# 22. FastAPI Project Organization

Suggested backend structure:

```text
backend/
└── app/
    ├── api/
    │   └── v1/
    │       ├── auth.py
    │       ├── users.py
    │       ├── sites.py
    │       ├── templates.py
    │       ├── inspections.py
    │       ├── dashboard.py
    │       ├── devices.py
    │       ├── sync.py
    │       └── conflicts.py
    │
    ├── core/
    │   ├── config.py
    │   ├── security.py
    │   └── permissions.py
    │
    ├── schemas/
    │   ├── auth.py
    │   ├── user.py
    │   ├── site.py
    │   ├── template.py
    │   ├── inspection.py
    │   ├── sync.py
    │   └── conflict.py
    │
    ├── services/
    │   ├── auth_service.py
    │   ├── user_service.py
    │   ├── site_service.py
    │   ├── template_service.py
    │   ├── inspection_service.py
    │   ├── sync_service.py
    │   └── conflict_service.py
    │
    ├── models/
    ├── repositories/
    ├── db/
    └── main.py
```

The actual implementation may refine this structure, but API contracts must remain consistent.

---

# 23. API Testing Requirements

Every endpoint must have tests for:

### Success Cases

- Correct request.
- Correct response structure.
- Correct status code.
- Correct database changes.

### Validation Cases

- Missing required fields.
- Invalid UUID.
- Invalid enum.
- Invalid email.
- Unsupported status transition.
- Invalid answer type.

### Authentication Cases

- Missing access token.
- Invalid access token.
- Expired access token.
- Revoked refresh token.
- Inactive account.

### Authorization Cases

- Inspector accessing another inspector's assignment.
- Inspector attempting user management.
- Inspector modifying an unauthorized site.
- Unregistered device attempting synchronization.
- Revoked device attempting synchronization.

### Synchronization Cases

- Successful push.
- Successful pull.
- Duplicate operation retry.
- Reused operation ID with a different payload.
- Version conflict.
- Temporary network failure.
- Partial batch failure.
- Pull pagination.
- Cursor preservation after local application failure.
- Concurrent server changes without skipped events.

---

# 24. API Acceptance Criteria

The API implementation is considered complete when:

- All required endpoints are implemented.
- All endpoints use `/api/v1`.
- Authentication is enforced consistently.
- Role-based authorization is enforced on the backend.
- Requests and responses follow the documented schemas.
- Errors follow the standard error structure.
- User and inspection ownership checks work.
- Inspection submissions are idempotent.
- Synchronization operations preserve their identity across retries.
- Push results distinguish accepted, conflicted, and rejected operations.
- Pull results use a safe cursor design.
- Conflict resolution validates permissions and versions.
- API documentation is available through FastAPI OpenAPI/Swagger UI.
- Automated endpoint tests pass.

---

# 25. Related Documentation

| Document | Purpose |
|---|---|
| `PRD.md` | Product requirements |
| `architecture.md` | Overall system architecture |
| `database-design.md` | PostgreSQL schema |
| `offline-sync-design.md` | Offline synchronization details |
| `security-design.md` | Security architecture |
| `frontend-design.md` | Frontend design |
| `development-phases.md` | Development phases |
| `testing-strategy.md` | Testing strategy |
| `../AGENTS.md` | AI coding assistant instructions |

---

**End of API Contracts Document**

