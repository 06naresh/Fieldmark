# Fieldmark Deployment and Recovery Guide

This document describes the approved Vercel release process for Fieldmark.

## 1. Deployment architecture

Fieldmark deploys as one Vercel Services project so the browser, API, refresh cookie, and CSRF cookie share one HTTPS origin.

```text
Browser / installed PWA
        |
        | https://<project-or-custom-domain>
        v
Vercel project routes
        |
        +-- /api/* ------------------> FastAPI service (backend/)
        |
        +-- all other paths ---------> Vite static service (frontend/)
                                          |
                                          +-- SPA fallback to index.html
                                          +-- sw.js, manifest, hashed assets
```

- The frontend API base is the same-origin path `/api/v1` from `frontend/.env.production`.
- `vercel.json` routes `/api/*` to FastAPI before the frontend catch-all rewrite.
- `/health` and `/health/ready` are also routed to FastAPI before the catch-all because the approved API contract exposes health checks at the root.
- Refresh cookies are `HttpOnly` and `Secure` in production. CSRF cookies remain readable by the frontend but are also `Secure`.
- Production API documentation is disabled.
- The backend build runs `python -m scripts.deploy_setup`, which applies pending Alembic migrations under a PostgreSQL advisory lock and, when configured, verifies or creates the initial administrator.

## 2. Prerequisites

- A Vercel account with access to the target team.
- Node.js 20.19+ or 22.12+ and npm.
- Python 3.12+ locally for deployment helper commands.
- Vercel CLI: `npm install --global vercel@latest`.
- A managed PostgreSQL database, preferably Neon with a pooled `DATABASE_URL`, for each Vercel environment.
- A strong, unique production `SECRET_KEY` of at least 32 characters.
- Initial administrator email and password. Enter secrets through prompts or a secret manager; never paste them into chat, commit them, or place them in shell history.

## 3. Environment configuration

Link the repository root, not `frontend/` or `backend/`:

```bash
vercel link
```

The top-level `services` key in `vercel.json` enables Services mode; do not set a single project-wide framework preset for a multi-service deployment.

Provision or connect the production database:

```bash
vercel integration add neon \
  --name fieldmark-production \
  --metadata auth=false \
  --environment production \
  --no-env-pull
```

Set production environment variables through Vercel. Use the CLI prompts rather than command-line values for secrets.

| Variable | Environment scope | Purpose |
|---|---|---|
| `APP_ENV` | Production | Must be `production`; forces secure cookies and disables API docs. |
| `SECRET_KEY` | Production, Secret | JWT signing key. Must be unique and at least 32 characters. |
| `DATABASE_URL` | Production, Secret | Managed PostgreSQL connection string. Plain `postgresql://` URLs are normalized to the installed `psycopg` driver. |
| `PUBLIC_APP_URL` | Production | Stable HTTPS custom domain, for example `https://fieldmark.example.com`. |
| `FRONTEND_ORIGINS` | Production | Optional comma-separated HTTPS origins. Localhost origins are ignored in production. |
| `BOOTSTRAP_ADMIN_EMAIL` | Production, Secret | Initial administrator email. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Production, Secret | Initial administrator password. Never printed by the bootstrap script. |
| `BOOTSTRAP_ADMIN_NAME` | Production | Optional display name; defaults to `Fieldmark Administrator`. |
| `LOG_LEVEL` | Production | Recommended: `INFO`. |
| `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`, `DB_POOL_RECYCLE` | Production | Optional bounded pool settings per serverless instance. |

`VERCEL_URL` is injected automatically and is added to the trusted CORS origin list for each preview or production deployment. Do not set `VITE_API_BASE_URL` in Vercel; the committed production frontend environment file uses the same-origin `/api/v1` path.

Use separate databases for Production and Preview. Never point a preview deployment at the production database.

Example secret commands:

```bash
vercel env add SECRET_KEY production --sensitive
vercel env add BOOTSTRAP_ADMIN_EMAIL production --sensitive
vercel env add BOOTSTRAP_ADMIN_PASSWORD production --sensitive
```

## 4. Deployment

Before deploying, verify the local release gates:

```bash
cd backend
python -m pytest -q
cd ../frontend
npm ci
npm run lint
npm test
npm run build
npm run typecheck:e2e
cd ..
python -m compileall -q backend/app backend/scripts scripts
```

Deploy a preview first:

```bash
git push origin <review-branch>
vercel deploy
```

Run the smoke checks against the preview URL using preview credentials and database. After preview verification, deploy the reviewed commit to production:

```bash
vercel deploy --prod
```

For Git-integrated projects, promote the reviewed commit through the Vercel dashboard or the documented promotion flow. Confirm that the deployment source commit matches the tested commit.

