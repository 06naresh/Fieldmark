# Frontend Design

## 1. Purpose

This document defines the frontend architecture and user interface design for Fieldmark.

Fieldmark is an offline-first field inspection application. Its frontend must provide a clear, responsive, and reliable experience for administrators and inspectors.

The frontend must support:

- User authentication.
- Role-based navigation.
- Administrative dashboards.
- User management.
- Site management.
- Checklist template management.
- Inspection assignments.
- Inspection execution.
- Offline inspection workflows.
- Local data persistence.
- Background and foreground synchronization.
- Conflict resolution.
- Synchronization monitoring.
- Responsive desktop, tablet, and mobile layouts.
- Light and dark themes.

The frontend must be structured so that UI components remain separate from business logic, API communication, local database operations, and synchronization algorithms.

---

## 2. Technology Stack

Use the following frontend technologies.

| Technology | Responsibility |
|---|---|
| React | UI development |
| TypeScript | Type safety |
| Vite | Development server and build tooling |
| Tailwind CSS | Styling and responsive layouts |
| shadcn/ui | Reusable UI components |
| React Router | Client-side routing |
| TanStack Query | Server-state management |
| Zustand | Client-side application state |
| Dexie.js | IndexedDB management |
| React Hook Form | Form management |
| Zod | Runtime validation |
| Axios | HTTP communication |
| Lucide React | Icons |
| Workbox or compatible tooling | Service worker and PWA support |
| Vitest | Unit testing |
| React Testing Library | Component testing |
| Playwright | End-to-end testing |

Use JavaScript only where a library or configuration specifically requires it. Application components, hooks, services, and models must use TypeScript.

Do not introduce another state-management library without a clear architectural reason.

---

## 3. Frontend Architecture

Use a feature-oriented architecture.

Each major feature should contain its own components, hooks, schemas, services, and types where appropriate.

Shared functionality must live in common folders rather than being duplicated across features.

### High-level architecture

```text
                REACT APPLICATION
                        |
                        v
                  ROUTER LAYER
                        |
              +---------+---------+
              |                   |
              v                   v
         ADMIN LAYOUT        INSPECTOR LAYOUT
              |                   |
              +---------+---------+
                        |
                        v
                  FEATURE MODULES
                        |
              +---------+---------+
              |         |         |
              v         v         v
           Pages    Components   Hooks
              |         |         |
              +---------+---------+
                        |
                        v
                 APPLICATION SERVICES
                        |
             +----------+----------+
             |                     |
             v                     v
         API CLIENT           LOCAL SERVICES
             |                     |
             v                     v
          FASTAPI              INDEXEDDB
             |                     |
             v                     v
        POSTGRESQL             SYNC ENGINE
```

### Architectural rules

1. Pages must compose features and layouts.
2. Components must focus on presentation and user interaction.
3. Hooks must encapsulate reusable React behavior.
4. Services must implement business operations.
5. API modules must communicate with FastAPI.
6. Dexie repositories must manage local persistence.
7. The synchronization engine must remain independent of React components.
8. Shared components must not contain feature-specific business logic.
9. Route protection must complement, not replace, backend authorization.
10. Offline-capable pages must read and write through local application services.

---

## 4. Recommended Folder Structure

Use the following structure as the frontend implementation target.

