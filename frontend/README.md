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

The application uses feature-oriented organization. Phase 6 provides the shared foundation:

- `src/app/` — application entry, providers, and router.
- `src/components/ui/` — shadcn-style reusable UI components.
- `src/hooks/` — reusable React hooks.
- `src/lib/` — API client, query client, constants, utilities, and error normalization.
- `src/pages/` — placeholder pages for routes implemented in later phases.
- `src/store/` — Zustand theme and application stores.
- `src/styles/` — Tailwind global styles and light/dark theme tokens.
- `src/test/` — Vitest setup.

Access tokens are stored only in memory by the API client. Refresh tokens remain in the backend's HTTP-only cookie and are never persisted in browser storage.

## Current scope

Phase 6 implements the foundation only. Authentication, admin workflows, inspector execution, IndexedDB persistence, synchronization UI, and the PWA shell are implemented in later phases. The routed pages currently render labeled placeholders so navigation can be verified independently.
