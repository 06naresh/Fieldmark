import { describe, expect, it } from 'vitest';
import { createId, stableIdFromKey } from '@/lib/id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('identifier helpers', () => {
  it('creates structurally valid unique UUIDs', () => {
    const first = createId();
    const second = createId();

    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(first).not.toBe(second);
  });

  it('derives deterministic UUIDs for local records', () => {
    const key = 'answer:22222222-2222-4222-8222-222222222222:55555555-5555-4555-8555-555555555555';

    expect(stableIdFromKey(key)).toBe(stableIdFromKey(key));
    expect(stableIdFromKey(key)).toMatch(UUID_V4);
    expect(stableIdFromKey(key)).not.toBe(stableIdFromKey(`${key}:other`));
  });
});
