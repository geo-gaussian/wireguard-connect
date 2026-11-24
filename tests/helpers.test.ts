import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const observer = join(process.cwd(), '.github/actions/integration-observer');

it('rejects peer setup outside a GitHub-hosted runner', () => {
  const result = spawnSync(process.execPath, [join(observer, 'main.mts')], {
    encoding: 'utf8',
    env: { ...process.env, RUNNER_ENVIRONMENT: 'self-hosted', RUNNER_OS: 'Linux' },
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Integration tests require a GitHub-hosted Linux runner.');
});

it('requires a PID file before starting the private test service', () => {
  const result = spawnSync(process.execPath, [join(observer, 'service.mts')], {
    encoding: 'utf8',
    env: { ...process.env, SERVICE_PID_FILE: '' },
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('SERVICE_PID_FILE is required.');
});
