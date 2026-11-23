import * as core from '@actions/core';
import { isIP } from 'node:net';

export interface TunnelConfig {
  privateKey: string;
  address: string;
  serverPublicKey: string;
  endpoint: string;
  allowedIps: string[];
  dnsServer: string;
  dnsDomains: string[];
  verifyHost: string;
}

function validateKey(value: string, name: string): void {
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== value) {
    throw new Error(`${name} must be a base64-encoded 32-byte WireGuard key.`);
  }
}

function validateCidr(value: string, name: string): void {
  const parts = value.split('/');
  const family = isIP(parts[0]);
  if (
    parts.length !== 2 ||
    family === 0 ||
    !/^(0|[1-9][0-9]{0,2})$/.test(parts[1]) ||
    Number(parts[1]) > (family === 4 ? 32 : 128)
  ) {
    throw new Error(`${name} must contain valid IP addresses with CIDR prefixes.`);
  }
}

function isHostname(value: string): boolean {
  return (
    value.length <= 253 &&
    value.split('.').every((label) => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label))
  );
}

function validateEndpoint(value: string): void {
  const match = /^(?:\[([^\]]+)\]|([^:]+)):([0-9]{1,5})$/.exec(value);
  if (!match) {
    throw new Error('endpoint must be a hostname or IP address followed by a valid port.');
  }
  const host = match[1] ?? match[2];
  const family = isIP(host);
  if (
    (match[1] ? family !== 6 : family !== 4 && !isHostname(host)) ||
    Number(match[3]) < 1 ||
    Number(match[3]) > 65535
  ) {
    throw new Error('endpoint must be a hostname or IP address followed by a valid port.');
  }
}

export function readConfig(): TunnelConfig {
  const privateKey = core.getInput('private-key', { required: true });
  core.setSecret(privateKey);

  const address = core.getInput('address', { required: true });
  const serverPublicKey = core.getInput('server-public-key', { required: true });
  const endpoint = core.getInput('endpoint', { required: true });
  const allowedIps = core
    .getInput('allowed-ips', { required: true })
    .split(',')
    .map((item) => item.trim());
  const dnsServer = core.getInput('dns-server');
  const domainsInput = core.getInput('dns-domains');
  const verifyHost = core.getInput('verify-host');

  validateKey(privateKey, 'private-key');
  validateKey(serverPublicKey, 'server-public-key');
  validateCidr(address, 'address');
  allowedIps.forEach((value) => validateCidr(value, 'allowed-ips'));
  validateEndpoint(endpoint);
  if (Boolean(dnsServer) !== Boolean(domainsInput)) {
    throw new Error('dns-server and dns-domains must be provided together.');
  }
  if (dnsServer && isIP(dnsServer) === 0) {
    throw new Error('dns-server must be an IP address.');
  }
  const dnsDomains = domainsInput ? domainsInput.split(/ +/) : [];
  if (dnsDomains.some((domain) => !isHostname(domain))) {
    throw new Error('dns-domains must contain space-separated DNS suffixes.');
  }
  if (verifyHost && isIP(verifyHost) === 0 && !isHostname(verifyHost)) {
    throw new Error('verify-host must be an IP address or hostname.');
  }
  return {
    privateKey,
    address,
    serverPublicKey,
    endpoint,
    allowedIps,
    dnsServer,
    dnsDomains,
    verifyHost,
  };
}

export function renderConfig(config: TunnelConfig): string {
  return [
    '[Interface]',
    `PrivateKey = ${config.privateKey}`,
    `Address = ${config.address}`,
    '',
    '[Peer]',
    `PublicKey = ${config.serverPublicKey}`,
    `Endpoint = ${config.endpoint}`,
    `AllowedIPs = ${config.allowedIps.join(', ')}`,
    '',
  ].join('\n');
}
