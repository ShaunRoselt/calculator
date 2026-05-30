#!/usr/bin/env node
'use strict';

/*
 * Embeds native Windows metadata + icon into a built Electron .exe using resedit
 * (pure JS, no wine required). This makes Task Manager, the taskbar, and the
 * file's Properties show "Roselt Calculator" with the app icon instead of the
 * generic "Electron".
 *
 * Usage: node scripts/patch-windows-exe.cjs "<path-to-exe>"
 */

const fs = require('node:fs');
const path = require('node:path');
const ResEdit = require('resedit');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const icoPath = path.join(root, 'assets', 'icons', 'app-icon-dark.ico');

const PRODUCT_NAME = pkg.build?.productName || 'Roselt Calculator';
const COMPANY = (typeof pkg.author === 'string' ? pkg.author : pkg.author?.name) || 'Shaun Roselt';
const VERSION = String(pkg.version || '0.0.0');
const DESCRIPTION = pkg.description || PRODUCT_NAME;

function versionTuple(version) {
  const parts = version.split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4);
}

function patch(exePath) {
  const exeName = path.basename(exePath);
  const data = fs.readFileSync(exePath);
  const exe = ResEdit.NtExecutable.from(data);
  const res = ResEdit.NtExecutableResource.from(exe);

  // --- Icon: replace every existing icon group so the exe shows our icon ---
  const icon = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
  const iconImages = icon.icons.map((item) => item.data);
  const groupIcons = res.entries.filter((e) => e.type === 14); // RT_GROUP_ICON
  const groupIds = groupIcons.length > 0 ? [...new Set(groupIcons.map((e) => e.id))] : [1];
  for (const id of groupIds) {
    const lang = groupIcons.find((e) => e.id === id)?.lang ?? 1033;
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, lang, iconImages);
  }

  // --- Version info / strings shown by Task Manager and Properties ---
  const [major, minor, patchNum, build] = versionTuple(VERSION);
  const versions = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  const vi = versions.length > 0 ? versions[0] : ResEdit.Resource.VersionInfo.createEmpty();

  vi.setFileVersion(major, minor, patchNum, build);
  vi.setProductVersion(major, minor, patchNum, build);

  const langs = vi.getAllLanguagesForStringValues();
  const targetLangs = langs.length > 0 ? langs : [{ lang: 1033, codepage: 1200 }];
  for (const lang of targetLangs) {
    vi.setStringValues(lang, {
      CompanyName: COMPANY,
      FileDescription: PRODUCT_NAME,
      FileVersion: VERSION,
      InternalName: PRODUCT_NAME,
      LegalCopyright: `Copyright © ${new Date().getFullYear()} ${COMPANY}`,
      OriginalFilename: exeName,
      ProductName: PRODUCT_NAME,
      ProductVersion: VERSION,
      Comments: DESCRIPTION,
    });
  }
  vi.outputToResourceEntries(res.entries);

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
}

module.exports = { patch };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/patch-windows-exe.cjs "<path-to-exe>"');
    process.exit(1);
  }
  if (!fs.existsSync(target)) {
    console.error(`Executable not found: ${target}`);
    process.exit(1);
  }
  patch(target);
  console.log(`  patched native metadata + icon -> ${path.basename(target)}`);
}