```text
frontend/
│
├── public/
│   ├── icons/
│   ├── images/
│   ├── favicon.ico
│   └── manifest.webmanifest
│
├── src/
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── routeConfig.ts
│   │
│   ├── assets/
│   │   ├── images/
│   │   └── illustrations/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── common/
│   │   ├── feedback/
│   │   └── data-display/
│   │
│   ├── layouts/
│   │   ├── AuthLayout.tsx
│   │   ├── AdminLayout.tsx
│   │   ├── InspectorLayout.tsx
│   │   └── components/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── MobileNavigation.tsx
│   │       ├── Breadcrumbs.tsx
│   │       └── UserMenu.tsx
│   │
│   ├── features/
│   │   │
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── types/
│   │   │
│   │   ├── users/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   │
│   │   ├── sites/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   │
│   │   ├── checklists/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   │
│   │   ├── inspections/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   │
│   │   └── sync/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── pages/
│   │       ├── services/
│   │       └── types/
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   └── useOnlineStatus.ts
│   │
│   ├── lib/
│   │   ├── axios.ts
│   │   ├── queryClient.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── authApi.ts
│   │   │   ├── usersApi.ts
│   │   │   ├── sitesApi.ts
│   │   │   ├── checklistsApi.ts
│   │   │   ├── inspectionsApi.ts
│   │   │   └── syncApi.ts
│   │   │
│   │   └── local/
│   │       ├── localDatabase.ts
│   │       ├── repositories/
│   │       └── migrations/
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── appStore.ts
│   │   ├── syncStore.ts
│   │   └── themeStore.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── common.ts
│   │   └── entities.ts
│   │
│   ├── utils/
│   │   ├── date.ts
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── error.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── theme.css
│   │
│   ├── test/
│   │   ├── setup.ts
│   │   ├── mocks/
│   │   └── fixtures/
│   │
│   └── vite-env.d.ts
│
├── .env.example
├── .gitignore
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

This structure is the target organization, not a requirement to create every empty file immediately.

Create feature files as the corresponding feature is implemented.

---

## 5. Application Routes

Use React Router.

Routes must be grouped by authentication and user role.

### Public routes

| Route | Page | Description |
|---|---|---|
| `/login` | LoginPage | User authentication |
| `/forgot-password` | ForgotPasswordPage | Password recovery, if enabled |

### Admin routes

| Route | Page | Description |
|---|---|---|
| `/admin/dashboard` | AdminDashboardPage | Administrative overview |
| `/admin/users` | UsersPage | User management |
| `/admin/sites` | SitesPage | Site management |
| `/admin/checklists` | ChecklistsPage | Checklist management |
| `/admin/inspections` | InspectionsPage | Inspection management |
| `/admin/sync` | SyncCenterPage | Synchronization monitoring |

### Inspector routes

| Route | Page | Description |
|---|---|---|
| `/inspector/dashboard` | InspectorDashboardPage | Assigned-work overview |
| `/inspector/inspections` | MyInspectionsPage | Assigned inspections |
| `/inspector/inspections/:id` | InspectionDetailsPage | Inspection details |
| `/inspector/inspections/:id/execute` | ExecuteInspectionPage | Complete checklist |
| `/inspector/sync` | SyncCenterPage | Personal sync status |

### Common routes

| Route | Page | Description |
|---|---|---|
| `/profile` | ProfilePage | User profile |
| `/settings` | SettingsPage | Application preferences |
| `*` | NotFoundPage | Unknown route |

Routes must be adjusted if the API and product requirements change.

### Route protection

Implement reusable route guards.

Required behavior:

- Unauthenticated users must be redirected to login.
- Authenticated users must be directed to the correct dashboard.
- Admin-only pages must reject inspectors.
- Inspector-only pages must reject unauthorized users.
- Unknown routes must display a not-found page.
- Offline route access must follow the offline authentication policy.

A route guard is a user-interface convenience. FastAPI must still enforce every permission.

---

## 6. Layout Design

Fieldmark must have separate application layouts for administrators and inspectors.

### 6.1 Admin Layout

The admin layout should use a desktop sidebar and a responsive mobile navigation system.

Suggested sidebar:

```text
FIELDMark
--------------------------------
Dashboard
--------------------------------
MANAGEMENT
  Users
  Sites
  Checklists
  Inspections
--------------------------------
OPERATIONS
  Sync Center
--------------------------------
SETTINGS
  Profile
  Settings
