import { expect, test } from '@playwright/test';
import {
  answerOperation,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  getAnswersApi,
  listConflictsApi,
  pushOperationsApi,
  randomId,
  registerDeviceApi,
  saveAnswerApi,
  startInspectionApi,
} from '../utils/api';
import { createInspectionFixture } from '../utils/fixtures';
import { loginAs } from '../utils/ui';

test('Scenario D — stale offline answer is detected, reviewed, and resolved', async ({
  page,
  request,
}) => {
  const fixture = await createInspectionFixture(request, {
    question: 'Is the fire extinguisher inspected?',
  });
  const itemId = fixture.template.items[0].id;
  const inspectionId = fixture.inspection.id;
  const device = await registerDeviceApi(request, fixture.inspector.token, 'conflict-device');
  await startInspectionApi(
    request,
    fixture.inspector.token,
    inspectionId,
    fixture.inspection.version,
  );

  const entityId = randomId();
  const created = await pushOperationsApi(request, fixture.inspector.token, device.id, [
    answerOperation({
      inspectionId,
      itemId,
      entityId,
      value: false,
      notes: 'Offline baseline',
    }),
  ]);
  expect(created[0].status).toBe('ACCEPTED');

  // Another authorized session changes the same answer to version 2.
  const authoritative = await saveAnswerApi(
    request,
    fixture.inspector.token,
    inspectionId,
    itemId,
    true,
    1,
  );
  expect(authoritative.id).toBe(entityId);
  expect(authoritative.version).toBe(2);

  // The stale offline operation still carries base version 1.
  const stale = await pushOperationsApi(request, fixture.inspector.token, device.id, [
    answerOperation({
      inspectionId,
      itemId,
      entityId,
      value: false,
      baseVersion: 1,
      operationType: 'UPDATE',
      notes: 'Stale offline edit',
    }),
  ]);
  expect(stale[0].status).toBe('CONFLICT');

  const openConflicts = await listConflictsApi(request, fixture.admin.token);
  const conflict = openConflicts.find((candidate) => candidate.entity_id === entityId);
  expect(conflict).toBeDefined();
  expect(conflict?.entity_type).toBe('inspection_answer');
  expect(conflict?.server_version).toBe(2);

  await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await page.goto('/admin/sync');
  const conflictRow = page.getByRole('row').filter({ hasText: entityId });
  await expect(conflictRow).toBeVisible();
  await conflictRow.getByRole('button', { name: 'Review' }).click();

  const dialog = page.getByRole('dialog').filter({ hasText: 'Conflict details' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Local version' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Server version' })).toBeVisible();
  await expect(dialog.getByText('false', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText('true', { exact: true }).first()).toBeVisible();

  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Apply administrative resolution' }).click();
  await expect(page.getByText('Conflict resolved', { exact: true }).first()).toBeVisible();

  await expect
    .poll(async () => {
      const resolved = await listConflictsApi(request, fixture.admin.token, 'RESOLVED');
      return resolved.find((candidate) => candidate.id === conflict?.id)?.status;
    })
    .toBe('RESOLVED');

  const finalAnswers = await getAnswersApi(request, fixture.admin.token, inspectionId);
  const finalAnswer = finalAnswers.find((answer) => answer.checklist_item_id === itemId);
  expect(finalAnswer?.answer_value).toBe(true);
  expect(finalAnswer?.version).toBe(2);
});
