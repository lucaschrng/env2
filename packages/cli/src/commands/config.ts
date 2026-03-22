import * as p from '@clack/prompts';

import { getConfig, resetConfig, setConfig } from '../lib/config';

export function configGet(key: string): void {
  const config = getConfig();
  if (key in config) {
    console.log(config[key as keyof typeof config]);
  }
  else {
    p.log.error(`Unknown config key: ${key}`);
    process.exit(1);
  }
}

export function configReset(): void {
  resetConfig();
  p.log.success('Config reset to defaults.');
}

export function configSet(key: string, value: string): void {
  if (key !== 'host') {
    p.log.error(`Unknown config key: ${key}`);
    process.exit(1);
  }
  setConfig(key, value);
  p.log.success(`Set ${key} = ${value}`);
}
