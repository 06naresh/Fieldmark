import { spawnSync } from 'node:child_process';

const backendPort = process.env.E2E_BACKEND_PORT ?? '8000';
const apiBaseUrl =
  process.env.E2E_API_BASE_URL ?? `http://localhost:${backendPort}/api/v1`;

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['run', 'build'], {
  shell: process.platform === 'win32',
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_BASE_URL: apiBaseUrl,
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
