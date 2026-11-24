import * as exec from '@actions/exec';
import * as io from '@actions/io';
import { TunnelConfig } from '../config';

export async function ensureWireGuard(): Promise<void> {
  const wg = await io.which('wg');
  const quick = await io.which('wg-quick');
  if (!wg || !quick) {
    await exec.exec('sudo', ['apt-get', 'update']);
    await exec.exec('sudo', ['apt-get', 'install', '-y', 'wireguard-tools']);
    await io.which('wg', true);
    await io.which('wg-quick', true);
  }
}

export async function writeConfig(configPath: string, contents: string): Promise<void> {
  await exec.exec('sudo', ['install', '-d', '-m', '700', '/etc/wireguard']);
  await exec.exec('sudo', ['install', '-m', '600', '/dev/stdin', configPath], {
    input: Buffer.from(contents),
  });
}

export async function overwriteConfig(configPath: string): Promise<void> {
  const result = await exec.getExecOutput('sudo', ['test', '-e', configPath], {
    ignoreReturnCode: true,
    silent: true,
  });
  if (result.exitCode === 1) return;
  if (result.exitCode !== 0) throw new Error('Failed to check the configuration file.');
  await exec.exec('sudo', ['shred', '--iterations=0', '--zero', '--', configPath]);
}

export async function removeConfig(configPath: string): Promise<void> {
  await exec.exec('sudo', ['rm', '-f', '--', configPath]);
}

export async function up(configPath: string): Promise<void> {
  await exec.exec('sudo', ['wg-quick', 'up', configPath]);
}

export async function configureDns(interfaceName: string, config: TunnelConfig): Promise<void> {
  await io.which('resolvectl', true);
  await exec.exec('sudo', ['resolvectl', 'dns', interfaceName, config.dnsServer]);
  await exec.exec('sudo', [
    'resolvectl',
    'domain',
    interfaceName,
    ...config.dnsDomains.map((domain) => `~${domain}`),
  ]);
}

export async function verifyHost(host: string): Promise<void> {
  await exec.exec('ping', ['-c', '1', '-W', '5', host]);
}

export async function revertDns(interfaceName: string): Promise<void> {
  await exec.exec('sudo', ['resolvectl', 'revert', interfaceName]);
}

export async function down(configPath: string): Promise<void> {
  await exec.exec('sudo', ['wg-quick', 'down', configPath]);
}
