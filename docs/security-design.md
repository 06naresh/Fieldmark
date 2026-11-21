# Security Design

## 1. Purpose

This document defines the security architecture and implementation requirements for Fieldmark.

Fieldmark is an offline-capable inspection management application. It stores inspection information locally and synchronizes it with a central backend.

Because the application handles user accounts, inspection records, and potentially sensitive operational information, security must be implemented across:

- Authentication.
- Authorization.
- API communication.
- Password management.
- JWT management.
- Refresh-token management.
- Database access.
- Offline data storage.
- Synchronization.
- Session management.
- Input validation.
- Audit logging.

Security must be enforced by the backend. Frontend restrictions are additional usability controls, not security boundaries.

---

## 2. Security Objectives

Fieldmark must satisfy the following objectives.

| Objective | Requirement |
|---|---|
| Confidentiality | Prevent unauthorized users from accessing inspection information. |
| Integrity | Prevent unauthorized modification of inspection records. |
| Authentication | Verify the identity of users before granting protected access. |
| Authorization | Restrict actions according to user roles and resource permissions. |
| Availability | Maintain safe application behavior during connectivity failures. |
| Accountability | Record important security and business actions. |
| Session security | Protect access and refresh tokens. |
| Offline security | Isolate locally cached data by user and device. |
| Synchronization security | Validate ownership and authorization for every synchronized operation. |

---

## 3. User Roles and Permissions

Fieldmark initially supports two roles:

- `ADMIN`
- `INSPECTOR`

### 3.1 ADMIN

Administrators can:

- View the administrative dashboard.
- Create and manage users.
- Activate and deactivate users.
- Create and manage inspection sites.
- Create and manage checklist templates.
- Assign inspections.
- View authorized inspection records.
- Review synchronization issues.
- Resolve authorized conflicts.
- Review audit information.

### 3.2 INSPECTOR

Inspectors can:

- View their assigned inspections.
- View authorized site information.
- Download available checklist templates.
- Complete assigned inspections.
- Save inspection answers.
- Work offline with previously downloaded data.
- Submit inspections.
- Synchronize pending changes.
- View their own synchronization status.
- Resolve conflicts when explicitly permitted by the business workflow.

### 3.3 Authorization Matrix

| Feature | ADMIN | INSPECTOR |
|---|---|---|
| Dashboard | Yes | Own-work dashboard |
| Manage users | Yes | No |
| Manage sites | Yes | No |
| Manage templates | Yes | No |
| Assign inspections | Yes | No |
| View all inspections | Authorized scope | No |
| View assigned inspections | Yes | Yes |
| Complete inspection | If permitted | Assigned inspections |
| Submit inspection | If permitted | Assigned inspections |
| Sync own operations | Yes | Yes |
| Resolve conflicts | Authorized scope | Own authorized conflicts |
| View audit logs | Authorized scope | No |

The backend must verify both role and resource ownership.

For example, an inspector must not access another inspector's inspection simply by changing an inspection UUID in an API request.

---

## 4. Authentication Architecture

Fieldmark uses JWT-based authentication.

The authentication system consists of:

1. User login.
2. Access-token issuance.
3. Refresh-token issuance.
4. Protected API requests.
5. Access-token renewal.
6. Logout and refresh-token revocation.

### Authentication flow

```text
          USER
           |
           v
       LOGIN FORM
           |
           v
      FASTAPI BACKEND
           |
           v
    VERIFY USER PASSWORD
           |
      +----+----+
      |         |
    Invalid   Valid
      |         |
      v         v
    Reject   Generate Tokens
                 |
          +------+------+
          |             |
          v             v
      Access Token  Refresh Cookie
          |             |
          v             v
      API Requests   HTTP-only
                     Secure Cookie
```

### Login endpoint

`POST /api/v1/auth/login`

The backend must:

- Validate the submitted credentials.
- Find the user account.
- Verify the password hash.
- Check that the account is active.
- Generate a short-lived access token.
- Generate a refresh token.
- Store only a secure hash of the refresh token.
- Set the refresh token in the configured secure cookie.
- Return the access token and required user information.

Never return password hashes or raw refresh tokens in API response bodies.

---

## 5. Password Security

Passwords must never be stored as plaintext.

Use **Argon2id** for password hashing.

Requirements:

- Hash passwords before database storage.
- Use a maintained password-hashing library.
- Use appropriately configured Argon2id parameters.
- Generate unique salts through the hashing library.
- Never log passwords.
- Never return password hashes through APIs.
- Never store passwords in browser local storage or IndexedDB.
- Validate password requirements during registration and password changes.
- Avoid revealing whether an email address exists during login failure.

