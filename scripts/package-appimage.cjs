#!/usr/bin/env node
'use strict';

/*
 * Builds the Linux AppImage with electron-builder and leaves only the single
 * portable .AppImage in:
 *
 *   dist/Linux AppImage/Roselt-Calculator-<version>.AppImage
 *
 * The intermediate linux-unpacked tree and electron-builder metadata files are
 * discarded so the folder stays clean.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const outputDir = path.join(distDir, 'Linux AppImage');
const builderBin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

console.log('> Building Linux AppImage (electron-builder)...');
rmrf(outputDir);
fs.mkdirSync(outputDir, { recursive: true });

execFileSync(
  builderBin,
  ['--linux', 'AppImage', '--x64', `--config.directories.output=${outputDir}`],
  { stdio: 'inherit', cwd: root }
);

// Keep only the .AppImage; drop the unpacked tree and builder metadata.
for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.toLowerCase().endsWith('.appimage')) {
    continue;
  }
  rmrf(path.join(outputDir, entry.name));
}

console.log(`\nDone.`);
console.log(`  Linux AppImage -> ${path.relative(root, outputDir)}`);
