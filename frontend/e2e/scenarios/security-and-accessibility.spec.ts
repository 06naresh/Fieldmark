import { expect, test } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_PASSWORD } from '../utils/api';
import { createInspectionFixture } from '../utils/fixtures';
import {
  expectAccessiblePage,
  expectNoSensitiveCaching,
  expectNoUnsafeAuthStorage,
} from '../utils/browser';
import {
  expectAccessibleControls,
  expectNoHorizontalOverflow,
  loginAs,
  signOut,
  waitForServiceWorkerControl,
} from '../utils/ui';

test('Quality checks — role protection, accessibility, responsive layout, and cache safety', async ({
  page,
  request,
}) => {
  const fixture = await createInspectionFixture(request);

  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/login$/);
  await expectAccessibleControls(page);
  await expectAccessiblePage(page);

  await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await waitForServiceWorkerControl(page);
  await expect(page).toHaveURL(/\/admin\/(dashboard|users)$/);
  await expectAccessibleControls(page);
  await expectAccessiblePage(page);
  await expectNoUnsafeAuthStorage(page);
  await expectNoSensitiveCaching(page);

  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
  }
  await expectAccessiblePage(page);

  await signOut(page);
  await loginAs(page, fixture.inspectorEmail, E2E_PASSWORD);
  await expect(page).toHaveURL(/\/inspector\/dashboard$/);
  await expectAccessibleControls(page);
  await expectAccessiblePage(page);
  await expectNoUnsafeAuthStorage(page);

  await page.goto('/inspector/sync');
  await expect(page.getByRole('heading', { name: 'Sync Center' })).toBeVisible();
  await expectAccessibleControls(page);
  await expectAccessiblePage(page);
  await expectNoSensitiveCaching(page);
});
