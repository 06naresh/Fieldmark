import type { CurrentUser } from '@/types/auth';
import type { InspectionDetail } from '@/types/entities';

export const DEVICE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const OTHER_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const SUBMISSION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

export const currentUser: CurrentUser = {
  id: '11111111-1111-4111-8111-111111111111',
  full_name: 'Iris Inspector',
  email: 'iris.inspector@example.com',
  role: 'INSPECTOR',
  is_active: true,
};

export const detail: InspectionDetail = {
  id: '22222222-2222-4222-8222-222222222222',
  site_id: '33333333-3333-4333-8333-333333333333',
  template_id: '44444444-4444-4444-8444-444444444444',
  template_version: 1,
  assigned_to: currentUser.id,
  title: 'Quarterly safety review',
  instructions: null,
  scheduled_at: null,
  due_at: null,
  status: 'ASSIGNED',
  version: 1,
  site: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'North Plant',
    site_code: 'NORTH-01',
    address: '1 Industrial Road',
    city: 'Springfield',
    state: 'IL',
    postal_code: '62701',
    country: 'USA',
    description: null,
    is_active: true,
    version: 1,
  },
  template: {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Safety checklist',
    description: null,
    template_version: 1,
    is_active: true,
    version: 1,
    items: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        question: 'Are exits clear?',
        description: null,
        response_type: 'YES_NO',
        is_required: true,
        display_order: 1,
        options: null,
      },
    ],
  },
  checklist_items: [
    {
      id: '55555555-5555-4555-8555-555555555555',
      question: 'Are exits clear?',
      description: null,
      response_type: 'YES_NO',
      is_required: true,
      display_order: 1,
      options: null,
    },
  ],
  answers: [],
};
