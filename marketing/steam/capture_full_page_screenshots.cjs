#!/usr/bin/env node

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_ROOT = path.join(ROOT, 'marketing', 'steam', 'screenshot-assets', 'full-page');
const THEME_INDEX_PATH = path.join(ROOT, 'assets', 'themes', 'data', 'index.json');
const ELECTRON_BIN = path.join(
  ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
);
const APP_ENTRY = 'app.html';
const EXPECTED_MODE_ORDER = [
  'standard',
  'scientific',
  'graphing',
  'programmer',
  'date',
  'currency',
  'volume',
  'length',
  'weight',
  'temperature',
  'energy',
  'area',
  'speed',
  'time',
  'power',
  'data',
  'pressure',
  'angle',
  'settings'
];
const THEME_IDS = loadThemeIds();
const VIEWPORT_SPECS = {
  desktop: {
    cssWidth: 1280,
    cssHeight: 720,
    outputWidth: 3840,
    outputHeight: 2160,
    deviceScaleFactor: 3
  },
  tablet: {
    cssWidth: 800,
    cssHeight: 1024,
    outputWidth: 3200,
    outputHeight: 4096,
    deviceScaleFactor: 4
  },
  mobile: {
    cssWidth: 384,
    cssHeight: 640,
    outputWidth: 2304,
    outputHeight: 3840,
    deviceScaleFactor: 6
  }
};
const CONVERTER_SAMPLE_VALUES = {
  currency: '250',
  volume: '3.5',
  length: '120',
  weight: '75',
  temperature: '23',
  energy: '512',
  area: '1500',
  speed: '88',
  time: '48',
  power: '750',
  data: '2048',
  pressure: '101.3',
  angle: '180'
};

const TOOL_ARGUMENT_PREFIXES = [
  '--help',
  '-h',
  '--themes=',
  '--viewports=',
  '--modes=',
  '--output-root=',
  '--base-url=',
  '--viewport='
];

function loadThemeIds() {
  const themeIndex = JSON.parse(fs.readFileSync(THEME_INDEX_PATH, 'utf8'));
  const themeIds = Array.isArray(themeIndex?.themes)
    ? themeIndex.themes
      .map((theme) => theme?.id)
      .filter((themeId) => typeof themeId === 'string' && themeId.trim() !== '')
    : [];

  if (themeIds.length === 0) {
    throw new Error(`Unable to load any theme IDs from ${THEME_INDEX_PATH}`);
  }

  return themeIds;
}

function isElectronMainProcess() {
  return Boolean(process.versions?.electron) && process.type !== 'renderer';
}

function extractToolArgs(argv) {
  return argv.filter((arg) => TOOL_ARGUMENT_PREFIXES.some((prefix) => arg === prefix || arg.startsWith(prefix)));
}

function parseCsvArgument(rawValue, fallbackValues, validValues) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return [...fallbackValues];
  }

  const selected = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (selected.length === 0) {
    return [...fallbackValues];
  }

  const unknownValues = selected.filter((value) => !validValues.includes(value));
  if (unknownValues.length > 0) {
    throw new Error(`Unknown values: ${unknownValues.join(', ')}`);
  }

  return selected;
}

function parseArgs(argv) {
  const options = {
    themes: [...THEME_IDS],
    viewports: Object.keys(VIEWPORT_SPECS),
    modes: [...EXPECTED_MODE_ORDER],
    outputRoot: OUTPUT_ROOT,
    baseUrl: '',
    viewportName: '',
    help: false
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg.startsWith('--themes=')) {
      options.themes = parseCsvArgument(arg.slice('--themes='.length), THEME_IDS, THEME_IDS);
      continue;
    }

    if (arg.startsWith('--viewports=')) {
      options.viewports = parseCsvArgument(arg.slice('--viewports='.length), Object.keys(VIEWPORT_SPECS), Object.keys(VIEWPORT_SPECS));
      continue;
    }

    if (arg.startsWith('--modes=')) {
      options.modes = parseCsvArgument(arg.slice('--modes='.length), EXPECTED_MODE_ORDER, EXPECTED_MODE_ORDER);
      continue;
    }

    if (arg.startsWith('--output-root=')) {
      const outputRoot = arg.slice('--output-root='.length).trim();
      options.outputRoot = outputRoot ? path.resolve(outputRoot) : OUTPUT_ROOT;
      continue;
    }

    if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length).trim();
      continue;
    }

    if (arg.startsWith('--viewport=')) {
      options.viewportName = arg.slice('--viewport='.length).trim();
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log('Generate full-page calculator screenshots for Steam marketing assets.');
  console.log('');
  console.log('Usage: npm run capture:steam:screenshots -- [options]');
  console.log('');
  console.log('Options:');
  console.log(`  --themes=${THEME_IDS.join(',')}          Limit output themes.`);
  console.log(`  --viewports=${Object.keys(VIEWPORT_SPECS).join(',')}   Limit output viewport families.`);
  console.log(`  --modes=${EXPECTED_MODE_ORDER.join(',')}  Limit output modes.`);
  console.log(`  --output-root=${OUTPUT_ROOT}  Override the output directory.`);
}

