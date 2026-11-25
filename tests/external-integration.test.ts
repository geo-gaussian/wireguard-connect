import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const scripts = join(process.cwd(), '.github/actions/external-observer');
const fixtures = join(process.cwd(), 'tests/fixtures/external-integration');

describe('external service verification', () => {
  let directory: string;
  let argumentsFile: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'wireguard-external-test-'));
    argumentsFile = join(directory, 'arguments');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function verify(extra: NodeJS.ProcessEnv = {}) {
    return spawnSync('sh', [join(scripts, 'verify-service.sh')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fixtures}:${process.env.PATH}`,
        INTERFACE: 'wgc12345678',
        PRIVATE_SERVICE_URL: 'http://service.internal.test/health',
        CURL_ARGUMENTS_FILE: argumentsFile,
        ...extra,
      },
    });
  }

  it('uses the tunnel interface and rejects proxy use for the service request', () => {
    const result = verify();
    expect(result.status).toBe(0);
    const args = readFileSync(argumentsFile, 'utf8').trim().split('\n');
    expect(args).toContain('--interface');
    expect(args[args.indexOf('--interface') + 1]).toBe('wgc12345678');
    expect(args[args.indexOf('--noproxy') + 1]).toBe('*');
    expect(args.slice(-2)).toEqual(['--', 'http://service.internal.test/health']);
  });

  it.each(['', undefined])('rejects a missing service URL', (url) => {
    const result = verify({ PRIVATE_SERVICE_URL: url });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('private service URL are required');
  });

  it('rejects a non-success HTTP response', () => {
    const result = verify({ CURL_HTTP_STATUS: '302' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('did not return a successful HTTP status');
  });

  it('fails when the request cannot connect', () => {
    expect(verify({ CURL_EXIT_CODE: '7' }).status).not.toBe(0);
  });
});

describe('external cleanup observation', () => {
  function verify(extra: NodeJS.ProcessEnv = {}) {
    return spawnSync('sh', [join(scripts, 'verify-clean.sh')], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fixtures}:${process.env.PATH}`, ...extra },
    });
  }

  it('accepts a runner without action resources', () => {
    expect(verify().status).toBe(0);
  });

  it('fails when an action configuration remains', () => {
    const result = verify({ CONFIGURATIONS: '/etc/wireguard/wgc12345678.conf' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('configuration remains');
  });

  it('fails when an action interface remains', () => {
    const result = verify({ IP_LINKS: '5: wgc12345678: <UP>' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('interface remains');
  });

  it('fails when resource inspection fails', () => {
    expect(verify({ SUDO_FIND_EXIT_CODE: '1' }).status).not.toBe(0);
    expect(verify({ IP_EXIT_CODE: '1' }).status).not.toBe(0);
  });
});
