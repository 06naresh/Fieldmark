import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const backendDir = resolve(workspaceRoot, 'backend');

function resolvePython(): string {
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

export default async function globalSetup(): Promise<void> {
  // The helper writes directly to the configured development PostgreSQL
  // database, so it does not depend on Playwright webServer startup order.
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin.e2e@fieldmark.test';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'FieldmarkE2E!23';
  const script = resolve(backendDir, 'scripts/seed_e2e_admin.py');
  const result = spawnSync(
    resolvePython(),
    [script, '--email', email, '--password', password],
    { cwd: backendDir, encoding: 'utf8' },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`E2E admin seeding failed: ${result.stderr || result.stdout}`);
  }
}
