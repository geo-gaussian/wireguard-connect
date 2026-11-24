import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const result = spawnSync('sh', [join(import.meta.dirname, 'setup.sh')], { stdio: 'inherit' });
if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
