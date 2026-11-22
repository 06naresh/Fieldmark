import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

interface TableFilter {
  field: string;
  value: unknown;
}

/** Read a durable Dexie table directly from the browser to verify persistence. */
export async function readLocalTable<T>(
  page: Page,
  table: string,
  filter?: TableFilter,
): Promise<T[]> {
  return page.evaluate(
    async ({ tableName, tableFilter }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('fieldmark_local_db');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      });

      try {
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const transaction = database.transaction(tableName, 'readonly');
          const request = transaction.objectStore(tableName).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
        });

        if (!tableFilter) {
          return rows;
        }
        return rows.filter(
          (row) =>
            (row as Record<string, unknown>)[tableFilter.field] === tableFilter.value,
        );
      } finally {
        database.close();
      }
    },
    { tableName: table, tableFilter: filter },
  ) as Promise<T[]>;
}

export interface LocalAnswerRow {
  id: string;
  owner_id: string;
  inspection_id: string;
  checklist_item_id: string;
  value: unknown;
  remarks: string;
  sync_status: string;
  operation_id: string | null;
}

export interface LocalQueueRow {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  operation_type: string;
}

export async function getLocalAnswers(page: Page, ownerId: string): Promise<LocalAnswerRow[]> {
  return readLocalTable<LocalAnswerRow>(page, 'local_inspection_answers', {
    field: 'owner_id',
    value: ownerId,
  });
}

export async function getLocalQueue(page: Page, ownerId: string): Promise<LocalQueueRow[]> {
  return readLocalTable<LocalQueueRow>(page, 'sync_queue', {
    field: 'user_id',
    value: ownerId,
  });
}

/** Verify that serious accessibility defects are absent from the current page. */
export async function expectAccessiblePage(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  expect(
    blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => ({
        target: node.target.join(' '),
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
}

/** Verify the Phase 12 cache boundary still holds in the built application. */
export async function expectNoSensitiveCaching(page: Page): Promise<void> {
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls: string[] = [];
    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      urls.push(...requests.map((request) => request.url));
    }
    return urls;
  });

  const forbidden = cachedUrls.filter((url) => {
    const path = new URL(url).pathname;
    return (
      path.startsWith('/api/') ||
      path.startsWith('/auth/') ||
      path.startsWith('/health') ||
      path === '/openapi.json'
    );
  });
  expect(forbidden).toEqual([]);
}

export async function expectNoUnsafeAuthStorage(page: Page): Promise<void> {
  const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
  const unsafeKeys = localStorageKeys.filter((key) =>
    /access[_-]?token|refresh[_-]?token|password|secret/i.test(key),
  );
  expect(unsafeKeys).toEqual([]);
}
