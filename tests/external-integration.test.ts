import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
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
    expect(args[args.indexOf('--output') + 1]).toBe('/dev/fd/3');
    expect(args).not.toContain('--location');
    expect(args.slice(-2)).toEqual(['--', 'http://service.internal.test/health']);
  });

  it.each(['', undefined])('rejects a missing service URL', (url) => {
    const result = verify({ PRIVATE_SERVICE_URL: url });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('private service URL are required');
  });

  it.each(['200', '299', '300', '302', '399'])('accepts HTTP %s', (status) => {
    const result = verify({ CURL_HTTP_STATUS: status });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`HTTP status: ${status}`);
  });

  it.each(['199', '400', '500'])('rejects HTTP %s', (status) => {
    const result = verify({ CURL_HTTP_STATUS: status });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain(`HTTP status: ${status}`);
    expect(result.stderr).toContain('did not return a successful HTTP status');
  });

  it('logs the response body with workflow commands disabled', () => {
    const body = '::error::untrusted response';
    const result = verify({ CURL_RESPONSE_BODY: body });
    const match = /::stop-commands::([0-9a-f]{32})\n/.exec(result.stdout);
    expect(result.status).toBe(0);
    expect(match).not.toBeNull();
    const token = match?.[1];
    expect(result.stdout.indexOf(body)).toBeGreaterThan(result.stdout.indexOf('::stop-commands::'));
    expect(result.stdout.indexOf(`::${token}::`)).toBeGreaterThan(result.stdout.indexOf(body));
  });

  it('fails when the request cannot connect', () => {
    const result = verify({ CURL_EXIT_CODE: '7', CURL_RESPONSE_BODY: 'partial response' });
    const match = /::stop-commands::([0-9a-f]{32})\n/.exec(result.stdout);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('request failed');
    expect(match).not.toBeNull();
    expect(result.stdout).toContain(`::${match?.[1]}::`);
  });

  const loopbackTest = process.platform === 'linux' || process.platform === 'darwin' ? it : it.skip;
  loopbackTest.each([
    { status: 302, exitCode: 0 },
    { status: 404, exitCode: 1 },
  ])(
    'logs a real HTTP $status response without following redirects',
    async ({ status, exitCode }) => {
      const requests: string[] = [];
      const server = createServer((request, response) => {
        requests.push(request.url ?? '');
        response.writeHead(status, { Location: '/redirected' });
        response.end('::error::response body');
      });
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      try {
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('No test server address.');
        const child = spawn('sh', [join(scripts, 'verify-service.sh')], {
          env: {
            ...process.env,
            INTERFACE: process.platform === 'linux' ? 'lo' : 'lo0',
            PRIVATE_SERVICE_URL: `http://127.0.0.1:${address.port}/health`,
          },
        });
        let output = '';
        let errors = '';
        child.stdout.setEncoding('utf8').on('data', (data: string) => {
          output += data;
        });
        child.stderr.setEncoding('utf8').on('data', (data: string) => {
          errors += data;
        });
        const [code] = await once(child, 'close');
        expect(code).toBe(exitCode);
        if (exitCode === 0) expect(errors).toBe('');
        else expect(errors).toContain('did not return a successful HTTP status');
        expect(output).toContain('::error::response body');
        expect(output).toContain(`HTTP status: ${status}`);
        expect(requests).toEqual(['/health']);
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    },
  );
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
