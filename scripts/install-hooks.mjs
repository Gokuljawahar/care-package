import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { resolve } from 'node:path';

const hookPath = resolve(import.meta.dirname, '..', '.githooks', 'pre-push');
chmodSync(hookPath, 0o755);
execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  stdio: 'inherit',
});
console.log('✓ Installed git pre-push hook from .githooks/pre-push');
