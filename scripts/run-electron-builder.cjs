'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const cli = require.resolve('electron-builder/cli.js', { paths: [root] });

/** Run electron-builder without npm .cmd/.sh shims (EINVAL on Windows + Node 20+). */
function runElectronBuilder(args, options = {}) {
  const cwd = options.cwd ?? root;
  const { cwd: _cwd, ...spawnOpts } = options;
  // CI sets GITHUB_ACTIONS; without this, v26 tries to publish and requires GH_TOKEN.
  execFileSync(process.execPath, [cli, '--publish', 'never', ...args], {
    stdio: 'inherit',
    cwd,
    ...spawnOpts
  });
}

module.exports = { runElectronBuilder };