--------------------------------
User Profile
Logout
```

The sidebar should:

- Remain consistent across admin pages.
- Highlight the active route.
- Support a collapsible desktop state if useful.
- Become a mobile drawer on small screens.
- Use clear icons and labels.
- Avoid unnecessary navigation items.

### 6.2 Inspector Layout

Inspectors need a simpler navigation structure.

```text
FIELDMark
--------------------------------
Dashboard
My Inspections
Sync Center
--------------------------------
Profile
Settings
Logout
```

Prioritize the inspection workflow over administrative functionality.

### 6.3 Header

The shared header should include:

- Page title or breadcrumbs.
- Network status.
- Synchronization indicator.
- Notification area if needed.
- Theme toggle.
- User profile menu.

The header must not become overcrowded on mobile.

### 6.4 Mobile Navigation

On smaller screens:

- Replace the desktop sidebar with a drawer or compact navigation.
- Keep the primary inspection action easy to reach.
- Avoid horizontal page overflow.
- Ensure forms remain usable.
- Keep important synchronization information visible.
- Use touch-friendly controls.

---

## 7. Design System

Use a clean, professional interface suitable for business and field inspection workflows.

### Visual direction

The application should feel:

- Professional.
- Minimal.
- Reliable.
- Clear.
- Modern.
- Easy to operate on tablets and phones.

Avoid unnecessary animations, decorative effects, and excessive gradients.

### Color tokens

Use semantic design tokens rather than hardcoding colors throughout components.

Suggested initial palette:

| Token | Light theme | Dark theme |
|---|---|---|
| Background | `#F8FAFC` | `#0F172A` |
| Surface | `#FFFFFF` | `#1E293B` |
| Primary | `#2563EB` | `#60A5FA` |
| Primary text | `#0F172A` | `#F8FAFC` |
| Secondary text | `#64748B` | `#94A3B8` |
| Border | `#E2E8F0` | `#334155` |
| Success | `#16A34A` | `#4ADE80` |
| Warning | `#D97706` | `#FBBF24` |
| Danger | `#DC2626` | `#F87171` |

These are initial design tokens and may be refined during implementation.

### Typography

Use a readable sans-serif typeface.

Recommended hierarchy:

- Page title: clear and prominent.
- Section heading: medium emphasis.
- Card title: compact and readable.
- Body: comfortable reading size.
- Helper text: smaller but accessible.
- Form labels: clearly distinguishable from placeholders.

### Spacing

Use a consistent spacing scale.

Avoid arbitrary margins and padding values scattered throughout the codebase.

### Borders and shadows

- Use subtle borders for cards and panels.
- Use restrained shadows.
- Keep card corner radii consistent.
- Use visible focus indicators.

---

## 8. Light and Dark Themes

Fieldmark must support both light and dark modes.

The theme toggle must be available from the application header or profile menu.

Requirements:

- Support light mode.
- Support dark mode.
- Persist the user's selected preference.
- Apply the theme consistently across all pages.
- Support readable contrast in both themes.
- Ensure charts, tables, forms, dialogs, and status indicators work in both themes.

Use semantic CSS variables and the theme system supported by the selected component setup.

Avoid duplicating every component solely to support dark mode.

---

## 9. Page-by-Page UI Design

### 9.1 Login Page

Purpose: Authenticate Fieldmark users.

Components:

- Fieldmark logo or wordmark.
- Email field.
- Password field.
- Show/hide password control.
- Remembered account or device information where appropriate.
- Login button.
- Validation messages.
- Authentication error message.

Behavior:

- Validate required fields.
- Submit credentials to the backend.
- Handle inactive accounts.
- Handle invalid credentials.
- Establish the application session.
- Navigate to the appropriate role dashboard.

Do not implement persistent password storage.

### 9.2 Admin Dashboard

Purpose: Give administrators an overview of inspection operations.

Suggested summary cards:

- Total users.
- Active inspectors.
- Total sites.
- Total inspections.
- Pending inspections.
- Completed inspections.
- Synchronization issues.

Suggested sections:

- Recent inspections.
- Inspection status overview.
- Recent synchronization activity.
- Quick actions.

Display meaningful empty states when there is no data.

All dashboard statistics must come from authorized backend data.

### 9.3 Inspector Dashboard

Purpose: Show the inspector what needs attention.

Suggested sections:

