#!/usr/bin/env node
'use strict';

/*
 * Builds the Linux AppImage with electron-builder and leaves only the single
 * portable .AppImage in:
 *
 *   dist/Linux AppImage/Roselt-Calculator-<version>.AppImage
 *
 * electron-builder always compresses the AppImage payload (gzip), which costs
 * CPU on every launch because squashfs decompresses files on demand. Since we
 * prioritise launch speed over file size, we repack the payload squashfs with
 * NO compression so the app mounts and starts as fast as possible.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { copyToFinal } = require('./final-dist.cjs');
const { runElectronBuilder } = require('./run-electron-builder.cjs');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const outputDir = path.join(distDir, 'Linux AppImage');
function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function which(cmd) {
  try {
    return execFileSync('sh', ['-lc', `command -v ${cmd}`]).toString().trim();
  } catch {
    return '';
  }
}

// Repack the AppImage payload with an uncompressed squashfs for fastest launch.
function makeUncompressed(appImagePath) {
  const mksquashfs = which('mksquashfs');
  const unsquashfs = which('unsquashfs');
  if (!mksquashfs || !unsquashfs) {
    console.warn('  (squashfs-tools not found; leaving default gzip compression)');
    return;
  }

  const offset = parseInt(execFileSync(appImagePath, ['--appimage-offset']).toString().trim(), 10);
  if (!Number.isFinite(offset) || offset <= 0) {
    console.warn('  (could not read AppImage offset; leaving default compression)');
    return;
  }

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'appimage-repack-'));
  const runtimePath = path.join(work, 'runtime');
  const payloadPath = path.join(work, 'payload.sqfs');
  const extractDir = path.join(work, 'squashfs-root');
  const newSquash = path.join(work, 'uncompressed.sqfs');
  const newAppImage = `${appImagePath}.new`;

  try {
    // Split the type-2 AppImage into its runtime (ELF) and squashfs payload.
    execFileSync('dd', [`if=${appImagePath}`, `of=${runtimePath}`, 'bs=1M', `count=${offset}`, 'iflag=count_bytes', 'status=none']);
    execFileSync('dd', [`if=${appImagePath}`, `of=${payloadPath}`, 'bs=1M', `skip=${offset}`, 'iflag=skip_bytes', 'status=none']);

    // Decompress the payload, then repack uncompressed.
    execFileSync(unsquashfs, ['-d', extractDir, '-no-progress', payloadPath], { stdio: 'ignore' });
    execFileSync(mksquashfs, [
      extractDir, newSquash,
      '-noI', '-noD', '-noF', '-noX', // no compression of inodes/data/fragments/xattrs
      '-no-fragments', '-all-root', '-noappend', '-b', '1M', '-no-progress', '-quiet'
    ], { stdio: 'ignore' });

    // Recombine runtime + uncompressed squashfs.
    execFileSync('sh', ['-c', `cat "${runtimePath}" "${newSquash}" > "${newAppImage}"`]);
    fs.chmodSync(newAppImage, 0o755);
    fs.renameSync(newAppImage, appImagePath);
  } finally {
    rmrf(work);
    rmrf(newAppImage);
  }
}

console.log('> Building Linux AppImage (electron-builder)...');
rmrf(outputDir);
fs.mkdirSync(outputDir, { recursive: true });

runElectronBuilder(
  ['--linux', 'AppImage', '--x64', `--config.directories.output=${outputDir}`],
  { cwd: root }
);

// Keep only the .AppImage; drop the unpacked tree and builder metadata.
let appImagePath = null;
for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.toLowerCase().endsWith('.appimage')) {
    appImagePath = path.join(outputDir, entry.name);
    continue;
  }
  rmrf(path.join(outputDir, entry.name));
}

if (appImagePath) {
  console.log('> Repacking payload uncompressed for fastest launch...');
  makeUncompressed(appImagePath);
  copyToFinal(appImagePath, 'Roselt Calculator.AppImage');
}

console.log('\nDone.');
console.log(`  Linux AppImage -> ${path.relative(root, outputDir)}`);
