import { expect, test } from '@playwright/test';
import {
  API_BASE_URL,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_PASSWORD,
  loginApi,
  uniqueName,
} from '../utils/api';
import { loginAs, signOut } from '../utils/ui';

test('Scenario A — administrator and inspector complete an online inspection', async ({
  page,
  request,
}) => {
  const adminEmail = E2E_ADMIN_EMAIL;
  const inspectorEmail = `${uniqueName('online.inspector.e2e')}@fieldmark.test`;
  const inspectorName = 'Online E2E Inspector';
  const siteName = uniqueName('Online E2E Site');
  const siteCode = uniqueName('ONL').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  const templateName = uniqueName('Online E2E Checklist');
  const question = 'Were all safety guards present?';
  const inspectionTitle = uniqueName('Online E2E Inspection');

  await loginAs(page, adminEmail, E2E_ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await page.getByRole('button', { name: 'Add user' }).click();
  const userDialog = page.getByRole('dialog', { name: 'Create user' });
  await userDialog.getByLabel('Full name').fill(inspectorName);
  await userDialog.getByLabel('Email').fill(inspectorEmail);
  await userDialog.getByLabel('Temporary password').fill(E2E_PASSWORD);
  await userDialog.getByLabel('Role').selectOption('INSPECTOR');
  await userDialog.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByText('User created', { exact: true }).first()).toBeVisible();

  await page.getByRole('link', { name: 'Sites', exact: true }).click();
  await page.getByRole('button', { name: 'Add site' }).click();
  const siteDialog = page.getByRole('dialog', { name: 'Create site' });
  await siteDialog.locator('#site-name').fill(siteName);
  await siteDialog.locator('#site-code').fill(siteCode);
  await siteDialog.locator('#site-address').fill('100 Integration Avenue');
  await siteDialog.getByRole('button', { name: 'Create site' }).click();
  await expect(page.getByText('Site created', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Search sites').fill(siteName);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('row', { name: new RegExp(siteName) })).toBeVisible();

  await page.getByRole('link', { name: 'Checklists', exact: true }).click();
  await page.getByRole('button', { name: 'Create template' }).click();
  const templateDialog = page.getByRole('dialog', { name: 'Create checklist template' });
  await templateDialog.locator('#template-name').fill(templateName);
  await templateDialog.locator('#item-question-0').fill(question);
  await templateDialog.getByRole('button', { name: 'Create template' }).click();
  await expect(page.getByText('Template created', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Search checklists').fill(templateName);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('row', { name: new RegExp(templateName) })).toBeVisible();

  await page.getByRole('link', { name: 'Inspections', exact: true }).click();
  await page.getByRole('button', { name: 'Assign inspection' }).click();
  const assignmentDialog = page.getByRole('dialog', { name: 'Assign inspection' });
  await expect(assignmentDialog.getByText('Loading assignment options…')).toBeHidden();
  await assignmentDialog.locator('#inspection-title').fill(inspectionTitle);
  await assignmentDialog.locator('#inspection-site').selectOption({ label: `${siteName} (${siteCode})` });
  await assignmentDialog.locator('#inspection-template').selectOption({ label: `${templateName} · v1` });
  await assignmentDialog
    .locator('#inspection-assignee')
    .selectOption({ label: `${inspectorName} · ${inspectorEmail}` });
  await assignmentDialog.getByRole('button', { name: 'Assign inspection' }).click();
  await expect(page.getByText('Inspection assigned', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Search inspections').fill(inspectionTitle);
  await page.getByRole('button', { name: 'Search' }).click();

  const inspectionRow = page.getByRole('row', { name: new RegExp(inspectionTitle) });
  await expect(inspectionRow).toBeVisible();
  await expect(inspectionRow).toContainText('ASSIGNED');

  await signOut(page);
  await loginAs(page, inspectorEmail, E2E_PASSWORD);
  await expect(page).toHaveURL(/\/inspector\/dashboard$/);

  await page.getByRole('link', { name: 'My inspections' }).click();
  const inspectorRow = page.getByRole('row', { name: new RegExp(inspectionTitle) });
  await expect(inspectorRow).toBeVisible();
  await inspectorRow.getByRole('link', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start inspection' }).click();

  await expect(page.getByRole('heading', { name: 'Execute inspection' })).toBeVisible();
  await page.getByRole('group', { name: question }).getByLabel('Yes').check();
  await page.getByLabel('Overall result').selectOption('PASS');
  await page.getByRole('button', { name: 'Submit inspection' }).click();

  await expect(page.getByText('Inspection submitted', { exact: true }).first()).toBeVisible();
  const adminSession = await loginApi(request, adminEmail, E2E_ADMIN_PASSWORD);
  const inspectionList = await request.get(
    `${API_BASE_URL}/inspections?search=${encodeURIComponent(inspectionTitle)}`,
    { headers: { Authorization: `Bearer ${adminSession.token}` } },
  );
  expect(inspectionList.status()).toBe(200);
  const listBody = (await inspectionList.json()) as {
    data: Array<{ title: string; status: string }>;
  };
  expect(listBody.data).toEqual(
    expect.arrayContaining([expect.objectContaining({ title: inspectionTitle, status: 'SUBMITTED' })]),
  );

  await signOut(page);
  await loginAs(page, adminEmail, E2E_ADMIN_PASSWORD);
  await page.getByRole('link', { name: 'Inspections', exact: true }).click();
  await page.getByLabel('Search inspections').fill(inspectionTitle);
  await page.getByRole('button', { name: 'Search' }).click();
  const reviewedRow = page.getByRole('row', { name: new RegExp(inspectionTitle) });
  await expect(reviewedRow).toContainText('SUBMITTED');
  await reviewedRow.getByRole('button', { name: 'View' }).click();
  await expect(page.getByRole('dialog', { name: inspectionTitle })).toBeVisible();
});
