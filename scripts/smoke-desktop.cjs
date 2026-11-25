'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const [executable, ...launcherArgs] = process.argv.slice(2);
assert(executable, 'Pass the packaged executable and any launcher arguments.');

const profile = mkdtempSync(path.join(os.tmpdir(), 'roselt-smoke-'));
const port = Number(process.env.ROSELT_SMOKE_PORT || 44123);
const app = spawn(executable, [
  ...launcherArgs,
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`
], { stdio: 'inherit' });

let launchError;
app.on('error', (error) => { launchError = error; });

async function findApp() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (launchError) throw launchError;
    assert.equal(app.exitCode, null, 'The packaged app exited before it was ready.');
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })
      .then((response) => response.json()).catch(() => []);
    const page = pages.find(({ type, url }) => type === 'page' && url.includes('/app.html'));
    if (page) return page;
    await delay(500);
  }
  throw new Error('Timed out waiting for the packaged calculator window.');
}

async function smokeTest() {
  const page = await findApp();
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  try {
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    function command(method, params) {
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.removeEventListener('message', receive);
          reject(new Error(`Timed out running ${method}.`));
        }, 10000);
        function receive(event) {
          const response = JSON.parse(event.data);
          if (response.id !== requestId) return;
          clearTimeout(timer);
          socket.removeEventListener('message', receive);
          if (response.error) reject(new Error(response.error.message));
          else resolve(response.result);
        }
        socket.addEventListener('message', receive);
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    }
    async function evaluate(expression) {
      const { result, exceptionDetails } = await command('Runtime.evaluate', {
        expression, returnByValue: true, awaitPromise: true
      });
      if (exceptionDetails) throw new Error(result.description ?? exceptionDetails.text);
      return result.value;
    }

    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (await evaluate("Boolean(document.querySelector('.display-value'))")) break;
      await delay(500);
    }
    assert.equal(await evaluate("document.querySelector('.display-value')?.textContent.trim()"), '0');
    const { version } = require('../package.json');
    assert.equal(await evaluate("(await import('./scripts/config.js')).APP_INFO.version"), version);

    assert.equal(await evaluate(`(() => {
      for (const label of ['2', '+', '3', '=']) {
        const button = [...document.querySelectorAll('main button[data-action]')]
          .find((element) => element.textContent.trim() === label);
        if (!button) throw new Error('Missing calculator key ' + label);
        button.click();
      }
      return document.querySelector('.display-value').textContent.trim();
    })()`), '5');

    assert.equal(await evaluate(`(async () => {
      const result = await window.settingsFile.save({ theme: 'dark' });
      return result.saved && (await window.settingsFile.load()).settings.theme === 'dark';
    })()`), true, 'The packaged app should save and read desktop settings.');
    console.log('Packaged calculator launched, calculated 2 + 3 = 5, and saved desktop settings.');
    await command('Browser.close').catch(() => {});
  } finally {
    socket.close();
  }
}

smokeTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (app.exitCode === null && !launchError) {
    await Promise.race([new Promise((resolve) => app.once('exit', resolve)), delay(4000)]);
    if (app.exitCode === null) app.kill();
  }
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  } catch (error) {
    console.warn(error.message);
  }
});
