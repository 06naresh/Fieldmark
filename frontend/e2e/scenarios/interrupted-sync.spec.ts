import { expect, test } from '@playwright/test';
import {
  E2E_PASSWORD,
  getAnswersApi,
} from '../utils/api';
import { createInspectionFixture } from '../utils/fixtures';
import { getLocalQueue } from '../utils/browser';
import {
  loginAs,
  setOffline,
  syncNowButton,
  waitForServiceWorkerControl,
} from '../utils/ui';

test('Scenario E — interrupted synchronization preserves and retries durable work', async ({
  page,
  request,
}) => {
  const fixture = await createInspectionFixture(request, {
    question: 'Was the lockout procedure followed?',
  });
  const itemId = fixture.template.items[0].id;
  const inspectionId = fixture.inspection.id;

  await loginAs(page, fixture.inspectorEmail, E2E_PASSWORD);
  await waitForServiceWorkerControl(page);
  await page.goto(`/inspector/inspections/${inspectionId}`);
  await page.getByRole('button', { name: 'Make available offline' }).click();
  await expect(page.getByText('Available offline on this device')).toBeVisible();

  await setOffline(page, true);
  await page.goto(`/inspector/inspections/${inspectionId}/execute`);
  await page.getByRole('button', { name: 'Start inspection' }).click();
  await page
    .getByRole('group', { name: fixture.question })
    .getByRole('radio', { name: 'Yes' })
    .check();
  await page.getByLabel('Overall result').selectOption('PASS');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved', { exact: true }).first()).toBeVisible();

  const before = await getLocalQueue(page, fixture.inspector.user.id);
  const operationIdsBefore = before.map((operation) => operation.id).sort();
  expect(operationIdsBefore.length).toBeGreaterThan(0);

  // Interrupt the first push attempt without changing any operation identity.
  await page.route('**/api/v1/sync/push', async (route) => {
    await route.abort('failed');
  });
  await setOffline(page, false);
  await page.goto('/inspector/sync');
  if (new URL(page.url()).pathname === '/login') {
    await loginAs(page, fixture.inspectorEmail, E2E_PASSWORD);
    await page.goto('/inspector/sync');
  }
  await expect(page.getByRole('heading', { name: 'Sync Center' })).toBeVisible();

  await expect
    .poll(async () => {
      const queue = await getLocalQueue(page, fixture.inspector.user.id);
      return queue.some((operation) => operation.status === 'FAILED');
    })
    .toBe(true);

  const afterFailure = await getLocalQueue(page, fixture.inspector.user.id);
  expect(afterFailure.map((operation) => operation.id).sort()).toEqual(operationIdsBefore);

  // Remove the transport interruption, reload so the Sync Center reads the
  // durable failed state, then return those operations to the retry queue.
  await page.unroute('**/api/v1/sync/push');
  await page.reload();
  if (new URL(page.url()).pathname === '/login') {
    await loginAs(page, fixture.inspectorEmail, E2E_PASSWORD);
    await page.goto('/inspector/sync');
  }
  await expect(page.getByRole('heading', { name: 'Sync Center' })).toBeVisible();
  const retryButtons = page.getByRole('button', { name: 'Retry' });
  await expect(retryButtons.first()).toBeVisible();
  while ((await retryButtons.count()) > 0) {
    const remaining = await retryButtons.count();
    await retryButtons.first().click();
    await expect.poll(async () => retryButtons.count()).toBeLessThan(remaining);
  }

  await syncNowButton(page).click();
  await expect
    .poll(async () => {
      const queue = await getLocalQueue(page, fixture.inspector.user.id);
      return queue.length > 0 && queue.every((operation) => operation.status === 'SYNCED');
    })
    .toBe(true);

  const afterRecovery = await getLocalQueue(page, fixture.inspector.user.id);
  expect(afterRecovery.map((operation) => operation.id).sort()).toEqual(operationIdsBefore);

  const answers = await getAnswersApi(request, fixture.inspector.token, inspectionId);
  const matching = answers.filter((answer) => answer.checklist_item_id === itemId);
  expect(matching).toHaveLength(1);
  expect(matching[0].answer_value).toBe(true);
});
