import { expect, test } from '@playwright/test';
import { API_BASE_URL, E2E_PASSWORD } from '../utils/api';
import { createInspectionFixture } from '../utils/fixtures';
import { loginAs } from '../utils/ui';

test('User isolation — inspectors cannot access another assignment', async ({
  page,
  request,
}) => {
  const inspectorA = await createInspectionFixture(request, {
    question: 'Inspector A question?',
    title: 'Inspector A isolated inspection',
  });
  const inspectorB = await createInspectionFixture(request, {
    question: 'Inspector B question?',
    title: 'Inspector B isolated inspection',
  });

  await loginAs(page, inspectorA.inspectorEmail, E2E_PASSWORD);
  await expect(page).toHaveURL(/\/inspector\/dashboard$/);

  const forbidden = await request.get(
    `${API_BASE_URL}/inspections/${inspectorB.inspection.id}`,
    { headers: { Authorization: `Bearer ${inspectorA.inspector.token}` } },
  );
  expect([403, 404]).toContain(forbidden.status());

  await page.goto('/inspector/inspections');
  await expect(page.getByRole('heading', { name: 'My inspections' })).toBeVisible();
  await expect(page.getByText(inspectorA.inspection.title)).toBeVisible();
  await expect(page.getByText(inspectorB.inspection.title)).toHaveCount(0);

  await page.goto(`/inspector/inspections/${inspectorB.inspection.id}/execute`);
  await expect(
    page.getByText(/not assigned|permission|forbidden/i).first(),
  ).toBeVisible();

  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/inspector\/dashboard$/);
});
