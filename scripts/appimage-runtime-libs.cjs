'use strict';

const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const mirror = 'https://deb.debian.org/debian/pool/main/';
const packages = [
  ['at-spi2-core', 'a/at-spi2-core/libatk-bridge2.0-0_2.46.0-5_amd64.deb',
    'fbb07714fdd3fdee7b63fd8595053f4fa8021d8e350a5de6281c6ce7cd4f158f', ['libatk-bridge-2.0.so.0']],
  ['at-spi2-core', 'a/at-spi2-core/libatspi2.0-0_2.46.0-5_amd64.deb',
    '1c0332f3b712a8e5ee56800bbcab83a8f92098874094f2b0bdfd6b7fd45e8b83', ['libatspi.so.0']],
  ['gtk+3.0', 'g/gtk+3.0/libgtk-3-0_3.24.38-2~deb12u3_amd64.deb',
    '0ff7375c98b5a8d6aafc6096b21d9f7bae4ecb581d31fce5d37be18f55b489a2', ['libgtk-3.so.0', 'libgdk-3.so.0']],
  ['libepoxy', 'libe/libepoxy/libepoxy0_1.5.10-1_amd64.deb',
    '050cbedc9c2a5cce976151c720a3817f2103a01e6ac255bdd6f2c6a7509b04c3', ['libepoxy.so.0']]
];

module.exports = function bundleRuntimeLibraries(appDir, workDir) {
  const libraries = path.join(appDir, 'usr', 'lib');
  const notices = path.join(appDir, 'usr', 'share', 'licenses', 'runtime-libraries');
  fs.mkdirSync(libraries, { recursive: true });
  fs.mkdirSync(notices, { recursive: true });
  for (const [source, file, sha256, sonames] of packages) {
    const [name, version] = path.basename(file).split('_');
    const archive = path.join(workDir, path.basename(file));
    const unpack = path.join(workDir, name);
    fs.mkdirSync(unpack);
    execFileSync('curl', ['--fail', '--silent', '--show-error', '--retry', '2',
      '--location', '--output', archive, new URL(file, mirror).href]);
    if (createHash('sha256').update(fs.readFileSync(archive)).digest('hex') !== sha256) {
      throw new Error(`Unexpected checksum for ${name}`);
    }
    const member = execFileSync('ar', ['t', archive], { encoding: 'utf8' }).split('\n')
      .find((entry) => entry.startsWith('data.tar'));
    if (!member) throw new Error(`Missing data archive in ${name}`);
    const data = path.join(unpack, member);
    const fd = fs.openSync(data, 'w');
    try {
      execFileSync('ar', ['p', archive, member], { stdio: ['ignore', fd, 'inherit'] });
    } finally {
      fs.closeSync(fd);
    }
    execFileSync('tar', ['-xf', data, '-C', unpack]);
    for (const soname of sonames) {
      fs.copyFileSync(path.join(unpack, 'usr', 'lib', 'x86_64-linux-gnu', soname), path.join(libraries, soname));
    }
    const copyright = path.join(unpack, 'usr', 'share', 'doc', name, 'copyright');
    fs.copyFileSync(copyright, path.join(notices, name + '.copyright'));
    const sourceUrl = `https://sources.debian.org/src/${encodeURIComponent(source)}/${encodeURIComponent(version)}/`;
    fs.writeFileSync(path.join(notices, name + '.source'), sourceUrl + '\n');
  }
};
