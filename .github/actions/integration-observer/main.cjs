const { spawnSync } = require('node:child_process');
const path = require('node:path');

const result = spawnSync('sh', [path.join(__dirname, 'setup.sh')], { stdio: 'inherit' });
if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
