import * as core from '@actions/core';
import * as fs from 'node:fs';
import * as linux from '../src/platforms/linux';
import { run } from '../src/main';

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setSecret: jest.fn(),
  saveState: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  error: jest.fn(),
}));
jest.mock('node:fs');
jest.mock('../src/platforms/linux', () => ({
  ensureWireGuard: jest.fn(),
  up: jest.fn(),
  down: jest.fn(),
  configureDns: jest.fn(),
  verifyHost: jest.fn(),
}));

const originalPlatform = process.platform;
const originalEnvironment = process.env.RUNNER_ENVIRONMENT;
const privateKey = Buffer.alloc(32, 1).toString('base64');
const publicKey = Buffer.alloc(32, 2).toString('base64');
let inputs: Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  process.env.RUNNER_ENVIRONMENT = 'github-hosted';
  inputs = {
    'private-key': privateKey,
    address: '10.20.0.2/32',
    'server-public-key': publicKey,
    endpoint: 'vpn.example.org:51820',
    'allowed-ips': '10.20.0.0/24',
    'dns-server': '10.20.0.1',
    'dns-domains': 'internal.example',
    'verify-host': 'host.internal.example',
  };
  jest.mocked(core.getInput).mockImplementation((name) => inputs[name] ?? '');
  jest.mocked(fs.readFileSync).mockReturnValue('ID=ubuntu\n');
  jest.mocked(fs.mkdtempSync).mockReturnValue('/tmp/wireguard-connect-test');
});

afterAll(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  if (originalEnvironment === undefined) delete process.env.RUNNER_ENVIRONMENT;
  else process.env.RUNNER_ENVIRONMENT = originalEnvironment;
});

it('saves cleanup state, creates a restricted file, and configures optional features', async () => {
  await run();

  expect(core.setSecret).toHaveBeenCalledWith(privateKey);
  expect(linux.ensureWireGuard).toHaveBeenCalledTimes(1);
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringMatching(/^\/tmp\/wireguard-connect-test\/wgc[0-9a-f]{8}\.conf$/),
    expect.stringContaining(`PrivateKey = ${privateKey}`),
    { flag: 'wx', mode: 0o600 },
  );
  expect(core.saveState).toHaveBeenCalledWith('tunnelUp', 'true');
  expect(core.saveState).toHaveBeenCalledWith('dnsConfigured', 'true');
  expect(linux.configureDns).toHaveBeenCalledTimes(1);
  expect(linux.verifyHost).toHaveBeenCalledWith('host.internal.example');
  expect(core.setOutput).toHaveBeenCalledWith(
    'interface',
    expect.stringMatching(/^wgc[0-9a-f]{8}$/),
  );
  expect(core.setFailed).not.toHaveBeenCalled();
});

it('rejects a self-hosted runner before making changes', async () => {
  process.env.RUNNER_ENVIRONMENT = 'self-hosted';
  await run();
  expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('GitHub-hosted Ubuntu'));
  expect(linux.ensureWireGuard).not.toHaveBeenCalled();
});

it('rejects a non-Ubuntu Linux runner before making changes', async () => {
  jest.mocked(fs.readFileSync).mockReturnValue('ID=debian\n');
  await run();
  expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('GitHub-hosted Ubuntu'));
  expect(linux.ensureWireGuard).not.toHaveBeenCalled();
});

it('skips DNS and connectivity checking when not requested', async () => {
  inputs['dns-server'] = '';
  inputs['dns-domains'] = '';
  inputs['verify-host'] = '';
  await run();
  expect(linux.configureDns).not.toHaveBeenCalled();
  expect(linux.verifyHost).not.toHaveBeenCalled();
  expect(core.saveState).not.toHaveBeenCalledWith('dnsConfigured', 'true');
  expect(core.setFailed).not.toHaveBeenCalled();
});

it('does not mark the tunnel active if startup fails', async () => {
  jest.mocked(linux.up).mockRejectedValueOnce(new Error('startup failed'));
  await run();
  expect(core.saveState).toHaveBeenCalledWith('configPath', expect.any(String));
  expect(core.saveState).not.toHaveBeenCalledWith('tunnelUp', 'true');
  expect(core.setFailed).toHaveBeenCalledWith('startup failed');
});

it('records DNS cleanup before a partial DNS setup fails', async () => {
  jest.mocked(linux.configureDns).mockRejectedValueOnce(new Error('DNS setup failed'));
  await run();
  expect(core.saveState).toHaveBeenCalledWith('dnsConfigured', 'true');
  expect(core.setFailed).toHaveBeenCalledWith('DNS setup failed');
  expect(linux.verifyHost).not.toHaveBeenCalled();
});

it('tears down the tunnel immediately if recording its state fails', async () => {
  jest.mocked(core.saveState).mockImplementation((name) => {
    if (name === 'tunnelUp') throw new Error('state unavailable');
  });
  await run();
  expect(linux.down).toHaveBeenCalledTimes(1);
  expect(core.setFailed).toHaveBeenCalledWith('state unavailable');
});
