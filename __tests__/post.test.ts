import * as core from '@actions/core';
import * as fs from 'node:fs';
import * as linux from '../src/platforms/linux';
import { run } from '../src/post';

jest.mock('@actions/core', () => ({
  getState: jest.fn(),
  setFailed: jest.fn(),
}));
jest.mock('node:fs');
jest.mock('../src/platforms/linux', () => ({
  revertDns: jest.fn(),
  down: jest.fn(),
}));

let state: Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  state = {
    configPath: '/tmp/wireguard-connect-test/wgc123.conf',
    interfaceName: 'wgc123',
    tunnelUp: 'true',
    dnsConfigured: 'true',
  };
  jest.mocked(core.getState).mockImplementation((name) => state[name] ?? '');
  jest.mocked(fs.openSync).mockReturnValue(3);
  jest.mocked(fs.fstatSync).mockReturnValue({ size: 12 } as fs.Stats);
});

it('reverts DNS, stops the tunnel, overwrites and removes the configuration', async () => {
  await run();
  expect(linux.revertDns).toHaveBeenCalledWith('wgc123');
  expect(linux.down).toHaveBeenCalledWith(state.configPath);
  expect(fs.writeFileSync).toHaveBeenCalledWith(3, Buffer.alloc(12));
  expect(fs.unlinkSync).toHaveBeenCalledWith(state.configPath);
  expect(fs.rmdirSync).toHaveBeenCalledWith('/tmp/wireguard-connect-test');
  expect(core.setFailed).not.toHaveBeenCalled();
});

it('continues independent cleanup when DNS, tunnel, and overwrite operations fail', async () => {
  jest.mocked(linux.revertDns).mockRejectedValueOnce(new Error('DNS failed'));
  jest.mocked(linux.down).mockRejectedValueOnce(new Error('tunnel failed'));
  jest.mocked(fs.writeFileSync).mockImplementationOnce(() => {
    throw new Error('overwrite failed');
  });

  await run();
  expect(linux.down).toHaveBeenCalledTimes(1);
  expect(fs.closeSync).toHaveBeenCalledWith(3);
  expect(fs.unlinkSync).toHaveBeenCalledWith(state.configPath);
  expect(fs.rmdirSync).toHaveBeenCalledTimes(1);
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringMatching(/DNS failed[\s\S]*tunnel failed[\s\S]*overwrite failed/),
  );
});

it('removes a partial configuration without stopping a tunnel that did not start', async () => {
  state.tunnelUp = '';
  state.dnsConfigured = '';
  const missing = Object.assign(new Error('not found'), { code: 'ENOENT' });
  jest.mocked(fs.openSync).mockImplementationOnce(() => {
    throw missing;
  });
  jest.mocked(fs.unlinkSync).mockImplementationOnce(() => {
    throw missing;
  });
  await run();
  expect(linux.revertDns).not.toHaveBeenCalled();
  expect(linux.down).not.toHaveBeenCalled();
  expect(fs.rmdirSync).toHaveBeenCalledTimes(1);
  expect(core.setFailed).not.toHaveBeenCalled();
});