The password policy should be configurable and documented.

Password changes must invalidate existing sessions according to the session-revocation policy.

---

## 6. JWT Access Tokens

Access tokens authorize protected API requests.

### Access-token requirements

- Use a short expiration period.
- Sign tokens with a securely managed signing key.
- Validate the signature on every protected request.
- Validate expiration.
- Validate issuer and audience when configured.
- Validate the expected signing algorithm.
- Include the user's stable ID in the subject claim.
- Include only necessary claims.
- Do not include sensitive personal information.
- Do not trust frontend-provided role information.

Example claims:

```json
{
  "sub": "user-uuid",
  "role": "INSPECTOR",
  "type": "access",
  "iss": "fieldmark-api",
  "aud": "fieldmark-client",
  "iat": 1795260000,
  "exp": 1795260900,
  "jti": "token-uuid"
}
```

The values are illustrative. The actual expiration and signing configuration must be established through environment-specific security settings.

### Access-token storage

For the initial web application:

- Keep the access token in application memory where practical.
- Do not persist access tokens in local storage.
- Do not persist access tokens in IndexedDB.
- Use HTTPS for production API communication.

A page refresh may require obtaining a new access token through the refresh-token mechanism.

---

## 7. Refresh Tokens

Refresh tokens allow users to obtain new access tokens without repeatedly entering their passwords.

For the initial web application, use an HTTP-only cookie-based refresh-token strategy.

### Cookie requirements

Production refresh-token cookies should use:

- `HttpOnly`.
- `Secure`.
- An appropriate `SameSite` policy.
- A restricted path where practical.
- A bounded expiration period.

Cookie configuration must match the deployment architecture.

If the frontend and backend are on different origins, configure CORS and credential handling carefully.

### Refresh-token lifecycle

1. User logs in.
2. Backend generates a refresh token.
3. Backend stores a secure hash of the token.
4. Backend sets the raw token in an HTTP-only cookie.
5. Client requests a new access token when necessary.
6. Backend validates the refresh token.
7. Backend rotates the refresh token.
8. Backend stores the new token hash.
9. Backend invalidates the previous token.
10. Logout revokes the active refresh session.

### Refresh-token database fields

The `refresh_tokens` table should support:

- Token record ID.
- User ID.
- Token hash.
- Token family or session identifier.
- Expiration timestamp.
- Creation timestamp.
- Revocation timestamp.
- Last-used timestamp.
- Device/session metadata where appropriate.

Never store raw refresh tokens in PostgreSQL.

### Refresh-token reuse detection

If an already rotated or revoked token is presented again, the backend must treat it as a possible token-reuse event.

The configured policy should revoke the affected token family or session and require reauthentication.

---

## 8. CSRF and CORS Protection

Because refresh tokens are carried in cookies, cookie-based authentication requires CSRF protection.

### CSRF requirements

- Protect state-changing requests that rely on cookies.
- Use an appropriate CSRF token strategy.
- Validate request origin where appropriate.
- Use an appropriate `SameSite` cookie policy.
- Do not assume that CORS alone prevents CSRF.
- Avoid placing refresh tokens in URLs or request bodies.

The refresh endpoint and logout endpoint must follow the selected CSRF strategy.

### CORS requirements

Production CORS configuration must:

- Allow only trusted frontend origins.
- Enable credentials only where required.
- Avoid wildcard origins when credentials are enabled.
- Restrict allowed methods.
- Restrict allowed headers.
- Be configured separately for development and production.

Example development configuration:

```env
FRONTEND_ORIGINS=http://localhost:5173
```

Production origins must be configured explicitly.

Do not hardcode production secrets or trusted origins into frontend source code.

---

## 9. Role-Based Access Control

Fieldmark must implement backend-enforced Role-Based Access Control (RBAC).

Create reusable authorization dependencies.

Suggested backend structure:

```text
backend/
└── app/
    ├── core/
    │   ├── security.py
    │   ├── permissions.py
    │   ├── config.py
    │   └── exceptions.py
    │
    ├── dependencies/
    │   ├── authentication.py
    │   └── authorization.py
    │
    └── api/
        └── v1/
            └── endpoints/
```

### Example authorization behavior

```python
from fastapi import Depends, HTTPException, status

def require_roles(*allowed_roles):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return current_user

    return role_checker
```

This is an architectural example. The final implementation must use the actual project dependencies and types.

### Authorization requirements

