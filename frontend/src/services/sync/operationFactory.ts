import { createId } from '@/lib/id';
import type { SyncQueueRecord } from '@/db/localTypes';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);

  return `{${entries.join(',')}}`;
}

function fallbackHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/** Hash the canonical payload before entering a Dexie transaction. */
export async function hashPayload(payload: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(payload));
  if (!globalThis.crypto?.subtle) {
    return fallbackHash(canonicalJson(payload));
  }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

interface CreateQueueOperationInput {
  userId: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  operationType: SyncQueueRecord['operation_type'];
  payload: Record<string, unknown>;
  baseVersion: number | null;
  dependencies?: string[];
  id?: string;
  createdAt?: string;
}

export async function createQueueOperation(
  input: CreateQueueOperationInput,
): Promise<SyncQueueRecord> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id ?? createId(),
    user_id: input.userId,
    device_id: input.deviceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    operation_type: input.operationType,
    payload: input.payload,
    payload_hash: await hashPayload(input.payload),
    base_version: input.baseVersion,
    dependencies: input.dependencies ?? [],
    status: 'PENDING',
    attempts: 0,
    next_retry_at: null,
    created_at: createdAt,
    last_attempt_at: null,
    last_error: null,
  };
}
