#!/usr/bin/env node
'use strict';

/*
 * Builds the Windows desktop artifacts with electron-builder and arranges them
 * into a clean dist layout:
 *
 *   dist/Windows Portable/   -> a single self-contained Roselt-Calculator-Portable-<version>.exe
 *   dist/Windows Unpacked/   -> the plain Roselt Calculator.exe plus its runtime files
 *
 * Pipeline:
 *   1. Build the unpacked app (electron-builder --win dir).
 *   2. Patch the unpacked .exe with native metadata + icon (resedit, no wine)
 *      so Task Manager / taskbar / Properties show "Roselt Calculator".
 *   3. Wrap the *patched* unpacked build into the portable exe (--prepackaged),
 *      so the process that actually runs also carries the correct metadata.
 */

const fs = require('node:fs');
const path = require('node:path');
const { copyToFinal } = require('./final-dist.cjs');
const { patch } = require('./patch-windows-exe.cjs');
const { runElectronBuilder } = require('./run-electron-builder.cjs');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const portableDir = path.join(distDir, 'Windows Portable');
const unpackedDir = path.join(distDir, 'Windows Unpacked');
const tmpDir = path.join(distDir, '.tmp-win-build');
const exeName = 'Roselt Calculator.exe';

const BUILDER_CRUFT = new Set([
  'builder-debug.yml',
  'builder-effective-config.yaml',
  'latest.yml',
  'latest-linux.yml'
]);

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function builder(args) {
  runElectronBuilder(args, { cwd: root });
}

function cleanBuilderCruft(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const isCruft = BUILDER_CRUFT.has(entry.name) || (entry.isFile() && entry.name.endsWith('.zip'));
    if (isCruft) rmrf(path.join(dir, entry.name));
  }
}

console.log('> [1/3] Building Windows unpacked (electron-builder)...');
rmrf(tmpDir);
rmrf(unpackedDir);
builder(['--win', 'dir', `--config.directories.output=${tmpDir}`]);

const stagedUnpacked = path.join(tmpDir, 'win-unpacked');
if (!fs.existsSync(stagedUnpacked)) {
  console.error(`Expected unpacked output at "${stagedUnpacked}" but it was not produced.`);
  process.exit(1);
}

console.log('> [2/3] Embedding native metadata + icon into the exe (resedit)...');
patch(path.join(stagedUnpacked, exeName));

fs.renameSync(stagedUnpacked, unpackedDir);
rmrf(tmpDir);
cleanBuilderCruft(unpackedDir);

console.log('> [3/3] Wrapping the patched build into the portable exe...');
rmrf(portableDir);
fs.mkdirSync(portableDir, { recursive: true });
builder([
  '--win', 'portable',
  '--prepackaged', unpackedDir,
  `--config.directories.output=${portableDir}`
]);
rmrf(path.join(portableDir, 'win-unpacked'));
cleanBuilderCruft(portableDir);

const portableExe = fs.readdirSync(portableDir)
  .find((name) => name.toLowerCase().endsWith('.exe'));
if (portableExe) {
  copyToFinal(path.join(portableDir, portableExe), 'Roselt Calculator.exe');
}

console.log('\nDone.');
console.log(`  Windows Portable -> ${path.relative(root, portableDir)}`);
console.log(`  Windows Unpacked -> ${path.relative(root, unpackedDir)}`);
