import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : /\.[cm]?js$/.test(entry.name) ? [fullPath] : [];
  });
}

const files = ['service-worker.js', ...['scripts', 'electron', 'marketing', 'assets/logos', 'test'].flatMap(walk)];
for (const file of files.sort()) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
