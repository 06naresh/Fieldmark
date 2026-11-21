export const APP_NAME = 'Fieldmark';

export const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export const ROUTES = {
  home: '/',
  login: '/login',
  profile: '/profile',
  settings: '/settings',
  notFound: '*',
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    sites: '/admin/sites',
    checklists: '/admin/checklists',
    inspections: '/admin/inspections',
    sync: '/admin/sync',
  },
  inspector: {
    dashboard: '/inspector/dashboard',
    inspections: '/inspector/inspections',
    sync: '/inspector/sync',
    inspectionDetails: (id: string): string => `/inspector/inspections/${id}`,
    executeInspection: (id: string): string => `/inspector/inspections/${id}/execute`,
  },
} as const;