The backend build applies migrations before the new frontend and API serve traffic. Migrations must remain backward-compatible with the currently running deployment because old function instances may still be warm.

## 5. Health and smoke verification

Public endpoints:

- `GET /health` — process and API liveness, routed to the backend service.
- `GET /health/ready` — PostgreSQL connectivity, routed to the backend service.
- `GET /manifest.webmanifest` — PWA manifest.
- `GET /sw.js` — service worker with revalidation headers.
- `GET /asset-manifest.json` — generated production asset list.

Run the non-destructive smoke script from the repository root:

```bash
python scripts/smoke_production.py https://<deployment-domain>
```

For an authenticated check without placing the password in shell history:

```bash
export SMOKE_ADMIN_EMAIL='admin@example.com'
read -rs SMOKE_ADMIN_PASSWORD
export SMOKE_ADMIN_PASSWORD
python scripts/smoke_production.py https://<deployment-domain>
```

The script verifies API health, database readiness, PWA delivery, SPA fallback, protected-route behavior, disabled production docs, HTTPS headers, secure cookies, and an authenticated administrator session when credentials are supplied.

For a local HTTP dry run only:

```bash
python scripts/smoke_production.py http://localhost:4173 --allow-http
```

## 6. Offline and synchronization verification in the deployed environment

After a production or preview deployment:

1. Sign in as an inspector while online.
2. Open an assigned inspection and use **Download / Refresh offline copy**.
3. Confirm the detail page reports that the inspection is available offline.
4. Disable the network, answer checklist items, add notes, and submit.
5. Refresh the browser and confirm the locally saved work and pending state remain.
6. Re-enable the network and run a foreground synchronization.
7. Confirm the server-accepted result becomes visible and repeated synchronization does not duplicate operations.
8. Sign in as an administrator and confirm the same answers, notes, and result are visible in the admin detail view.
9. Install the PWA and confirm the application shell starts while offline.

## 7. Backups and restoration

Neon or the chosen managed PostgreSQL provider must have point-in-time recovery enabled with a documented retention period. The minimum production policy is:

- Automated daily backups with at least seven days of retention.
- Point-in-time recovery available for the production database.
- Backups stored separately from the Vercel project.
- Restore procedures tested before go-live and after any infrastructure change.
- Restore tests performed against an isolated database, never directly over production.

Restore procedure:

1. Create a new isolated PostgreSQL database from the desired backup or point in time.
2. Configure a temporary Vercel preview environment with that database only.
3. Run `python -m scripts.deploy_setup` against the restored database and confirm it succeeds.
4. Verify row counts, a known inspection, its answers, notes, result, and synchronization records.
5. Run the smoke script against the temporary deployment.
6. Only after approval, promote the restored database configuration to production and redeploy.
7. Preserve the original production database until the restored deployment is confirmed.

Never drop or reset a database to repair an ordinary deployment failure.

## 8. Logs, monitoring, and alerts

Use Vercel Runtime Logs and Observability for the frontend and backend services. Monitor:

- API availability using `/health`.
- Database connectivity using `/health/ready`.
- 5xx response rate and function duration.
- Synchronization push and pull failure rates.
- Conflict creation and unresolved conflict counts.
- Database connections, storage, and replication lag.

Fieldmark currently uses process-local login rate limiting. On serverless, each function instance has its own counter. If abusive traffic is a concern, add an approved shared rate limiter at the edge or in the data layer before exposing production broadly.

## 9. Rollback

1. Identify the last known-good Vercel deployment.
2. Confirm database migrations are backward-compatible with that deployment. If they are not, restore the database first using section 7.
3. Promote the known-good deployment through Vercel.
4. Run the smoke script and the deployed offline/synchronization verification.
5. Record the incident, commit, database state, and verification results.

Do not reverse a migration automatically. Schema rollback is allowed only when the migration was reviewed as reversible.

## 10. Release verification checklist

- [ ] Frontend and backend are present in the same Vercel Services deployment.
- [ ] Production and Preview use separate databases.
- [ ] HTTPS and HSTS are active on the custom domain.
- [ ] `APP_ENV=production` and `SECRET_KEY` is unique.
- [ ] Trusted origins include the custom domain and current Vercel URL.
- [ ] Secure refresh and CSRF cookies are confirmed by the smoke script.
- [ ] Migrations apply successfully during the backend build.
- [ ] Initial administrator exists and can authenticate.
- [ ] `/health` and `/health/ready` pass through the public Vercel routing.
- [ ] PWA manifest, service worker, assets, and SPA fallback pass.
- [ ] Offline download, local save, refresh persistence, synchronization, and result visibility pass in the deployed environment.
- [ ] Backup, point-in-time recovery, and isolated restore procedure are confirmed.
- [ ] Runtime logs and availability monitoring are enabled.
- [ ] Rollback deployment is identified and documented.
