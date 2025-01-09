import type { Command } from 'commander';
import { DEFAULT_PORT } from '../constants';
import { startServer } from '../server/server';
import telemetry from '../telemetry';
import { setupEnv } from '../util';
import { setConfigDirectoryPath } from '../util/config/manage';
import { BrowserBehavior } from '../util/server';

export function serveCommand(program: Command) {
  program
    .command('serve [directory]')
    .description('Start local promptfoo server')
    .option('-p, --port <number>', 'Port number', DEFAULT_PORT.toString())
    .option('--env-file, --env-path <path>', 'Path to .env file')
    .action(
      async (
        directory: string | undefined,
        cmdObj: {
          port: number;
          yes: boolean;
          no: boolean;
          apiBaseUrl?: string;
          envPath?: string;
          filterDescription?: string;
        } & Command,
      ) => {
        setupEnv(cmdObj.envPath);
        telemetry.record('command_used', {
          name: 'serve',
        });
        await telemetry.send();

        if (directory) {
          setConfigDirectoryPath(directory);
        }

        await startServer(cmdObj.port, BrowserBehavior.SKIP);
      },
    );
}
