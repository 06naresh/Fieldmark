import { expect, test } from '@playwright/test';
import {
  E2E_PASSWORD,
  getAnswersApi,
  getInspectionApi,
} from '../utils/api';
import { createInspectionFixture } from '../utils/fixtures';
import { getLocalAnswers, getLocalQueue } from '../utils/browser';
import {
  loginAs,
  setOffline,
  syncNowButton,
  waitForServiceWorkerControl,
} from '../utils/ui';

test('Scenario B — offline inspection survives refresh and synchronizes', async ({
  page,
  request,
}) => {
  const fixture = await createInspectionFixture(request, {
    question: 'Were machine guards fitted before startup?',
  });
  const itemId = fixture.template.items[0].id;
  const inspectionId = fixture.inspection.id;

  await loginAs(page, fixture.inspectorEmail, E2E_PASSWORD);
  await waitForServiceWorkerControl(page);

  await page.goto(`/inspector/inspections/${inspectionId}`);
  await expect(page.getByRole('heading', { name: fixture.inspection.title })).toBeVisible();
  await page.getByRole('button', { name: 'Make available offline' }).click();
  await expect(page.getByText('Available offline on this device')).toBeVisible();

  await setOffline(page, true);
  await page.goto(`/inspector/inspections/${inspectionId}/execute`);
  await page.getByRole('button', { name: 'Start inspection' }).click();
  await expect(page.getByRole('heading', { name: 'Execute inspection' })).toBeVisible();

  const questionGroup = page.getByRole('group', { name: fixture.question });
  await questionGroup.getByRole('radio', { name: 'Yes' }).check();
  await page.getByLabel('Overall result').selectOption('PASS');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved', { exact: true }).first()).toBeVisible();

  const pendingAnswers = await getLocalAnswers(page, fixture.inspector.user.id);
  const pendingAnswer = pendingAnswers.find((answer) => answer.checklist_item_id === itemId);
  expect(pendingAnswer?.value).toBe(true);
  expect(pendingAnswer?.sync_status).toBe('pending');
  expect(pendingAnswer?.operation_id).toBeTruthy();

  const pendingQueue = await getLocalQueue(page, fixture.inspector.user.id);
  expect(pendingQueue.filter((operation) => operation.status === 'PENDING').length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Execute inspection' })).toBeVisible();
  await expect(
    page.getByRole('group', { name: fixture.question }).getByRole('radio', { name: 'Yes' }),
  ).toBeChecked();

  await setOffline(page, false);
  await page.goto('/inspector/sync');
  await expect(page.getByRole('heading', { name: 'Sync Center' })).toBeVisible();
  const syncButton = syncNowButton(page);
  await expect(syncButton).toBeEnabled();
  await syncButton.click();

  await expect
    .poll(async () => {
      const answers = await getLocalAnswers(page, fixture.inspector.user.id);
      return answers.find((answer) => answer.checklist_item_id === itemId)?.sync_status;
    })
    .toBe('synced');

  await expect
    .poll(async () => {
      const answers = await getAnswersApi(
        request,
        fixture.inspector.token,
        inspectionId,
      );
      return answers.find((answer) => answer.checklist_item_id === itemId)?.answer_value;
    })
    .toBe(true);

  const inspection = await getInspectionApi(request, fixture.inspector.token, inspectionId);
  expect(inspection.status).toBe('IN_PROGRESS');

  const adminAnswers = await getAnswersApi(request, fixture.admin.token, inspectionId);
  expect(adminAnswers.some((answer) => answer.answer_value === true)).toBe(true);

  await expect(page.getByText('Synchronization complete', { exact: true }).first()).toBeVisible();
});
