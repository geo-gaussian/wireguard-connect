import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { join } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const hook = join(root, '.githooks', 'pre-commit');

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: root,
  stdio: 'inherit',
});
chmodSync(hook, 0o755);
console.log('Git hooks installed at .githooks.');
