import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(process.cwd(), 'scripts/validate-release.sh');

describe('main CI verification', () => {
  let temporaryDirectory: string;
  let argumentsFile: string;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'wireguard-ci-test-'));
    argumentsFile = join(temporaryDirectory, 'arguments');
  });

  afterEach(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  function verify(scenario: string, extra: NodeJS.ProcessEnv = {}) {
    return spawnSync(process.execPath, [join(process.cwd(), 'scripts/verify-main-ci.mts')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${join(process.cwd(), 'tests/fixtures/main-ci/bin')}:${process.env.PATH}`,
        GITHUB_REPOSITORY: 'example/project',
        GITHUB_SHA: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        GH_ARGUMENTS_FILE: argumentsFile,
        GH_SCENARIO: scenario,
        ...extra,
      },
    });
  }

  it('accepts a successful main run with every required job', () => {
    const result = verify('success');
    expect(result.status).toBe(0);
    const calls: string[][] = readFileSync(argumentsFile, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('repos/example/project/actions/workflows/build-and-test.yaml/runs');
    expect(calls[0]).toContain('branch=main');
    expect(calls[0]).toContain('event=push');
    expect(calls[0]).toContain('head_sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(calls[1]).toContain('repos/example/project/actions/runs/1/jobs');
    expect(calls[1]).toContain('filter=all');
  });

  it('accepts a successful partial rerun using the latest result for each job', () => {
    expect(verify('rerun-passed').status).toBe(0);
  });

  it.each([
    'missing-run',
    'wrong-commit',
    'pending-run',
    'failed-run',
    'latest-failed',
    'truncated-runs',
    'missing-job',
    'missing-node-24',
    'failed-job',
    'skipped-job',
    'duplicate-job',
    'rerun-skipped',
    'invalid-response',
    'api-error',
  ])('rejects %s', (scenario) => {
    const result = verify(scenario);
    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toBe('');
  });

  it('rejects an invalid commit before querying GitHub', () => {
    const result = verify('success', { GITHUB_SHA: 'not-a-commit' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('valid GitHub repository and commit SHA are required');
  });
});

it('accepts a version tag requested from main', () => {
  const result = spawnSync('sh', [script], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_REF: 'refs/heads/main', RELEASE_TAG: 'v0.1.0' },
  });
  expect(result.status).toBe(0);
});

it.each(['v01.1.0', 'v1.2.3;echo injected', 'v1.2.3\nother', 'main', ''])(
  'rejects invalid release tag %s',
  (tag) => {
    const result = spawnSync('sh', [script], {
      encoding: 'utf8',
      env: { ...process.env, GITHUB_REF: 'refs/heads/main', RELEASE_TAG: tag },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Release tag must be a version');
  },
);

it('rejects release requests from other refs', () => {
  const result = spawnSync('sh', [script], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_REF: 'refs/heads/feature', RELEASE_TAG: 'v1.2.3' },
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Release tags must be prepared from main.');
});

describe('release publication', () => {
  let temporaryDirectory: string;
  let checkout: string;
  let remote: string;

  const git = (cwd: string, ...args: string[]): string =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

  const publish = () =>
    spawnSync('sh', ['scripts/publish-release.sh'], {
      cwd: checkout,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_REF: 'refs/heads/main', RELEASE_TAG: 'v0.1.0' },
    });

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'wireguard-release-'));
    checkout = join(temporaryDirectory, 'checkout');
    remote = join(temporaryDirectory, 'remote.git');
    mkdirSync(checkout);
    git(temporaryDirectory, 'init', '--bare', remote);
    git(checkout, 'init', '--initial-branch=main');
    git(checkout, 'config', 'user.name', 'Release Test');
    git(checkout, 'config', 'user.email', 'release-test@example.invalid');
    mkdirSync(join(checkout, 'scripts'));
    copyFileSync(join(process.cwd(), '.gitignore'), join(checkout, '.gitignore'));
    for (const name of ['publish-release.sh', 'validate-release.sh']) {
      copyFileSync(join(process.cwd(), 'scripts', name), join(checkout, 'scripts', name));
    }
    git(checkout, 'add', '.gitignore', 'scripts');
    git(checkout, 'commit', '-m', 'Initial source');
    git(checkout, 'remote', 'add', 'origin', remote);
    git(checkout, 'push', 'origin', 'main');
    for (const [directory, packageName] of [
      ['main', 'core'],
      ['post', 'io'],
    ]) {
      mkdirSync(join(checkout, 'dist', directory), { recursive: true });
      copyFileSync(
        join(process.cwd(), 'node_modules', '@actions', packageName, 'lib', `${packageName}.js`),
        join(checkout, 'dist', directory, 'index.js'),
      );
    }
  });

  afterEach(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('tags a separate commit containing both bundles without changing main', () => {
    const main = git(checkout, '--git-dir', remote, 'rev-parse', 'refs/heads/main');
    const result = publish();
    expect(result.status).toBe(0);
    expect(git(checkout, '--git-dir', remote, 'rev-parse', 'refs/heads/main')).toBe(main);
    expect(git(checkout, '--git-dir', remote, 'rev-parse', 'refs/tags/v0.1.0^')).toBe(main);
    for (const path of ['dist/main/index.js', 'dist/post/index.js']) {
      expect(git(checkout, '--git-dir', remote, 'show', `refs/tags/v0.1.0:${path}`)).toBe(
        readFileSync(join(checkout, path), 'utf8').trim(),
      );
    }
  });

  it('rejects a tag that already exists on the remote', () => {
    git(checkout, 'tag', 'v0.1.0');
    git(checkout, 'push', 'origin', 'refs/tags/v0.1.0');
    const result = publish();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('The release tag already exists.');
  });

  it('rejects an outdated source commit', () => {
    const source = git(checkout, 'rev-parse', 'HEAD');
    git(checkout, 'commit', '--allow-empty', '-m', 'Advance main');
    git(checkout, 'push', 'origin', 'main');
    git(checkout, 'checkout', '--detach', source);
    const result = publish();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Main changed during release preparation');
    expect(git(checkout, '--git-dir', remote, 'tag', '--list')).toBe('');
  });

  it('refuses to publish if a bundle is missing', () => {
    unlinkSync(join(checkout, 'dist', 'post', 'index.js'));
    expect(publish().status).not.toBe(0);
    expect(git(checkout, '--git-dir', remote, 'tag', '--list')).toBe('');
  });
});