- Check authentication before authorization.
- Check roles for restricted endpoints.
- Check ownership for user-specific resources.
- Check assignment permissions for inspections.
- Check site access before returning site information.
- Check permissions for synchronization operations.
- Check permissions again during conflict resolution.
- Never rely on frontend route protection alone.

Use `401 Unauthorized` for missing or invalid authentication and `403 Forbidden` for authenticated users who lack permission.

---

## 10. Resource-Level Authorization

Role checks alone are insufficient.

The backend must also verify that the user can access the requested resource.

Examples:

**Inspection access**

An inspector may access an inspection only if it is assigned to them or another explicitly authorized business rule permits access.

**Answer modification**

An inspector may modify answers only for an inspection they are authorized to complete and while its business state permits modification.

**Site access**

An inspector may access only sites associated with their authorized assignments.

**Synchronization**

Every operation must be checked against the authenticated user and the resource's ownership and authorization rules.

Do not trust `user_id`, `inspector_id`, or role values supplied in request payloads as proof of authorization.

---

## 11. API Security

Every protected endpoint must enforce authentication, authorization, validation, and safe error handling.

### API requirements

- Use HTTPS in production.
- Validate all request payloads with Pydantic.
- Enforce maximum request sizes.
- Validate UUIDs and enumerated values.
- Restrict pagination limits.
- Use parameterized database queries through the ORM.
- Avoid returning internal exception details.
- Apply rate limiting to sensitive endpoints.
- Apply appropriate timeouts.
- Validate uploaded content if file uploads are introduced later.
- Restrict access to operational endpoints.
- Keep API documentation and debug tools appropriately configured for deployment.

### Sensitive endpoints

Apply additional protection to:

- Login.
- Refresh.
- Logout.
- Password changes.
- User management.
- Token revocation.
- Inspection submission.
- Sync push.
- Conflict resolution.

### Error responses

Do not expose:

- Database connection strings.
- Secret keys.
- Stack traces.
- Password hashes.
- Raw refresh tokens.
- Internal infrastructure information.

Return consistent error responses following `docs/api-contracts.md`.

---

## 12. Offline Security

Offline functionality introduces additional security concerns because inspection data remains on the user's device.

### Local data requirements

- Store only data required for the offline workflow.
- Scope local records to the authenticated user.
- Associate local data with the registered device context.
- Never store plaintext passwords.
- Never store refresh tokens in IndexedDB.
- Apply bounded offline access.
- Clear or isolate account data during account switching.
- Preserve unsynchronized work according to the logout policy.
- Avoid caching unnecessary sensitive API responses.

### IndexedDB security limitations

IndexedDB does not automatically encrypt its contents.

The application must not claim that IndexedDB is secure against:

- A compromised device.
- Malicious scripts executing in the application's origin.
- A browser profile accessible to another local user.
- Developer tools or local device inspection.

For the MVP, apply HTTPS, restrictive Content Security Policy, minimal offline data retention, user/device isolation, and appropriate device security expectations.

If a future requirement mandates encryption of locally stored inspection data, design a separate key-management and recovery strategy. Do not invent a client-side encryption key and store it alongside the encrypted data as if that provided meaningful protection.

---

## 13. Offline Authentication Policy

Fieldmark must support reopening previously downloaded inspection work while offline, but offline access must be bounded.

### Policy

1. The user must successfully authenticate online.
2. The application establishes a device-scoped offline session context.
3. The application records the last successful online authentication time.
4. Offline access is permitted only within the configured offline validity period.
5. The user can access only previously downloaded and authorized data.
6. The user cannot create new server accounts or perform administrative server actions offline.
7. Server-side permission changes take effect when the client reconnects and the backend revalidates authorization.
8. Expired offline access requires online reauthentication.

### Important limitation

The application cannot know immediately that an account has been suspended or a role has changed while the device is disconnected.

Therefore, offline permissions must be treated as a temporary continuation of previously granted access, not as proof of current server authorization.

The offline validity period must be configurable and approved as a product/security decision.

---

## 14. Synchronization Security

The synchronization system must be treated as a protected API surface.

### Push security

For every pushed operation, the backend must:

1. Authenticate the request.
2. Verify the device context.
3. Identify the user from the authenticated session.
4. Validate the operation schema.
5. Verify operation ownership.
6. Verify resource authorization.
7. Verify operation ID and payload hash.
8. Check the base version.
9. Enforce business rules.
10. Persist the operation result safely.

### Pull security

For every pull request, the backend must:

- Authenticate the user.
- Validate the cursor.
- Restrict changes to the user's authorized data.
- Avoid exposing other users' records.
- Validate pagination limits.
- Return only fields required by the client.