- Assigned inspections.
- Pending inspections.
- In-progress inspections.
- Completed inspections.
- Offline availability.
- Pending synchronization count.
- Recent activity.

Primary action:

`Continue Inspection`

The most important action should be visually prominent.

### 9.4 Users Page

Purpose: Allow administrators to manage users.

Components:

- Page heading.
- Add user action.
- Search input.
- Role filter.
- Status filter.
- Users table.
- Edit user dialog.
- Activate/deactivate confirmation dialog.
- Pagination.

User table columns:

- Name.
- Email.
- Role.
- Status.
- Created date.
- Actions.

Do not expose password hashes or authentication tokens.

### 9.5 Sites Page

Purpose: Manage inspection sites.

Components:

- Page heading.
- Add site button.
- Search.
- Status filters.
- Sites table or responsive cards.
- Create/edit site form.
- Site details.

Site fields should follow the database and API contracts.

### 9.6 Checklists Page

Purpose: Create and manage inspection templates.

Components:

- Template list.
- Template name.
- Description.
- Status.
- Revision.
- Number of checklist items.
- Create template action.
- Edit template action.
- Template details.

Checklist editor should support:

- Adding an item.
- Editing an item.
- Reordering items.
- Configuring answer types.
- Setting required items.
- Publishing a revision.
- Viewing template details.

Published revisions must be handled consistently with the offline template rules.

An inspection already using an older downloaded revision must not silently switch to a newer revision.

### 9.7 Inspections Page

Purpose: Manage and review inspection assignments.

Components:

- Inspection list.
- Site information.
- Assigned inspector.
- Template.
- Scheduled date.
- Status.
- Search and filters.
- Assign inspection action.
- Inspection details.

Administrators must be able to identify overdue, pending, in-progress, and completed work.

### 9.8 My Inspections Page

Purpose: Allow inspectors to find their assigned inspections.

Components:

- Search.
- Status filters.
- Inspection cards or table.
- Site name.
- Scheduled date.
- Checklist information.
- Local availability indicator.
- Synchronization status.
- Continue inspection action.

Clearly distinguish:

- Downloaded and available offline.
- Not downloaded.
- Pending synchronization.
- Successfully synchronized.

### 9.9 Inspection Details Page

Purpose: Display the information required before starting or continuing an inspection.

Show:

- Inspection identifier.
- Site details.
- Assigned inspector.
- Checklist template and revision.
- Scheduled date.
- Current status.
- Local availability.
- Last synchronization information.

Actions must depend on the inspection's current business state.

### 9.10 Execute Inspection Page

This is one of the most important Fieldmark pages.

It must be optimized for mobile and tablet usage.

Suggested structure:

```text
--------------------------------
Inspection Details
Site: North Facility
Status: In Progress
--------------------------------
Checklist Progress
[========------] 60%
--------------------------------
Checklist Items

1. Is the entrance accessible?
   ( ) Pass
   ( ) Fail
   ( ) Not Applicable
   Remarks: ___________

2. Is safety equipment available?
   ( ) Pass
   ( ) Fail
   ( ) Not Applicable
   Remarks: ___________

--------------------------------
Local Save Status
Saved on this device
Waiting to sync
--------------------------------
[Save Draft] [Submit Inspection]
--------------------------------
```

The actual answer options must follow the checklist item's configured answer type.

Behavior:

- Load the downloaded inspection and its template revision.
- Display checklist items.
- Validate required answers.
- Save answers locally.
- Update completion progress.
- Support offline editing.
- Display local save confirmation.
- Display synchronization state.
- Support draft saving.
- Submit only when required business rules are satisfied.

Important:

A local save is not the same as a successful server synchronization.

Display these states separately.

The submit action must use the inspection submission workflow defined in the API contract.

### 9.11 Sync Center Page

Purpose: Provide visibility into synchronization activity.

Components:

- Network connectivity indicator.
- Backend availability indicator.
- Last successful synchronization.
- Pending count.
- Processing count.
- Failed count.
- Conflict count.
- Rejected count.
- Sync Now button.
- Operation history.
- Retry action.
- Conflict review action.

