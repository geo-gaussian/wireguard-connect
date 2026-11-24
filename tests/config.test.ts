import * as core from '@actions/core';
import { readConfig, renderConfig } from '../src/config';

jest.mock('@actions/core');

const privateKey = Buffer.alloc(32, 1).toString('base64');
const publicKey = Buffer.alloc(32, 2).toString('base64');
let inputs: Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  inputs = {
    'private-key': privateKey,
    address: '10.20.0.2/32',
    'server-public-key': publicKey,
    endpoint: 'vpn.example.org:51820',
    'allowed-ips': '10.20.0.0/24, 2001:db8::/32',
    'dns-server': '',
    'dns-domains': '',
    'verify-host': '',
  };
  jest.mocked(core.getInput).mockImplementation((name) => inputs[name] ?? '');
});

it('masks the private key before reading other inputs and renders a tunnel configuration', () => {
  const config = readConfig();

  expect(jest.mocked(core.setSecret).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(core.getInput).mock.invocationCallOrder[1],
  );
  expect(renderConfig(config)).toContain(`PrivateKey = ${privateKey}`);
  expect(renderConfig(config)).toContain('AllowedIPs = 10.20.0.0/24, 2001:db8::/32');
  expect(renderConfig(config)).not.toContain('DNS =');
});

it.each([
  ['private-key', 'invalid'],
  ['server-public-key', 'invalid'],
  ['address', '10.0.0.1/33'],
  ['address', '2001:db8::1/129'],
  ['allowed-ips', '10.0.0.0/24,'],
  ['allowed-ips', '0.0.0.0/0\nPostUp=bad'],
  ['endpoint', 'vpn.example.org:65536'],
  ['endpoint', '[2001:db8::1]:0'],
  ['endpoint', 'vpn.example.org:51820\nPostUp=bad'],
  ['dns-server', '10.20.0.999'],
  ['dns-domains', 'example.org;bad'],
  ['verify-host', 'host;bad'],
])('rejects invalid %s without echoing its value', (name, value) => {
  inputs[name] = value;
  if (name === 'dns-domains') inputs['dns-server'] = '10.20.0.1';
  if (name === 'dns-server') inputs['dns-domains'] = 'internal.example';
  expect(() => readConfig()).toThrow();
  try {
    readConfig();
  } catch (error) {
    expect((error as Error).message).not.toContain(value);
  }
});

it('requires DNS server and domains together', () => {
  inputs['dns-server'] = '10.20.0.1';
  expect(() => readConfig()).toThrow('dns-server and dns-domains');
  inputs['dns-server'] = '';
  inputs['dns-domains'] = 'internal.example';
  expect(() => readConfig()).toThrow('dns-server and dns-domains');
});

it('accepts a bracketed IPv6 endpoint and validates optional DNS and ping inputs', () => {
  inputs.endpoint = '[2001:db8::1]:51820';
  inputs['dns-server'] = '10.20.0.1';
  inputs['dns-domains'] = 'internal.example corp.example';
  inputs['verify-host'] = 'host.internal.example';

  expect(readConfig().dnsDomains).toEqual(['internal.example', 'corp.example']);
});
