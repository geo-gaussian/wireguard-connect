import * as core from '@actions/core';
import * as linux from './platforms/linux';

export async function run(): Promise<void> {
  const configPath = core.getState('configPath');
  const interfaceName = core.getState('interfaceName');
  const errors: string[] = [];
  const validConfigPath = /^\/etc\/wireguard\/wgc[0-9a-f]{8}\.conf$/.test(configPath);

  if (core.getState('dnsConfigured') === 'true') {
    try {
      await linux.revertDns(interfaceName);
    } catch (error) {
      errors.push(
        `Failed to revert DNS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (core.getState('tunnelUp') === 'true' && validConfigPath) {
    try {
      await linux.down(configPath);
    } catch (error) {
      errors.push(
        `Failed to stop tunnel: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (configPath) {
    if (!validConfigPath) {
      errors.push('Invalid configuration path in cleanup state.');
    } else {
      try {
        await linux.overwriteConfig(configPath);
      } catch (error) {
        errors.push(
          `Failed to overwrite configuration: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      try {
        await linux.removeConfig(configPath);
      } catch (error) {
        errors.push(
          `Failed to remove configuration: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  if (errors.length) {
    core.setFailed(errors.join('\n'));
  }
}

void run();