Suggested operation table:

| Operation | Entity | Status | Last Attempt | Action |
|---|---|---|---|---|
| Update answer | Inspection answer | Pending | — | View |
| Submit inspection | Inspection | Synced | Recent | View |
| Update answer | Inspection answer | Conflict | Recent | Resolve |

Do not display a successful state before backend acknowledgment.

### 9.12 Conflict Resolution Page or Dialog

Purpose: Help authorized users review conflicting changes.

Show:

- Related inspection.
- Related checklist item.
- Local value.
- Server value.
- Conflict reason.
- Last known server version.
- Available resolution actions.

Actions:

- Accept server version.
- Keep local version.
- Manually resolve where permitted.

Require confirmation before discarding local changes.

### 9.13 Profile and Settings

Profile page:

- User information.
- Email.
- Role.
- Account status.

Settings page:

- Theme preference.
- Offline data information.
- Synchronization preferences.
- Application information.
- Logout.

Do not expose sensitive session details.

---

## 10. State Management

Use Zustand for small application-level client state.

Use TanStack Query for remote server state.

Use Dexie for durable offline application data.

### Zustand responsibilities

Appropriate examples:

- Authenticated user context.
- Theme preference.
- Sidebar state.
- Current application UI preferences.
- Current connectivity indicator.
- Synchronization summary.

### TanStack Query responsibilities

Appropriate examples:

- User lists.
- Site lists.
- Checklist templates.
- Inspection lists.
- Dashboard summaries.
- Remote inspection details.

### Dexie responsibilities

Appropriate examples:

- Downloaded inspections.
- Local checklist templates.
- Inspection answers.
- Pending sync operations.
- Pull cursor.
- Conflict snapshots.

### Important rule

Do not store the entire application database in Zustand.

Do not use TanStack Query as a replacement for durable offline storage.

For offline-capable features, use application services that select local or remote data appropriately.

---

## 11. API Communication

Create a centralized Axios client.

Suggested structure:

```text
src/
├── lib/
│   └── axios.ts
│
└── services/
    └── api/
        ├── authApi.ts
        ├── usersApi.ts
        ├── sitesApi.ts
        ├── checklistsApi.ts
        ├── inspectionsApi.ts
        └── syncApi.ts
```

Requirements:

- Read the API base URL from environment configuration.
- Attach access tokens to protected requests.
- Handle access-token renewal.
- Handle unauthorized responses.
- Prevent concurrent refresh requests from creating unnecessary refresh operations.
- Handle network errors consistently.
- Normalize API errors.
- Avoid retrying non-retryable requests automatically.
- Respect backend response contracts.

Refresh-token requests must use the configured cookie strategy and credential handling.

Never put secrets in Vite environment variables.

---

## 12. Offline Data Access Pattern

Offline-capable features must use repositories or application services rather than directly accessing IndexedDB from arbitrary components.

Example:

```text
ExecuteInspectionPage
          |
          v
InspectionService
          |
          +------------------+
          |                  |
          v                  v
InspectionRepository    SyncQueueService
          |                  |
          v                  v
        Dexie              Dexie
```

The inspection service must coordinate:

1. Validation.
2. Local answer persistence.
3. Operation creation.
4. Local status updates.
5. Synchronization scheduling.

The UI must receive a clear result indicating whether the operation was saved locally, synchronized, rejected, or requires conflict resolution.

---

## 13. Forms and Validation

Use React Hook Form and Zod.

All important forms must have:

- Required-field validation.
- Clear labels.
- Helpful validation messages.
- Disabled submission while processing.
- Error handling.
- Accessible keyboard navigation.

Validation must exist on both frontend and backend.

Frontend validation improves usability but does not replace backend validation.

Use shared schemas where practical, but ensure frontend and backend implementations remain independently authoritative.

---

## 14. Loading, Error, and Empty States

Every data-driven page must handle:

- Initial loading.
- Refreshing.
- Empty results.
- Network unavailable.
- Authentication failure.
- Permission failure.
- Validation failure.
- Server error.
- Local storage error.