function ensureElectronInstalled() {
  if (!fs.existsSync(ELECTRON_BIN)) {
    throw new Error(`Electron binary not found at ${ELECTRON_BIN}. Run npm install first.`);
  }
}

function getModeFileName(mode) {
  const index = EXPECTED_MODE_ORDER.indexOf(mode);
  if (index === -1) {
    throw new Error(`Unable to build a file name for unknown mode: ${mode}`);
  }

  return `${String(index + 1).padStart(2, '0')}_${mode}.png`;
}

async function ensureEmptyViewportDirectories(outputRoot, themes, viewports) {
  await fsp.mkdir(outputRoot, { recursive: true });

  for (const themeId of themes) {
    for (const viewportName of viewports) {
      const targetDirectory = path.join(outputRoot, themeId, viewportName);
      await fsp.rm(targetDirectory, { recursive: true, force: true });
      await fsp.mkdir(targetDirectory, { recursive: true });
    }
  }
}

async function writeManifest(outputRoot, options) {
  const manifestPath = path.join(outputRoot, 'manifest.json');
  const manifest = {
    generatedAt: new Date().toISOString(),
    themes: options.themes,
    viewports: options.viewports.map((viewportName) => ({
      name: viewportName,
      ...VIEWPORT_SPECS[viewportName]
    })),
    modes: options.modes,
    files: options.themes.flatMap((themeId) => options.viewports.flatMap((viewportName) => options.modes.map((mode) => ({
      theme: themeId,
      viewport: viewportName,
      mode,
      file: path.relative(outputRoot, path.join(outputRoot, themeId, viewportName, getModeFileName(mode))).replaceAll(path.sep, '/')
    }))))
  };

  await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function createStaticServer(rootDirectory) {
  const mimeTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.gif', 'image/gif'],
    ['.html', 'text/html; charset=utf-8'],
    ['.ico', 'image/x-icon'],
    ['.jpeg', 'image/jpeg'],
    ['.jpg', 'image/jpeg'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'],
    ['.png', 'image/png'],
    ['.svg', 'image/svg+xml'],
    ['.ttf', 'font/ttf'],
    ['.txt', 'text/plain; charset=utf-8'],
    ['.webmanifest', 'application/manifest+json; charset=utf-8'],
    ['.woff', 'font/woff'],
    ['.woff2', 'font/woff2'],
    ['.xml', 'application/xml; charset=utf-8']
  ]);

  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      const decodedPath = decodeURIComponent(requestUrl.pathname);
      const relativePath = decodedPath === '/'
        ? 'index.html'
        : decodedPath.replace(/^\/+/, '');
      const resolvedPath = path.resolve(rootDirectory, relativePath);

      if (!resolvedPath.startsWith(rootDirectory)) {
        response.writeHead(403, { 'Cache-Control': 'no-store' });
        response.end('Forbidden');
        return;
      }

      let stats = null;
      try {
        stats = await fsp.stat(resolvedPath);
      } catch {
        stats = null;
      }

      let filePath = resolvedPath;
      if (stats?.isDirectory()) {
        filePath = path.join(resolvedPath, 'index.html');
      }

      const fileBuffer = await fsp.readFile(filePath);
      const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Length': fileBuffer.length,
        'Content-Type': contentType
      });
      response.end(fileBuffer);
    } catch {
      response.writeHead(404, { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
}

async function startStaticServer() {
  const server = createStaticServer(ROOT);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine the temporary screenshot server address.');
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function stopStaticServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function buildPageHelperSource() {
  return `
if (!globalThis.__captureHelpers) {
  globalThis.__captureHelpers = (() => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function clickButtonByName(label, root = document) {
      const buttons = Array.from(root.querySelectorAll('button'));
      const match = buttons.find((button) => button.textContent.trim() === label || button.getAttribute('aria-label') === label);
      if (!match) {
        throw new Error('Button not found: ' + label);
      }
      match.click();
      await wait(80);
    }

    async function clickAll(labels, root = document) {
      for (const label of labels) {
        await clickButtonByName(label, root);
      }
    }

    async function waitForAppReady() {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await wait(200);
    }

    async function validateModeCatalog() {
      const configModule = await import('./scripts/config.js');
      return Object.keys(configModule.MODE_META);
    }

    async function prepareScene(mode, converterSampleValues) {
      if (mode === 'standard') {
        await clickAll(['1', '2', '5', '×', '1', '6', '=']);
        return;
      }

      if (mode === 'scientific') {
        await clickAll(['1', '2', 'x²']);
        return;
      }

      if (mode === 'programmer') {
        await clickAll(['2', '5', '5']);
        return;
      }

      if (mode === 'graphing') {
        const input = document.querySelector('input[aria-label="Expression 1"], input[placeholder="Enter an expression"]');
        if (!(input instanceof HTMLInputElement)) {
          throw new Error('Graphing input not found');
        }
        input.focus();
        input.value = 'x^2-4';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
        await wait(500);
        return;
      }

      if (mode === 'date') {
        await wait(180);
        return;
      }

      if (mode === 'settings') {
        await wait(120);
        return;
      }

      if (Object.prototype.hasOwnProperty.call(converterSampleValues, mode)) {
        const keypad = document.querySelector('[aria-label="Currency keypad"], [aria-label="Converter keypad"]');
        if (keypad) {
          await clickAll(['CE'], keypad);
          await clickAll(String(converterSampleValues[mode] || '1').split(''), keypad);
        }
        await wait(180);
        return;
      }

      throw new Error('No scene preparation defined for mode: ' + mode);
    }

    return {
      waitForAppReady,
      validateModeCatalog,
      prepareScene
    };
  })();
}
`;
}

function spawnElectronCapture(options, viewportName) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      ELECTRON_BIN,
      [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        __filename,
        `--base-url=${options.baseUrl}`,
        `--output-root=${options.outputRoot}`,
        `--viewport=${viewportName}`,
        `--themes=${options.themes.join(',')}`,
        `--modes=${options.modes.join(',')}`
      ],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          CALCULATOR_CAPTURE_CHILD: '1'
        },
        stdio: 'inherit'
      }
    );

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Electron capture failed for ${viewportName} with exit code ${code}`));
    });
  });
}

async function runCli() {
  const options = parseArgs(extractToolArgs(process.argv.slice(2)));
  if (options.help) {
    printHelp();
    return;
  }

  ensureElectronInstalled();
  await ensureEmptyViewportDirectories(options.outputRoot, options.themes, options.viewports);
  const { server, baseUrl } = await startStaticServer();
  options.baseUrl = baseUrl;

  try {
    for (const viewportName of options.viewports) {
      console.log(`Capturing ${viewportName} screenshots...`);
      await spawnElectronCapture(options, viewportName);
    }
    await writeManifest(options.outputRoot, options);
  } finally {
    await stopStaticServer(server);
  }
}

async function captureViewportMode(BrowserWindow, options, themeId, viewportName, mode) {
  const viewportSpec = VIEWPORT_SPECS[viewportName];
  const url = `${options.baseUrl}/${APP_ENTRY}?page=${encodeURIComponent(mode)}&theme=${encodeURIComponent(themeId)}&language=en`;
  const win = new BrowserWindow({
    width: viewportSpec.cssWidth,
    height: viewportSpec.cssHeight,
    useContentSize: true,
    show: true,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      contextIsolation: false,
      sandbox: false
    }
  });
  const debuggerSession = win.webContents.debugger;

  try {
    console.log(`[${viewportName}] loading ${themeId}/${mode}`);
    await win.loadURL(url);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`[${viewportName}] ready ${themeId}/${mode}`);
    debuggerSession.attach('1.3');
    await debuggerSession.sendCommand('Page.enable');
    await debuggerSession.sendCommand('Emulation.setDeviceMetricsOverride', {
      width: viewportSpec.cssWidth,
      height: viewportSpec.cssHeight,
      deviceScaleFactor: viewportSpec.deviceScaleFactor,
      mobile: false,
      screenWidth: viewportSpec.cssWidth,
      screenHeight: viewportSpec.cssHeight
    });
    console.log(`[${viewportName}] capturing ${themeId}/${mode}`);

    const { data } = await debuggerSession.sendCommand('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });

    const targetPath = path.join(options.outputRoot, themeId, viewportName, getModeFileName(mode));
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await fsp.writeFile(targetPath, Buffer.from(data, 'base64'));
    console.log(`[${viewportName}] wrote ${path.relative(options.outputRoot, targetPath).replaceAll(path.sep, '/')}`);
  } finally {
    if (debuggerSession.isAttached()) {
      debuggerSession.detach();
    }
    await win.close();
  }
}

async function runElectronCapture() {
  const { app, BrowserWindow } = require('electron');
  const options = parseArgs(extractToolArgs(process.argv.slice(2)));
  const viewportSpec = VIEWPORT_SPECS[options.viewportName];
  if (!viewportSpec) {
    throw new Error(`Missing or invalid --viewport value: ${options.viewportName}`);
  }
  if (!options.baseUrl) {
    throw new Error('Missing --base-url value for Electron capture.');
  }

  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  await app.whenReady();
  console.log(`[${options.viewportName}] electron ready`);

  try {
    for (const themeId of options.themes) {
      for (const mode of options.modes) {
        await captureViewportMode(BrowserWindow, options, themeId, options.viewportName, mode);
      }
    }
  } finally {
    app.quit();
  }
}

(async () => {
  try {
    if (isElectronMainProcess() && process.env.CALCULATOR_CAPTURE_CHILD === '1') {
      await runElectronCapture();
      return;
    }

    await runCli();
  } catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
  }
})();
