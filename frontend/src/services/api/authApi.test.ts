import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/services/api/authApi';

const post = vi.hoisted(() => vi.fn());

vi.mock('@/lib/axios', () => ({
  apiClient: { post },
}));

beforeEach(() => {
  post.mockReset();
});

describe('authApi.signup', () => {
  it('posts only the public signup fields to the signup endpoint', async () => {
    const createdUser = {
      id: 'inspector-1',
      full_name: 'Sam Inspector',
      email: 'sam.inspector@example.com',
      role: 'INSPECTOR',
      is_active: true,
    };
    post.mockResolvedValue({ data: { data: createdUser } });

    const result = await authApi.signup({
      full_name: 'Sam Inspector',
      email: 'sam.inspector@example.com',
      password: 'InspectorPass123!',
    });

    expect(post).toHaveBeenCalledWith('/auth/signup', {
      full_name: 'Sam Inspector',
      email: 'sam.inspector@example.com',
      password: 'InspectorPass123!',
    });
    expect(result).toEqual(createdUser);
  });
});
