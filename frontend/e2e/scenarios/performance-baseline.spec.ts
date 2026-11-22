import { expect, test } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from '../utils/api';
import { loginAs } from '../utils/ui';

test('Performance baseline — production shell loads within the QA threshold', async ({ page }) => {
  await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

  const timings = await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByName('first-contentful-paint')[0] as
      | PerformanceEntry
      | undefined;
    return {
      duration: navigation?.duration ?? Number.POSITIVE_INFINITY,
      firstContentfulPaint: paint?.startTime ?? Number.POSITIVE_INFINITY,
    };
  });

  expect(timings.duration).toBeLessThan(15_000);
  expect(timings.firstContentfulPaint).toBeLessThan(10_000);
});
