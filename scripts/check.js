import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      return walk(fullPath);
    }
    return fullPath.endsWith('.js') && !fullPath.endsWith('check.js') ? [fullPath] : [];
  });
}

for (const file of walk('scripts').sort()) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
