import * as core from '@actions/core';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { readConfig, renderConfig } from './config';
import * as linux from './platforms/linux';

export async function run(): Promise<void> {
  try {
    const config = readConfig();
    if (
      process.platform !== 'linux' ||
      process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
      !/^ID=(?:ubuntu|"ubuntu")$/m.test(fs.readFileSync('/etc/os-release', 'utf8'))
    ) {
      throw new Error('This MVP supports only GitHub-hosted Ubuntu runners.');
    }

    await linux.ensureWireGuard();
    const interfaceName = `wgc${randomBytes(4).toString('hex')}`;
    const configPath = path.join('/etc/wireguard', `${interfaceName}.conf`);
    core.saveState('configPath', configPath);
    core.saveState('interfaceName', interfaceName);
    await linux.writeConfig(configPath, renderConfig(config));

    await linux.up(configPath);
    try {
      core.saveState('tunnelUp', 'true');
    } catch (error) {
      try {
        await linux.down(configPath);
      } catch (cleanupError) {
        core.error(
          `Failed to stop tunnel after saving state failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        );
      }
      throw error;
    }
    if (config.dnsServer) {
      core.saveState('dnsConfigured', 'true');
      await linux.configureDns(interfaceName, config);
    }
    if (config.verifyHost) {
      await linux.verifyHost(config.verifyHost);
    }
    core.setOutput('interface', interfaceName);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

void run();
