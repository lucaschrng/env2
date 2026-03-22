#!/usr/bin/env node
import { Command } from 'commander';

import { configGet, configReset, configSet } from './commands/config';
import { receive } from './commands/receive';
import { share } from './commands/share';

const program = new Command();

program
  .name('env2')
  .description('Ephemeral encrypted .env sharing')
  .version('0.0.0');

program
  .command('share')
  .description('Encrypt and share .env files')
  .option('--ttl <duration>', 'Expiry duration (e.g. 5m, 15m, 1h)', '15m')
  .option('--downloads <count>', 'Max downloads', '1')
  .option('--root <path>', 'Working directory')
  .option('--host <url>', 'Custom server URL')
  .option('--no-interactive', 'Skip interactive picker')
  .action(share);

program
  .command('receive <url>')
  .description('Fetch and decrypt shared .env files')
  .option('--root <path>', 'Write files relative to this directory')
  .option('--dry-run', 'Preview without writing files')
  .option('--force', 'Skip overwrite confirmation')
  .option('--overwrite', 'Replace existing files instead of merging')
  .option('--no-interactive', 'Accept all vars without picker')
  .option('--stdout', 'Print to stdout instead of writing files')
  .action(receive);

const config = program
  .command('config')
  .description('Manage CLI configuration');

config
  .command('get <key>')
  .description('Get a config value')
  .action(configGet);

config
  .command('set <key> <value>')
  .description('Set a config value')
  .action(configSet);

config
  .command('reset')
  .description('Reset config to defaults')
  .action(configReset);

program.parse();
