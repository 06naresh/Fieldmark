import { expect, test } from '@playwright/test';
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_PASSWORD,
  getAnswersApi,
  getInspectionApi,
  getInspectionDetailApi,
} from '../utils/api';
import { createInspectionFixture } from '../utils/fixtures';
import { getLocalAnswers, getLocalQueue } from '../utils/browser';
import {
  loginAs,
  setOffline,
  signOut,
  syncNowButton,
  waitForServiceWorkerControl,
} from '../utils/ui';

test('Scenario B — offline submission survives refresh, synchronizes, and is reviewable', async ({
  page,
  request,
}) => {
  const fixture = await createInspectionFixture(request, {
    question: 'Were machine guards fitted before startup?',
  });
  const itemId = fixture.template.items[0].id;
  const inspectionId = fixture.inspection.id;
  const note = 'Guard fitted and photographed during the offline walkthrough.';
  const summary = 'Offline inspection completed with no exceptions.';

  await loginAs(page, fixture.inspectorEmail, E2E_PASSWORD);
  await waitForServiceWorkerControl(page);

  // The offline copy is created from an explicit, discoverable list action.
  await page.goto('/inspector/inspections');
  const assignmentRow = page.getByRole('row', { name: new RegExp(fixture.inspection.title) });
  const downloadButton = assignmentRow.getByRole('button', {
    name: `Download ${fixture.inspection.title} for offline use`,
  });
  await expect(downloadButton).toBeVisible();
  await downloadButton.click();
  await expect(assignmentRow.getByText('Downloaded')).toBeVisible();
  await page.goto(`/inspector/inspections/${inspectionId}`);
  await expect(page.getByText('Available offline on this device')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh offline copy' })).toBeVisible();

  await setOffline(page, true);
  await page.goto(`/inspector/inspections/${inspectionId}/execute`);
  await page.getByRole('button', { name: 'Start inspection' }).click();
  await expect(page.getByRole('heading', { name: 'Execute inspection' })).toBeVisible();

  const questionGroup = page.getByRole('group', { name: fixture.question });
  await questionGroup.getByRole('radio', { name: 'Yes' }).check();
  await page.getByLabel('Notes').first().fill(note);
  await page.getByLabel('Overall result').selectOption('PASS');
  await page.getByLabel('Summary').fill(summary);
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved', { exact: true }).first()).toBeVisible();

  const pendingAnswers = await getLocalAnswers(page, fixture.inspector.user.id);
  const pendingAnswer = pendingAnswers.find((answer) => answer.checklist_item_id === itemId);
  expect(pendingAnswer?.value).toBe(true);
  expect(pendingAnswer?.remarks).toBe(note);
  expect(pendingAnswer?.sync_status).toBe('pending');
  expect(pendingAnswer?.operation_id).toBeTruthy();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Execute inspection' })).toBeVisible();
  await expect(
    page.getByRole('group', { name: fixture.question }).getByRole('radio', { name: 'Yes' }),
  ).toBeChecked();
  await expect(page.getByLabel('Notes').first()).toHaveValue(note);

  await page.getByRole('button', { name: 'Submit inspection' }).click();
  await expect(page.getByText('Submission saved offline', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Submission pending synchronization')).toBeVisible();
  await expect(page.getByText(summary, { exact: true })).toBeVisible();

  const submittedQueue = await getLocalQueue(page, fixture.inspector.user.id);
  expect(
    submittedQueue.some(
      (operation) => operation.entity_type === 'inspection' && operation.operation_type === 'SUBMIT',
    ),
  ).toBe(true);

  await setOffline(page, false);
  await page.goto('/inspector/sync');
  await expect(page.getByRole('heading', { name: 'Sync Center' })).toBeVisible();
  const syncButton = syncNowButton(page);
  await expect(syncButton).toBeEnabled();
  await syncButton.click();
  await expect(page.getByText('Synchronization complete', { exact: true }).first()).toBeVisible();

  await expect
    .poll(async () => {
      const answers = await getLocalAnswers(page, fixture.inspector.user.id);
      return answers.find((answer) => answer.checklist_item_id === itemId)?.sync_status;
    })
    .toBe('synced');

  await expect
    .poll(async () => {
      const answers = await getAnswersApi(request, fixture.inspector.token, inspectionId);
      return answers.find((answer) => answer.checklist_item_id === itemId)?.answer_value;
    })
    .toBe(true);

  await expect
    .poll(async () => {
      const answers = await getAnswersApi(request, fixture.inspector.token, inspectionId);
      return answers.find((answer) => answer.checklist_item_id === itemId)?.notes;
    })
    .toBe(note);

  await expect
    .poll(async () => (await getInspectionApi(request, fixture.inspector.token, inspectionId)).status)
    .toBe('SUBMITTED');

  await expect
    .poll(async () => {
      const detail = await getInspectionDetailApi(request, fixture.inspector.token, inspectionId);
      return detail.result?.submission_number;
    })
    .toBe(1);

  const syncedDetail = await getInspectionDetailApi(
    request,
    fixture.inspector.token,
    inspectionId,
  );
  expect(syncedDetail.result).toEqual(
    expect.objectContaining({ overall_status: 'PASS', summary }),
  );
  expect(syncedDetail.answers.find((answer) => answer.checklist_item_id === itemId)?.notes).toBe(
    note,
  );

  const adminDetail = await getInspectionDetailApi(request, fixture.admin.token, inspectionId);
  expect(adminDetail.result).toEqual(
    expect.objectContaining({ overall_status: 'PASS', summary }),
  );
  expect(adminDetail.answers.find((answer) => answer.checklist_item_id === itemId)?.notes).toBe(
    note,
  );

  await page.goto(`/inspector/inspections/${inspectionId}`);
  await expect(page.getByRole('heading', { name: /Submission #1/ })).toBeVisible();
  await expect(page.getByText(summary, { exact: true })).toBeVisible();
  await expect(page.getByText(note, { exact: true })).toBeVisible();

  await signOut(page);
  await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await page.getByRole('link', { name: 'Inspections', exact: true }).click();
  await page.getByLabel('Search inspections').fill(fixture.inspection.title);
  await page.getByRole('button', { name: 'Search' }).click();
  const adminRow = page.getByRole('row', { name: new RegExp(fixture.inspection.title) });
  await adminRow.getByRole('button', { name: 'View' }).click();
  const detailsDialog = page.getByRole('dialog', { name: fixture.inspection.title });
  await expect(detailsDialog.getByRole('heading', { name: /Submission #1/ })).toBeVisible();
  await expect(detailsDialog.getByText(summary, { exact: true })).toBeVisible();
  await expect(detailsDialog.getByText(note, { exact: true })).toBeVisible();
});
