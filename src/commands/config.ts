import confirm from '@inquirer/confirm';
import { z } from 'zod';
import { getUserEmail, setUserEmail } from '../globalConfig/accounts';
import { cloudConfig } from '../globalConfig/cloud';
import logger from '../logger';
import telemetry from '../telemetry';
import type { Command } from 'commander';

const EmailSchema = z.string().email();

export function configCommand(program: Command) {
  const configCommand = program.command('config').description('Edit configuration settings');
  const getCommand = configCommand.command('get').description('Get configuration settings');
  const setCommand = configCommand.command('set').description('Set configuration settings');
  const unsetCommand = configCommand.command('unset').description('Unset configuration settings');

  getCommand
    .command('email')
    .description('Get user email')
    .action(async () => {
      const email = getUserEmail();
      if (email) {
        logger.info(email);
      } else {
        logger.info('No email set.');
      }
      telemetry.record('command_used', {
        name: 'config get',
        configKey: 'email',
      });
    });

  setCommand
    .command('email <email>')
    .description('Set user email')
    .action(async (email: string) => {
      if (cloudConfig.getApiKey()) {
        logger.error(
          "Cannot update email while logged in. Email is managed through 'promptfoo auth login'. Please use 'promptfoo auth logout' first if you want to use a different email.",
        );
        process.exitCode = 1;
        return;
      }

      const parsedEmail = EmailSchema.safeParse(email);
      if (!parsedEmail.success) {
        logger.error(`Invalid email address: ${email}`);
        process.exitCode = 1;
        return;
      }
      setUserEmail(parsedEmail.data);
      logger.info(`Email set to ${parsedEmail.data}`);
      telemetry.record('command_used', {
        name: 'config set',
        configKey: 'email',
      });
    });

  unsetCommand
    .command('email')
    .description('Unset user email')
    .option('-f, --force', 'Force unset without confirmation')
    .action(async (options) => {
      if (cloudConfig.getApiKey()) {
        logger.error(
          "Cannot update email while logged in. Email is managed through 'promptfoo auth login'. Please use 'promptfoo auth logout' first if you want to use a different email.",
        );
        process.exitCode = 1;
        return;
      }

      const currentEmail = getUserEmail();
      if (!currentEmail) {
        logger.info('No email is currently set.');
        return;
      }

      if (!options.force) {
        const shouldUnset = await confirm({
          message: `Are you sure you want to unset the email "${currentEmail}"?`,
          default: false,
        });

        if (!shouldUnset) {
          logger.info('Operation cancelled.');
          return;
        }
      }

      setUserEmail('');
      logger.info('Email has been unset.');
      telemetry.record('command_used', {
        name: 'config unset',
        configKey: 'email',
      });
    });
}