A cursor must not grant access to data outside the authenticated user's authorization scope.

### Idempotency

Operation IDs must be scoped and validated consistently.

The same operation ID and same payload hash must return the original result.

The same operation ID with a different payload hash must be rejected.

### Conflict resolution

Conflict resolution must be authenticated, authorized, version-checked, and auditable.

Never allow the client to bypass a conflict by submitting a fabricated server version.

---

## 15. Inspection Data Integrity

Inspection data must preserve its history and integrity.

Requirements:

- Validate inspection state transitions on the backend.
- Prevent unauthorized modification of submitted inspections.
- Record inspection submission time using server time.
- Use version checks for concurrent updates.
- Preserve important original answer values.
- Record conflict-resolution actions.
- Record important administrative changes.
- Do not treat a local `SYNCED` flag as authoritative proof without server acknowledgment.

For submitted inspections, define which fields become immutable and which administrative correction workflows are permitted.

Any permitted correction should be auditable.

---

## 16. Database Security

PostgreSQL must be protected through appropriate database configuration and access controls.

Requirements:

- Use a dedicated application database user.
- Do not use the PostgreSQL superuser for normal application connections.
- Store database credentials in environment configuration or a secret manager.
- Restrict database network access.
- Use TLS where required by the deployment environment.
- Apply database migrations through Alembic.
- Use parameterized ORM queries.
- Apply foreign-key and uniqueness constraints.
- Use transactions for important business operations.
- Back up the database regularly.
- Test restoration procedures.

The application database user should have only the permissions required by the application.

---

## 17. Environment Variables and Secrets

All sensitive configuration must be kept outside source code.

Create:

- `.env.example` for documented variable names and safe placeholders.
- `.env` for local secrets.
- Deployment environment secrets for production.

Example:

```env
APP_ENV=development
APP_NAME=Fieldmark

DATABASE_URL=postgresql+psycopg://fieldmark_user:CHANGE_ME@localhost:5432/field_inspection_db

JWT_SECRET_KEY=CHANGE_ME
JWT_ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

FRONTEND_ORIGINS=http://localhost:5173
```

These values are examples, not finalized security settings.

### Secret-management requirements

- Never commit `.env`.
- Add `.env` to `.gitignore`.
- Never place backend secrets in Vite environment variables.
- Never expose secrets through API responses.
- Rotate secrets when compromise is suspected.
- Use a secret manager or protected deployment configuration in production.
- Use a strong randomly generated signing key.
- Ensure production secrets differ from development secrets.

If asymmetric JWT signing is adopted later, document key distribution and rotation accordingly.

---

## 18. Rate Limiting and Abuse Prevention

Apply rate limiting to reduce brute-force attempts and API abuse.

Sensitive endpoints should have appropriate limits.

Examples:

- Login attempts.
- Refresh requests.
- Password changes.
- User creation.
- Sync push.
- Conflict resolution.

Rate limits must be configurable.

Consider both user and IP-based limits where appropriate.

For multi-worker or multi-instance deployments, use a shared rate-limit store rather than relying exclusively on in-memory counters.

Return HTTP `429 Too Many Requests` with an appropriate retry indication.

---

## 19. Content Security Policy and Browser Security

The frontend must follow secure browser practices.

Requirements:

- Use HTTPS in production.
- Configure a restrictive Content Security Policy.
- Avoid unsafe dynamic HTML insertion.
- Avoid unnecessary third-party scripts.
- Keep dependencies updated.
- Apply secure cookie settings.
- Avoid exposing sensitive information in browser logs.
- Use appropriate security headers.
- Validate data before rendering.
- Avoid placing tokens or sensitive information in URLs.

A service worker must only cache approved application resources and offline data.

It must not accidentally cache authenticated API responses for another user.

---

## 20. Logging and Audit Trail

Fieldmark must record security-relevant and important business events.

Examples:

- Successful login.
- Failed login.
- Logout.
- Refresh-token reuse detection.
- Account activation/deactivation.
- Role changes.
- Inspection assignment changes.
- Inspection submission.
- Synchronization failures.
- Conflict creation.
- Conflict resolution.
- Administrative changes.

### Logging requirements

- Use structured logging.
- Include timestamps in UTC.
- Include relevant user and resource identifiers.
- Avoid passwords and raw tokens.
- Avoid logging sensitive inspection content unnecessarily.
- Avoid exposing personal data in application error logs.
- Restrict access to logs.
- Define log retention according to operational requirements.

Audit records should be protected from ordinary application users modifying them.

---

## 21. Security Testing

Security must be tested throughout development.

### Authentication tests

