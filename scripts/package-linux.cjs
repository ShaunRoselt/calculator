#!/usr/bin/env node
'use strict';

/*
 * Builds the unpacked Linux desktop app used directly in dist and as the
 * source for the Flatpak bundle:
 *
 *   dist/Roselt Calculator-linux-x64/
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const tmpDir = path.join(distDir, '.tmp-linux-build');
const outputDir = path.join(distDir, 'Roselt Calculator-linux-x64');
const builderBin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

console.log('> Building Linux unpacked (electron-builder)...');
rmrf(tmpDir);
rmrf(outputDir);

execFileSync(
  builderBin,
  ['--linux', 'dir', '--x64', `--config.directories.output=${tmpDir}`],
  { stdio: 'inherit', cwd: root }
);

const stagedUnpacked = path.join(tmpDir, 'linux-unpacked');
if (!fs.existsSync(stagedUnpacked)) {
  console.error(`Expected unpacked output at "${stagedUnpacked}" but it was not produced.`);
  process.exit(1);
}

fs.renameSync(stagedUnpacked, outputDir);
rmrf(tmpDir);

console.log('\nDone.');
console.log(`  Linux Unpacked -> ${path.relative(root, outputDir)}`);
