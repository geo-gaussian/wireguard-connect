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

it('creates and removes a restricted configuration without exposing its contents in arguments', async () => {
  const configPath = '/etc/wireguard/wgc12345678.conf';
  jest.mocked(exec.getExecOutput).mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' });
  await linux.writeConfig(configPath, 'private configuration');
  await linux.overwriteConfig(configPath);
  await linux.removeConfig(configPath);
  expect(exec.exec).toHaveBeenCalledWith('sudo', ['install', '-d', '-m', '700', '/etc/wireguard']);
  expect(exec.exec).toHaveBeenCalledWith(
    'sudo',
    ['install', '-m', '600', '/dev/stdin', configPath],
    { input: Buffer.from('private configuration') },
  );
  expect(exec.exec).toHaveBeenCalledWith('sudo', [
    'shred',
    '--iterations=0',
    '--zero',
    '--',
    configPath,
  ]);
  expect(exec.exec).toHaveBeenCalledWith('sudo', ['rm', '-f', '--', configPath]);
});

it('tolerates an already missing configuration during overwrite', async () => {
  jest.mocked(exec.getExecOutput).mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' });
  await linux.overwriteConfig('/etc/wireguard/wgc12345678.conf');
  expect(exec.exec).not.toHaveBeenCalled();
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
