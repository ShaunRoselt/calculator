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
    assert.equal(await evaluate("import('./scripts/config.js').then(({ APP_INFO }) => APP_INFO.version)"), version);

    assert.equal(await evaluate(`(() => {
      for (const label of ['2', '+', '3', '=']) {
        const button = [...document.querySelectorAll('main button[data-action]')]
          .find((element) => element.textContent.trim() === label);
        if (!button) throw new Error('Missing calculator key ' + label);
        button.click();
      }
      return document.querySelector('.display-value').textContent.trim();
    })()`), '5');

    if (process.env.ROSELT_SMOKE_GAMEPAD === '1') {
      await command('Emulation.setFocusEmulationEnabled', { enabled: true });
      await evaluate(`(() => {
        const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
        const gamepad = { buttons, axes: [0, 0, 0, 0], index: 0, mapping: 'standard', connected: true };
        Object.defineProperty(navigator, 'getGamepads', { value: () => [gamepad] });
        window.pressTestGamepad = async (index) => {
          buttons[index].pressed = true;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          buttons[index].pressed = false;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        };
        window.panTestGamepad = async () => {
          gamepad.axes[2] = 1;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          gamepad.axes[2] = 0;
        };
        window.dispatchEvent(new Event('gamepadconnected'));
        document.querySelector('[data-action="clear-all"]').click();
      })()`);
      const press = (index) => evaluate(`pressTestGamepad(${index})`);
      const focused = () => evaluate("document.activeElement?.textContent.trim()");
      await press(13);
      await evaluate("document.querySelector('[data-action=digit][data-value=\"2\"]').focus()");
      await press(0);
      assert.equal(await focused(), '2', 'Keep focus on the same calculator key after activating it.');
      await press(15);
      assert.equal(await focused(), '3');
      await press(15);
      assert.equal(await focused(), '+');
      await press(0);
      await press(14);
      await press(0);
      await press(13);
      await press(15);
      assert.equal(await focused(), '=');
      await press(0);
      assert.equal(await evaluate("document.querySelector('.display-value')?.textContent.trim()"), '5');
      await press(9);
      assert.equal(await evaluate("document.activeElement?.dataset.setMode"), 'standard');
      await press(13);
      assert.equal(await evaluate("document.activeElement?.dataset.setMode"), 'scientific');
      await press(1);
      assert.equal(await focused(), '=', 'Closing the menu should restore the last calculator control.');

      await evaluate("document.querySelector('[data-set-mode=graphing]').click()");
      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (await evaluate("Boolean(document.querySelector('#graph-canvas'))")) break;
        await delay(100);
      }
      const graphOrigin = () => evaluate("import('./scripts/state.js').then(({ state }) => state.graphing.viewport.xMin)");
      const initialOrigin = await graphOrigin();
      await evaluate('panTestGamepad()');
      assert.ok(await graphOrigin() > initialOrigin, 'The right stick should pan the graph.');
      console.log('Gamepad navigation calculated 2 + 3 = 5, restored focus, and panned a graph.');
    }

    assert.equal(await evaluate(`(async () => {
      const result = await window.settingsFile.save({ theme: 'dark' });
      return result.saved && (await window.settingsFile.load()).settings.theme === 'dark';
    })()`), true, 'The packaged app should save and read desktop settings.');
    const defaultScale = await evaluate('devicePixelRatio');
    await evaluate("document.querySelector('[data-set-mode=settings]').click()");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (await evaluate("Boolean(document.getElementById('settings-zoom'))")) break;
      await delay(100);
    }
    assert.equal(await evaluate(`(() => {
      const zoom = document.getElementById('settings-zoom');
      if (!zoom || zoom.value !== '100') return false;
      zoom.closest('details').open = true;
      zoom.focus();
      return true;
    })()`), true, 'Preferences should open with a default zoom of 100%.');
    if (process.env.ROSELT_SMOKE_GAMEPAD === '1') {
      const press = (index) => evaluate(`pressTestGamepad(${index})`);
      await press(0);
      await press(15);
      assert.notEqual(await evaluate("document.getElementById('settings-zoom').value"), '100');
      await press(1);
      assert.equal(await evaluate("document.getElementById('settings-zoom').value"), '100');
      const steps = await evaluate(`(() => {
        const zoom = document.getElementById('settings-zoom');
        return [...zoom.options].findIndex(({ value }) => value === '125') - zoom.selectedIndex;
      })()`);
      assert.ok(steps > 0);
      await press(0);
      for (let step = 0; step < steps; step++) await press(15);
      await press(0);
    } else {
      await evaluate(`(() => {
        const zoom = document.getElementById('settings-zoom');
        zoom.value = '125';
        zoom.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
    }

    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (Math.abs(await evaluate('devicePixelRatio') / defaultScale - 1.25) < 0.01) break;
      await delay(100);
    }
    assert.ok(Math.abs(await evaluate('devicePixelRatio') / defaultScale - 1.25) < 0.01,
      'Choosing 125% should immediately increase the page zoom.');
    assert.equal(await evaluate(`(async () => {
      const { flushSettingsFile } = await import('./scripts/settingsFile.js');
      await flushSettingsFile();
      return (await window.settingsFile.load()).settings.zoomPercent;
    })()`), 125, 'The app should persist the selected zoom.');

    console.log('Packaged calculator calculated 2 + 3 = 5 and applied and saved 125% zoom.');
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
