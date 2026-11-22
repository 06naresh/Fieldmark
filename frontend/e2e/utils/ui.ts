import { expect, type Locator, type Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** The Sync Center page action is the last button with this accessible name. */
export function syncNowButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Synchronize now' }).last();
}

export async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), undefined, {
    timeout: 30_000,
  });
}

export async function setOffline(page: Page, offline: boolean): Promise<void> {
  await page.context().setOffline(offline);
  if (!offline) {
    await page.waitForFunction(() => navigator.onLine === true);
  }
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

export async function expectAccessibleControls(page: Page): Promise<void> {
  const unnamed = await page.evaluate(() => {
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]'),
    );
    return controls
      .filter((control) => {
        if (control.hasAttribute('aria-hidden') || control.getAttribute('hidden') !== null) {
          return false;
        }
        const label = control.getAttribute('aria-label');
        const labelledBy = control.getAttribute('aria-labelledby');
        const text = control.textContent?.trim();
        const id = control.id;
        const hasLabel = Boolean(
          label ||
            labelledBy ||
            text ||
            (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)),
        );
        return !hasLabel;
      })
      .map((control) => `${control.tagName.toLowerCase()}#${control.id || '(no id)'}`);
  });

  expect(unnamed).toEqual([]);
}