Do not display a blank page when a request fails.

Provide useful messages and safe recovery actions.

Examples:

**Empty state**

"No inspections assigned yet."

**Offline state**

"You're offline. Your downloaded inspections remain available."

**Pending synchronization**

"Your changes are saved on this device and waiting to sync."

**Conflict state**

"This inspection was updated elsewhere. Review the changes before continuing."

---

## 15. Responsive Design

Fieldmark must work on:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

The inspection execution workflow is the primary responsive-design priority.

### Desktop

- Sidebar navigation.
- Multi-column dashboards.
- Tables where appropriate.
- Comfortable content width.

### Tablet

- Collapsible sidebar.
- Flexible dashboard grids.
- Touch-friendly inspection controls.
- Responsive tables.

### Mobile

- Drawer or compact navigation.
- Single-column content.
- Stacked forms.
- Readable inspection cards.
- Large touch targets.
- Sticky primary inspection actions where useful.
- No horizontal overflow.

Test the application at common viewport widths and with keyboard navigation.

---

## 16. Accessibility

Follow practical accessibility standards.

Requirements:

- Use semantic HTML.
- Associate form labels with controls.
- Provide keyboard-accessible navigation.
- Show visible focus states.
- Provide accessible dialog behavior.
- Use sufficient color contrast.
- Do not communicate status through color alone.
- Use descriptive icon labels where necessary.
- Support screen readers for validation and status updates.
- Respect reduced-motion preferences.

The inspection workflow must remain usable without relying exclusively on mouse interaction.

---

## 17. PWA and Offline Application Shell

Fieldmark must be installable as a Progressive Web App where supported.

Requirements:

- Provide a valid web app manifest.
- Register a service worker.
- Cache the application shell and approved static assets.
- Support loading the application while offline.
- Use a controlled cache update strategy.
- Provide a clear update experience when a new version is available.
- Avoid caching sensitive authenticated API responses indiscriminately.

The service worker is responsible for application resource caching.

Dexie and IndexedDB are responsible for durable inspection data and the sync queue.

Do not confuse service-worker caching with business-data persistence.

---

## 18. Performance Requirements

The frontend should:

- Load routes and large feature modules efficiently.
- Use lazy loading for appropriate routes.
- Avoid unnecessary React re-renders.
- Use pagination for large datasets.
- Avoid rendering excessively large inspection lists at once.
- Keep synchronization work away from blocking UI interactions.
- Use optimized production assets.
- Avoid unnecessarily large dependencies.
- Keep the inspection execution experience responsive.

Performance must be evaluated on realistic mobile and tablet hardware, not only desktop development machines.

---

## 19. Frontend Testing

### Unit tests

Test:

- Utility functions.
- Form validation.
- Status formatting.
- Permission helpers.
- Retry display logic.
- Inspection progress calculation.
- Theme behavior.

### Component tests

Test:

- Login form.
- Navigation.
- User forms.
- Site forms.
- Checklist editor.
- Inspection answer controls.
- Sync status indicators.
- Conflict resolution controls.

### Integration tests

Test:

- Authentication and routing.
- Role-specific navigation.
- API integration.
- Local answer saving.
- Queue operation creation.
- Offline data loading.
- Synchronization status updates.

### End-to-end tests

Test:

1. Admin login and dashboard.
2. User creation.
3. Site creation.
4. Checklist creation.
5. Inspection assignment.
6. Inspector login.
7. Downloading an inspection.
8. Completing an inspection offline.
9. Refreshing the browser.
10. Reconnecting and synchronizing.
11. Reviewing a conflict.
12. Logging out safely.

---

## 20. Frontend Environment Configuration

Create `frontend/.env.example`.

Example:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Requirements:

- Keep environment-specific configuration outside application logic.
- Use `.env` for local configuration.
- Do not commit real secrets.
- Do not place signing keys or database credentials in Vite variables.
- Validate required configuration during application startup.

All variables prefixed with `VITE_` must be considered publicly visible to browser users.

---

## 21. Frontend Implementation Order

