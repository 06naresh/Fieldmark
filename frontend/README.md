# Fieldmark Frontend

React and TypeScript frontend for the offline-first Fieldmark inspection application.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The development server runs at `http://localhost:5173`. Set `VITE_API_BASE_URL` to the backend API base path when it differs from `http://localhost:8000/api/v1`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite in development mode |
| `npm run build` | Run TypeScript checks and create a production build |
| `npm run lint` | Run ESLint with zero-warning enforcement |
| `npm test` | Run Vitest and React Testing Library tests |
| `npm run preview` | Serve the production build locally |

## Architecture

The application uses feature-oriented organization:

- `src/app/` — application entry, providers, router, and route guards.
- `src/components/ui/` — shadcn-style reusable UI components.
- `src/features/` — authentication, dashboard, and administrator feature pages and forms.
- `src/hooks/` — reusable React hooks.
- `src/layouts/` — authenticated shell, admin sidebar, header, and mobile navigation.
- `src/lib/` — API client, query client, constants, utilities, and error normalization.
- `src/pages/` — shared not-found and remaining placeholder pages.
- `src/services/` — typed API clients and session lifecycle services.
- `src/store/` — Zustand auth, theme, and application stores.
- `src/styles/` — Tailwind global styles and light/dark theme tokens.
- `src/test/` — Vitest setup, fixtures, and render helpers.
- `src/types/` — API, authentication, and entity contracts.

Access tokens are stored only in memory by the API client. Refresh tokens remain in the backend's HTTP-only cookie and are never persisted in browser storage. Cookie-authenticated refresh and logout requests read the non-HttpOnly CSRF cookie and send it as `X-CSRF-Token`.

## Current scope

Phase 7 implements login, session restoration and refresh, protected role-aware routes, the admin shell, dashboard, user/site/checklist management, and inspection assignment. Inspector execution, IndexedDB persistence, synchronization UI, conflict management, and the PWA shell remain later-phase work.
