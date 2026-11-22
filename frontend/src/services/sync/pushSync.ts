import { listQueueOperations } from '@/db/localRepositories';
import {
  applyPushResults,
  claimOperations,
  markBatchTransportFailure,
  type PushResultCounts,
} from '@/db/syncRepositories';
import type { SyncQueueRecord } from '@/db/localTypes';
import { ApiError } from '@/lib/error';
import { syncApi } from '@/services/api/syncApi';
import { selectReadyOperations } from '@/services/sync/dependencyManager';
import type { SyncOperationRequest } from '@/services/sync/syncTypes';

const PUSH_BATCH_SIZE = 20;
const MAX_BATCHES_PER_RUN = 25;

export interface PushReport extends PushResultCounts {
  batches: number;
  attempted: number;
  failedBatches: number;
}

function toOperationRequest(operation: SyncQueueRecord): SyncOperationRequest {
  return {
    operation_id: operation.id,
    operation_type: operation.operation_type,
    entity_type: operation.entity_type,
    entity_id: operation.entity_id,
    base_version: operation.base_version,
    payload: operation.payload,
  };
}

export async function pushPendingOperations(
  userId: string,
  deviceId: string,
): Promise<PushReport> {
  const report: PushReport = {
    batches: 0,
    attempted: 0,
    failedBatches: 0,
    accepted: 0,
    conflicts: 0,
    rejected: 0,
    retryable: 0,
  };

  for (let batchIndex = 0; batchIndex < MAX_BATCHES_PER_RUN; batchIndex += 1) {
    const operations = await listQueueOperations(userId);
    const ready = selectReadyOperations(operations, PUSH_BATCH_SIZE);
    if (ready.length === 0) {
      break;
    }

    const claimed = await claimOperations(ready.map((operation) => operation.id));
    if (claimed.length === 0) {
      break;
    }

    report.batches += 1;
    report.attempted += claimed.length;

    try {
      const response = await syncApi.push(deviceId, claimed.map(toOperationRequest));
      const counts = await applyPushResults(userId, claimed, response.results);
      report.accepted += counts.accepted;
      report.conflicts += counts.conflicts;
      report.rejected += counts.rejected;
      report.retryable += counts.retryable;
    } catch (error: unknown) {
      report.failedBatches += 1;
      const retryAfterHeader = error instanceof ApiError ? error.retryAfterHeader : null;
      await markBatchTransportFailure(userId, claimed, error, retryAfterHeader);
      throw error;
    }
  }

  return report;
}
