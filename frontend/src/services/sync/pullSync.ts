import { applyPullBatch, getPullCursor } from '@/db/syncRepositories';
import { syncApi } from '@/services/api/syncApi';
import { SyncError } from '@/services/sync/syncTypes';

const PULL_PAGE_SIZE = 100;
const MAX_PAGES_PER_RUN = 50;

export interface PullReport {
  pages: number;
  applied: number;
  skipped: number;
  conflicts: number;
}

/** Apply every authorized page only after the previous page is durable. */
export async function pullRemoteChanges(userId: string, deviceId: string): Promise<PullReport> {
  const report: PullReport = { pages: 0, applied: 0, skipped: 0, conflicts: 0 };
  let cursor = await getPullCursor(userId);

  for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
    const response = await syncApi.pull(deviceId, cursor, PULL_PAGE_SIZE);
    if (!response.next_cursor) {
      throw new SyncError('The server returned an invalid pull cursor.', 'INVALID_PULL_RESPONSE');
    }

    const outcome = await applyPullBatch(userId, response.changes, response.next_cursor);
    report.pages += 1;
    report.applied += outcome.applied;
    report.skipped += outcome.skipped;
    report.conflicts += outcome.conflicts;

    if (!response.has_more) {
      break;
    }
    if (response.next_cursor === cursor) {
      throw new SyncError('The pull cursor did not advance.', 'STALLED_PULL');
    }
    cursor = response.next_cursor;
  }

  return report;
}
