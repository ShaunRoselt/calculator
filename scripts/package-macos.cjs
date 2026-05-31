#!/usr/bin/env node
'use strict';

/*
 * Builds unsigned macOS app bundles for Steam upload:
 *
 *   dist/macOS/Roselt Calculator-darwin-x64/Roselt Calculator.app
 *   dist/macOS/Roselt Calculator-darwin-arm64/Roselt Calculator.app
 *
 * Steam can ingest the unpacked .app bundle as depot content. Signing and
 * notarization still need to happen on macOS if distributing outside Steam.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { copyToFinal } = require('./final-dist.cjs');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const outputDir = path.join(distDir, 'macOS');
const builderBin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);
const appIcon = path.join(root, 'assets', 'icons', 'app-icon.icns');
const macArchitectures = ['x64', 'arm64'];

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function buildMac(arch) {
  const tmpDir = path.join(outputDir, `.tmp-${arch}`);
  const finalDir = path.join(outputDir, `Roselt Calculator-darwin-${arch}`);

  rmrf(tmpDir);
  rmrf(finalDir);

  execFileSync(
    builderBin,
    ['--mac', 'dir', `--${arch}`, `--config.directories.output=${tmpDir}`],
    { stdio: 'inherit', cwd: root }
  );

  const stagedDir = fs.existsSync(path.join(tmpDir, 'mac'))
    ? path.join(tmpDir, 'mac')
    : path.join(tmpDir, `mac-${arch}`);
  if (!fs.existsSync(stagedDir)) {
    console.error(`Expected macOS output at "${stagedDir}" but it was not produced.`);
    process.exit(1);
  }

  fs.renameSync(stagedDir, finalDir);
  rmrf(tmpDir);
}

console.log('> Building macOS app bundles (electron-builder)...');
rmrf(outputDir);
fs.mkdirSync(outputDir, { recursive: true });

if (!fs.existsSync(appIcon)) {
  console.warn('  (assets/icons/app-icon.icns not found; macOS bundles will use Electron’s default app icon)');
}

for (const arch of macArchitectures) {
  console.log(`> Building macOS ${arch}...`);
  buildMac(arch);
}

copyToFinal(
  path.join(outputDir, 'Roselt Calculator-darwin-arm64', 'Roselt Calculator.app'),
  'Roselt Calculator.app'
);

console.log('\nDone.');
console.log(`  macOS -> ${path.relative(root, outputDir)}`);
