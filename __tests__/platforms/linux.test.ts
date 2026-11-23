import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as linux from '../../src/platforms/linux';
import { TunnelConfig } from '../../src/config';

jest.mock('@actions/exec');
jest.mock('@actions/io');

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(io.which).mockResolvedValue('/usr/bin/tool');
});

it('skips installation when WireGuard is already present', async () => {
  await linux.ensureWireGuard();
  expect(exec.exec).not.toHaveBeenCalled();
});

it('installs and verifies the tools if they are missing', async () => {
  jest.mocked(io.which).mockResolvedValueOnce('').mockResolvedValueOnce('');
  await linux.ensureWireGuard();
  expect(exec.exec).toHaveBeenCalledWith('sudo', ['apt-get', 'update']);
  expect(exec.exec).toHaveBeenCalledWith('sudo', ['apt-get', 'install', '-y', 'wireguard-tools']);
  expect(io.which).toHaveBeenCalledWith('wg', true);
  expect(io.which).toHaveBeenCalledWith('wg-quick', true);
});

it('passes tunnel, DNS, and connectivity parameters as separate arguments', async () => {
  const config: TunnelConfig = {
    privateKey: '',
    address: '',
    serverPublicKey: '',
    endpoint: '',
    allowedIps: [],
    dnsServer: '10.20.0.1',
    dnsDomains: ['internal.example', 'corp.example'],
    verifyHost: '',
  };
  await linux.up('/tmp/wgc123.conf');
  await linux.configureDns('wgc123', config);
  await linux.verifyHost('host.internal.example');
  await linux.revertDns('wgc123');
  await linux.down('/tmp/wgc123.conf');

  expect(exec.exec).toHaveBeenCalledWith('sudo', ['wg-quick', 'up', '/tmp/wgc123.conf']);
  expect(exec.exec).toHaveBeenCalledWith('sudo', ['resolvectl', 'dns', 'wgc123', '10.20.0.1']);
  expect(exec.exec).toHaveBeenCalledWith('sudo', [
    'resolvectl',
    'domain',
    'wgc123',
    '~internal.example',
    '~corp.example',
  ]);
  expect(exec.exec).toHaveBeenCalledWith('ping', ['-c', '1', '-W', '5', 'host.internal.example']);
  expect(exec.exec).toHaveBeenCalledWith('sudo', ['resolvectl', 'revert', 'wgc123']);
  expect(exec.exec).toHaveBeenCalledWith('sudo', ['wg-quick', 'down', '/tmp/wgc123.conf']);
});
