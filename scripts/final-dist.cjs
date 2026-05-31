#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const finalDir = path.join(distDir, 'final dist');

const artifactNames = {
  windows: 'Roselt Calculator.exe',
  appimage: 'Roselt Calculator.AppImage',
  flatpak: 'Roselt Calculator.Flatpak',
  macosArm: 'Roselt Calculator.app',
  android: 'Roselt Calculator.apk'
};

function ensureFinalDir() {
  fs.mkdirSync(finalDir, { recursive: true });
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyToFinal(source, finalName) {
  if (!source || !fs.existsSync(source)) return false;

  ensureFinalDir();
  const destination = path.join(finalDir, finalName);
  rmrf(destination);
  fs.cpSync(source, destination, { recursive: true });
  return true;
}

function findFirstFile(dir, predicate) {
  if (!fs.existsSync(dir)) return null;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const match = entries.find((entry) => entry.isFile() && predicate(entry.name));
  return match ? path.join(dir, match.name) : null;
}

function findAndroidApk() {
  const topLevelApk = path.join(distDir, 'Android', 'Roselt-Calculator.apk');
  if (fs.existsSync(topLevelApk)) return topLevelApk;

  const androidDir = path.join(distDir, 'Android');
  if (!fs.existsSync(androidDir)) return null;

  for (const entry of fs.readdirSync(androidDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const apk = path.join(androidDir, entry.name, 'Roselt.apk');
    if (fs.existsSync(apk)) return apk;
  }

  return null;
}

const artifactSources = {
  windows: () => findFirstFile(
    path.join(distDir, 'Windows Portable'),
    (name) => name.toLowerCase().endsWith('.exe')
  ),
  appimage: () => findFirstFile(
    path.join(distDir, 'Linux AppImage'),
    (name) => name.toLowerCase().endsWith('.appimage')
  ),
  flatpak: () => path.join(distDir, 'Linux Flatpak', 'Roselt-Calculator.flatpak'),
  macosArm: () => path.join(distDir, 'macOS', 'Roselt Calculator-darwin-arm64', 'Roselt Calculator.app'),
  android: findAndroidApk
};

function syncArtifact(key) {
  const source = artifactSources[key]?.();
  const finalName = artifactNames[key];
  const copied = copyToFinal(source, finalName);

  if (!copied) {
    console.warn(`  (skipped ${key}; source artifact was not found)`);
    return false;
  }

  console.log(`  Final dist -> ${path.relative(root, path.join(finalDir, finalName))}`);
  return true;
}

function syncArtifacts(keys) {
  for (const key of keys) syncArtifact(key);
}

if (require.main === module) {
  const requested = process.argv.slice(2);
  const keys = requested.length ? requested : Object.keys(artifactNames);
  const unknown = keys.filter((key) => !artifactNames[key]);

  if (unknown.length) {
    console.error(`Unknown final dist artifact(s): ${unknown.join(', ')}`);
    process.exit(1);
  }

  syncArtifacts(keys);
}

module.exports = {
  artifactNames,
  copyToFinal,
  finalDir,
  syncArtifact,
  syncArtifacts
};
