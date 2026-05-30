#!/usr/bin/env node
'use strict';

/*
 * Builds the Windows desktop artifacts with electron-builder and arranges them
 * into a clean dist layout:
 *
 *   dist/Windows Portable/   -> a single self-contained Roselt-Calculator-Portable-<version>.exe
 *   dist/Windows Unpacked/   -> the plain Roselt Calculator.exe plus its runtime files
 *
 * A single "portable" build already produces the unpacked tree (win-unpacked)
 * before wrapping it into the portable executable, so we reuse that tree for
 * the unpacked folder instead of building twice.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const portableDir = path.join(distDir, 'Windows Portable');
const unpackedDir = path.join(distDir, 'Windows Unpacked');
const builderBin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

const BUILDER_CRUFT = new Set([
  'builder-debug.yml',
  'builder-effective-config.yaml',
  'latest.yml',
  'latest-linux.yml'
]);

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function cleanBuilderCruft(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const isCruft = BUILDER_CRUFT.has(entry.name) || (entry.isFile() && entry.name.endsWith('.zip'));
    if (isCruft) {
      rmrf(path.join(dir, entry.name));
    }
  }
}

console.log('> Building Windows portable + unpacked (electron-builder)...');
rmrf(portableDir);
rmrf(unpackedDir);
fs.mkdirSync(portableDir, { recursive: true });

execFileSync(
  builderBin,
  ['--win', 'portable', `--config.directories.output=${portableDir}`],
  { stdio: 'inherit', cwd: root }
);

// The portable build leaves the unpacked tree alongside the wrapped exe.
const stagedUnpacked = path.join(portableDir, 'win-unpacked');
if (!fs.existsSync(stagedUnpacked)) {
  console.error(`Expected unpacked output at "${stagedUnpacked}" but it was not produced.`);
  process.exit(1);
}
fs.renameSync(stagedUnpacked, unpackedDir);

cleanBuilderCruft(portableDir);
cleanBuilderCruft(unpackedDir);

console.log(`\nDone.`);
console.log(`  Windows Portable -> ${path.relative(root, portableDir)}`);
console.log(`  Windows Unpacked -> ${path.relative(root, unpackedDir)}`);