Implement the frontend in the following order.

### Stage 1: Project foundation

- Create the Vite React TypeScript project.
- Configure Tailwind CSS.
- Configure shadcn/ui.
- Configure aliases.
- Configure linting and formatting.
- Create the base folder structure.

### Stage 2: Application foundation

- Create the application entry point.
- Create providers.
- Configure React Router.
- Create global styles.
- Create theme management.
- Create shared UI components.

### Stage 3: Authentication

- Create login page.
- Implement authentication service.
- Implement token handling.
- Implement protected routes.
- Implement role-based layouts.

### Stage 4: Shared layouts

- Build admin layout.
- Build inspector layout.
- Build sidebar.
- Build header.
- Build responsive navigation.
- Build user menu.

### Stage 5: Administrative features

- Dashboard.
- User management.
- Site management.
- Checklist management.
- Inspection management.

### Stage 6: Inspector features

- Inspector dashboard.
- My inspections.
- Inspection details.
- Inspection execution.
- Local answer saving.

### Stage 7: Offline foundation

- Create Dexie database.
- Define local tables.
- Create repositories.
- Implement local data access.
- Implement offline indicators.

### Stage 8: Synchronization

- Implement operation creation.
- Implement queue management.
- Implement push synchronization.
- Implement pull synchronization.
- Implement retries.
- Implement conflict handling.
- Build Sync Center.

### Stage 9: PWA

- Configure the manifest.
- Implement service worker.
- Cache application resources.
- Test offline application startup.

### Stage 10: Quality and release

- Responsive testing.
- Accessibility testing.
- Component tests.
- Integration tests.
- End-to-end tests.
- Production build.
- Deployment configuration.

---

## 22. Frontend Acceptance Criteria

The frontend is considered complete when:

- [ ] The application uses React and TypeScript.
- [ ] The agreed feature-oriented folder structure is followed.
- [ ] React Router is configured.
- [ ] Admin and inspector layouts are implemented.
- [ ] Protected routes are implemented.
- [ ] The theme supports light and dark modes.
- [ ] All required administrative pages are implemented.
- [ ] All required inspector pages are implemented.
- [ ] Forms use React Hook Form and Zod.
- [ ] API communication uses a centralized client.
- [ ] Remote state uses TanStack Query appropriately.
- [ ] Application UI state uses Zustand appropriately.
- [ ] Local persistence uses Dexie and IndexedDB.
- [ ] Inspection answers are saved locally.
- [ ] Offline indicators are accurate.
- [ ] Sync Center is implemented.
- [ ] Conflict resolution UI is implemented.
- [ ] The application is responsive.
- [ ] Accessibility requirements are addressed.
- [ ] PWA installation and offline application loading work where supported.
- [ ] Frontend tests pass.
- [ ] Production builds successfully.

---

## 23. Implementation Boundaries

The frontend must follow the other Fieldmark design documents.

- Product behavior must follow `docs/PRD.md`.
- Application structure must follow `docs/architecture.md`.
- Data relationships must follow `docs/database-design.md`.
- API communication must follow `docs/api-contracts.md`.
- Offline behavior must follow `docs/offline-sync-design.md`.
- Authentication and permissions must follow `docs/security-design.md`.

Do not create frontend-only business rules that contradict backend behavior.

Do not put synchronization algorithms inside React components.

Do not use local storage as the primary offline database.

Do not treat a successful local save as a successful server synchronization.

---

## 24. Final Frontend Design Decision

Fieldmark will use a feature-oriented React and TypeScript frontend.

Its core architecture will combine:

- React and TypeScript.
- Vite.
- Tailwind CSS and shadcn/ui.
- React Router.
- TanStack Query.
- Zustand.
- Dexie and IndexedDB.
- React Hook Form and Zod.
- Axios.
- A PWA service worker.
- Vitest, React Testing Library, and Playwright.

The interface must prioritize the inspector's ability to complete work reliably in the field, even without internet connectivity.

The frontend must clearly communicate what is saved locally, what has reached the server, and what requires user attention.