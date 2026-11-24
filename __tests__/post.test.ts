import * as core from '@actions/core';
import * as linux from '../src/platforms/linux';
import { run } from '../src/post';

jest.mock('@actions/core', () => ({
  getState: jest.fn(),
  setFailed: jest.fn(),
}));
jest.mock('../src/platforms/linux', () => ({
  revertDns: jest.fn(),
  down: jest.fn(),
  overwriteConfig: jest.fn(),
  removeConfig: jest.fn(),
}));

let state: Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  state = {
    configPath: '/etc/wireguard/wgc12345678.conf',
    interfaceName: 'wgc12345678',
    tunnelUp: 'true',
    dnsConfigured: 'true',
  };
  jest.mocked(core.getState).mockImplementation((name) => state[name] ?? '');
});

it('reverts DNS, stops the tunnel, overwrites and removes the configuration', async () => {
  await run();
  expect(linux.revertDns).toHaveBeenCalledWith('wgc12345678');
  expect(linux.down).toHaveBeenCalledWith(state.configPath);
  expect(linux.overwriteConfig).toHaveBeenCalledWith(state.configPath);
  expect(linux.removeConfig).toHaveBeenCalledWith(state.configPath);
  expect(core.setFailed).not.toHaveBeenCalled();
});

it('continues independent cleanup when DNS, tunnel, and overwrite operations fail', async () => {
  jest.mocked(linux.revertDns).mockRejectedValueOnce(new Error('DNS failed'));
  jest.mocked(linux.down).mockRejectedValueOnce(new Error('tunnel failed'));
  jest.mocked(linux.overwriteConfig).mockRejectedValueOnce(new Error('overwrite failed'));

  await run();
  expect(linux.down).toHaveBeenCalledTimes(1);
  expect(linux.removeConfig).toHaveBeenCalledWith(state.configPath);
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringMatching(/DNS failed[\s\S]*tunnel failed[\s\S]*overwrite failed/),
  );
});

it.each([new Error('cleanup failed'), 'cleanup failed'])(
  'reports all cleanup failures, including configuration removal: %p',
  async (error) => {
    jest.mocked(linux.revertDns).mockRejectedValueOnce(error);
    jest.mocked(linux.down).mockRejectedValueOnce(error);
    jest.mocked(linux.overwriteConfig).mockRejectedValueOnce(error);
    jest.mocked(linux.removeConfig).mockRejectedValueOnce(error);

    await run();

    expect(linux.revertDns).toHaveBeenCalledWith(state.interfaceName);
    expect(linux.down).toHaveBeenCalledWith(state.configPath);
    expect(linux.overwriteConfig).toHaveBeenCalledWith(state.configPath);
    expect(linux.removeConfig).toHaveBeenCalledWith(state.configPath);
    expect(core.setFailed).toHaveBeenCalledWith(
      [
        'Failed to revert DNS: cleanup failed',
        'Failed to stop tunnel: cleanup failed',
        'Failed to overwrite configuration: cleanup failed',
        'Failed to remove configuration: cleanup failed',
      ].join('\n'),
    );
  },
);

it('removes a partial configuration without stopping a tunnel that did not start', async () => {
  state.tunnelUp = '';
  state.dnsConfigured = '';
  await run();
  expect(linux.revertDns).not.toHaveBeenCalled();
  expect(linux.down).not.toHaveBeenCalled();
  expect(linux.overwriteConfig).toHaveBeenCalledWith(state.configPath);
  expect(linux.removeConfig).toHaveBeenCalledWith(state.configPath);
  expect(core.setFailed).not.toHaveBeenCalled();
});

it('rejects an unsafe configuration path before privileged file operations', async () => {
  state.configPath = '/etc/wireguard/other.conf';
  await run();
  expect(linux.down).not.toHaveBeenCalled();
  expect(linux.overwriteConfig).not.toHaveBeenCalled();
  expect(linux.removeConfig).not.toHaveBeenCalled();
  expect(core.setFailed).toHaveBeenCalledWith('Invalid configuration path in cleanup state.');
});
