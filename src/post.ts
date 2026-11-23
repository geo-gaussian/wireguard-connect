import * as core from '@actions/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as linux from './platforms/linux';

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export async function run(): Promise<void> {
  const configPath = core.getState('configPath');
  const interfaceName = core.getState('interfaceName');
  const errors: string[] = [];

  if (core.getState('dnsConfigured') === 'true') {
    try {
      await linux.revertDns(interfaceName);
    } catch (error) {
      errors.push(
        `Failed to revert DNS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (core.getState('tunnelUp') === 'true') {
    try {
      await linux.down(configPath);
    } catch (error) {
      errors.push(
        `Failed to stop tunnel: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (configPath) {
    try {
      const file = fs.openSync(configPath, 'r+');
      try {
        fs.writeFileSync(file, Buffer.alloc(fs.fstatSync(file).size));
      } finally {
        fs.closeSync(file);
      }
    } catch (error) {
      if (!isMissing(error)) {
        errors.push(
          `Failed to overwrite configuration: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    try {
      fs.unlinkSync(configPath);
    } catch (error) {
      if (!isMissing(error)) {
        errors.push(
          `Failed to remove configuration: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    try {
      fs.rmdirSync(path.dirname(configPath));
    } catch (error) {
      errors.push(
        `Failed to remove configuration directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (errors.length) {
    core.setFailed(errors.join('\n'));
  }
}

void run();