- Valid login.
- Invalid password.
- Unknown email.
- Inactive account.
- Expired access token.
- Invalid token signature.
- Invalid token audience or issuer where configured.
- Expired refresh token.
- Revoked refresh token.
- Refresh-token reuse detection.
- Logout revocation.

### Authorization tests

- Admin-only endpoint accessed by inspector.
- Inspector accessing another user's inspection.
- Inspector modifying an unassigned inspection.
- Unauthorized answer modification.
- Unauthorized conflict resolution.
- Unauthorized user management.
- Unauthorized site access.

### API security tests

- Invalid payloads.
- Missing required fields.
- Invalid UUIDs.
- Oversized requests.
- Rate-limit enforcement.
- Safe error responses.
- CORS restrictions.
- CSRF protection for cookie-authenticated operations.

### Offline security tests

- Offline access after successful authentication.
- Offline access after expiration.
- User account switching.
- User-specific local data isolation.
- Pending operations preserved during logout.
- No refresh token in IndexedDB.
- No plaintext password in browser storage.

### Synchronization security tests

- Unauthorized operation submission.
- Fabricated user ID in payload.
- Fabricated device ID.
- Reused operation ID with a changed payload.
- Invalid base version.
- Cross-user pull attempts.
- Unauthorized conflict resolution.
- Access to revoked or inaccessible records.

---

## 22. Recommended Backend Security Structure

```text
backend/
└── app/
    ├── core/
    │   ├── config.py
    │   ├── security.py
    │   ├── permissions.py
    │   ├── logging.py
    │   └── exceptions.py
    │
    ├── dependencies/
    │   ├── authentication.py
    │   ├── authorization.py
    │   └── database.py
    │
    ├── models/
    │   ├── user.py
    │   ├── refresh_token.py
    │   └── audit_log.py
    │
    ├── schemas/
    │   ├── auth.py
    │   └── user.py
    │
    ├── services/
    │   ├── auth_service.py
    │   ├── token_service.py
    │   ├── permission_service.py
    │   └── audit_service.py
    │
    └── api/
        └── v1/
            └── endpoints/
                └── auth.py
```

This is a responsibility-oriented structure. Integrate these files into the final backend architecture without duplicating existing modules.

---

## 23. Security Acceptance Criteria

Security implementation is complete when:

- [ ] Passwords are stored using Argon2id hashes.
- [ ] Access tokens are short-lived and validated correctly.
- [ ] Refresh tokens are stored as hashes on the backend.
- [ ] Refresh tokens are protected by secure HTTP-only cookies.
- [ ] Refresh-token rotation and revocation work.
- [ ] CSRF and CORS policies are correctly configured.
- [ ] Backend RBAC is implemented.
- [ ] Resource-level authorization is implemented.
- [ ] Inspectors cannot access unauthorized inspections.
- [ ] Sync push and pull enforce authorization.
- [ ] Idempotency violations are rejected.
- [ ] Offline data is isolated by user.
- [ ] Offline access has a bounded validity period.
- [ ] Secrets are not committed to source control.
- [ ] Database access uses a restricted application account.
- [ ] Sensitive actions are audited.
- [ ] Sensitive values are excluded from logs.
- [ ] Automated authentication and authorization tests pass.
- [ ] Production communication uses HTTPS.

---

## 24. Implementation Boundaries

Security implementation must remain consistent with the other Fieldmark documents.

- Authentication contracts must follow `docs/api-contracts.md`.
- Offline behavior must follow `docs/offline-sync-design.md`.
- Data ownership and relationships must follow `docs/database-design.md`.
- Product permissions must follow `docs/PRD.md`.
- Architecture decisions must follow `docs/architecture.md`.

Do not implement authentication only in React.

Do not allow frontend role checks to replace backend authorization.

Do not weaken conflict detection to make synchronization appear successful.

Do not store sensitive authentication credentials in IndexedDB.

---

## 25. Final Security Decision

Fieldmark will use:

- Argon2id password hashing.
- Short-lived JWT access tokens.
- Hashed, rotating refresh tokens.
- HTTP-only secure refresh-token cookies.
- CSRF protection for cookie-authenticated operations.
- Strict CORS configuration.
- Backend-enforced RBAC.
- Resource-level authorization.
- HTTPS for production communication.
- User-scoped offline data.
- Bounded offline access.
- Idempotent synchronization.
- Version-based concurrency validation.
- Structured security logging and audit records.

The backend remains the final authority for identity, permissions, data ownership, and business rules.

Offline functionality must preserve the inspector's work without treating locally cached permissions as permanent server authorization.