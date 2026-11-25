import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const wrapper = join(root, '.github/actions/expected-ping-failure/main.mts');
const fixture = join(root, 'tests/fixtures/integration-failure/main.cjs');

describe('expected ping failure wrapper', () => {
  let directory: string;
  let script: string;
  let outputFile: string;
  let stateFile: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'wireguard-failure-test-'));
    const actionDirectory = join(directory, '.github/actions/expected-ping-failure');
    const bundleDirectory = join(directory, 'dist/main');
    mkdirSync(actionDirectory, { recursive: true });
    mkdirSync(bundleDirectory, { recursive: true });
    script = join(actionDirectory, 'main.mts');
    outputFile = join(directory, 'output');
    stateFile = join(directory, 'state');
    copyFileSync(wrapper, script);
    copyFileSync(fixture, join(bundleDirectory, 'index.js'));
    writeFileSync(outputFile, '');
    writeFileSync(stateFile, '');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function run(scenario: string) {
    return spawnSync(process.execPath, [script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        FIXTURE_SCENARIO: scenario,
        GITHUB_OUTPUT: outputFile,
        GITHUB_STATE: stateFile,
      },
    });
  }

  it('suppresses only the expected annotation and preserves the failure and action state', () => {
    const result = run('expected');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('The expected test host verification failed.');
    expect(result.stdout).not.toContain('::error::');
    expect(result.stdout).toContain('::add-mask::fixture-private-key');
    expect(result.stdout).toContain('::notice::fixture output');
    expect(result.stderr).toContain('fixture diagnostic');
    expect(readFileSync(outputFile, 'utf8')).toBe('expected-ping-failure=true\n');
    expect(readFileSync(stateFile, 'utf8')).toBe('interfaceName=fixture-interface\n');
  });

  it.each([
    ['unexpected', 2, '::error::Unexpected setup failure'],
    ['multiple-errors', 1, '::error::Another failure'],
    ['stderr-error', 1, '::error::Unexpected stderr failure'],
    ['duplicate', 1, 'The expected test host verification failed.'],
    ['success', 0, '::notice::fixture output'],
  ])('does not accept the %s scenario as the expected failure', (scenario, status, message) => {
    const result = run(scenario);
    expect(result.status).toBe(status);
    expect(result.stdout + result.stderr).toContain(message);
    expect(readFileSync(outputFile, 'utf8')).toBe('expected-ping-failure=false\n');
  });
});

it('rejects a failed action when the expected ping failure was not observed', () => {
  const result = spawnSync('sh', [join(root, '.github/actions/integration-test/verify.sh')], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SCENARIO: 'failure',
      TUNNEL_OUTCOME: 'failure',
      EXPECTED_PING_FAILURE: 'false',
    },
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Unexpected integration scenario outcome.');
});
