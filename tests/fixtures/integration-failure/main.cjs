const { appendFileSync } = require('node:fs');

appendFileSync(process.env.GITHUB_STATE, 'interfaceName=fixture-interface\n');
process.stdout.write('::add-mask::fixture-private-key\n');
process.stdout.write('::notice::fixture output\n');
process.stderr.write('fixture diagnostic\n');

const expected = "::error::The process '/usr/bin/ping' failed with exit code 1\n";
switch (process.env.FIXTURE_SCENARIO) {
  case 'expected':
    process.stdout.write(expected.slice(0, 20));
    process.stdout.write(expected.slice(20));
    process.exitCode = 1;
    break;
  case 'unexpected':
    process.stdout.write('::error::Unexpected setup failure\n');
    process.exitCode = 2;
    break;
  case 'multiple-errors':
    process.stdout.write(expected);
    process.stdout.write('::error::Another failure\n');
    process.exitCode = 1;
    break;
  case 'stderr-error':
    process.stdout.write(expected);
    process.stderr.write('::error::Unexpected stderr failure\n');
    process.exitCode = 1;
    break;
  case 'duplicate':
    process.stdout.write(expected + expected);
    process.exitCode = 1;
    break;
  case 'success':
    process.exitCode = 0;
    break;
  default:
    throw new Error('Unknown fixture scenario.');
}
