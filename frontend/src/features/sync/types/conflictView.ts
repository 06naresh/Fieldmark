import type { ConflictResolutionType, ConflictStatus } from '@/services/sync/syncTypes';

export interface ConflictView {
  id: string;
  localId: string | null;
  remoteId: string | null;
  operationId: string;
  entityType: string;
  entityId: string;
  baseVersion: number | null;
  serverVersion: number | null;
  status: ConflictStatus;
  conflictType: string;
  localPayload: Record<string, unknown>;
  serverPayload: Record<string, unknown>;
  resolutionType: ConflictResolutionType | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  source: 'local' | 'remote';
}
