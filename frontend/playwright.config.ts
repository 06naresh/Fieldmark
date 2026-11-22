import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const workspaceRoot = fileURLToPath(new URL('.', import.meta.url));
const backendDir = resolve(workspaceRoot, '../backend');
const frontendOrigin = process.env.E2E_FRONTEND_ORIGIN ?? 'http://localhost:4173';
const backendPort = process.env.E2E_BACKEND_PORT ?? '8000';

function resolveBackendPython(): string {
  if (process.env.E2E_BACKEND_PYTHON) {
    return process.env.E2E_BACKEND_PYTHON;
  }

  const windowsPython = resolve(backendDir, '.venv/Scripts/python.exe');
  const unixPython = resolve(backendDir, '.venv/bin/python');
  if (existsSync(windowsPython)) {
    return windowsPython;
  }
  if (existsSync(unixPython)) {
    return unixPython;
  }
  return 'python';
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  globalSetup: './e2e/globalSetup.ts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  use: {
    baseURL: frontendOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `"${resolveBackendPython()}" -m uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}`,
      cwd: backendDir,
      url: `http://127.0.0.1:${backendPort}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        APP_ENV: 'development',
        FRONTEND_ORIGINS: [frontendOrigin, 'http://localhost:5173'].join(','),
      },
    },
    {
      command: 'npm run preview -- --host localhost --port 4173 --strictPort',
      cwd: workspaceRoot,
      url: frontendOrigin,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
