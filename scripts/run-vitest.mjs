import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = resolve('.tmp');
mkdirSync(temp, { recursive: true });
const env = { ...process.env, TMP: temp, TEMP: temp, TMPDIR: temp };
const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run'], {
  stdio: 'inherit',
  env,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
