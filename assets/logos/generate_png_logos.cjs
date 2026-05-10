#!/usr/bin/env node

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LOGO_DIR = __dirname;
const OUTPUT_SIZE = 512;
const ELECTRON_BIN = path.join(
  ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
);
const INTERNAL_ELECTRON_FLAGS = new Set(['--no-sandbox', '--disable-setuid-sandbox']);

function isElectronMainProcess() {
  return Boolean(process.versions?.electron) && process.type !== 'renderer';
}

function toDataUrl(content, mimeType) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function printHelp() {
  console.log('Generate 512x512 PNG versions of every SVG in assets/logos.');
  console.log('');
  console.log('Usage: npm run generate:logos:png -- [options]');
  console.log('       node assets/logos/generate_png_logos.cjs [options]');
  console.log('');
  console.log('Options:');
  console.log(`  --output-dir=${LOGO_DIR}  Override the output directory.`);
  console.log('  --help, -h               Show this help.');
}

function parseArgs(argv) {
  const options = {
    outputDir: LOGO_DIR,
    help: false
  };

  for (const arg of argv) {
    if (path.resolve(arg) === __filename) {
      continue;
    }

    if (INTERNAL_ELECTRON_FLAGS.has(arg)) {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg.startsWith('--output-dir=')) {
      const rawOutputDir = arg.slice('--output-dir='.length).trim();
      options.outputDir = rawOutputDir ? path.resolve(rawOutputDir) : LOGO_DIR;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function ensureElectronInstalled() {
  if (!fs.existsSync(ELECTRON_BIN)) {
    throw new Error(`Electron binary not found at ${ELECTRON_BIN}. Run npm install first.`);
  }
}

function loadSvgFiles() {
  return fs
    .readdirSync(LOGO_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith('.svg'))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => ({
      fileName,
      inputPath: path.join(LOGO_DIR, fileName),
      outputPath: path.join(LOGO_DIR, `${path.basename(fileName, '.svg')}.png`)
    }));
}

async function renderSvgToPng(window, svgMarkup) {
  const htmlMarkup = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: transparent;
        overflow: hidden;
      }

      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .frame {
        width: ${OUTPUT_SIZE}px;
        height: ${OUTPUT_SIZE}px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <img id="logo" alt="" src="${toDataUrl(svgMarkup, 'image/svg+xml')}" />
    </div>
  </body>
</html>`;

  await window.loadURL(toDataUrl(htmlMarkup, 'text/html'));
  await window.webContents.executeJavaScript(`new Promise((resolve) => {
    const image = document.getElementById('logo');
    const finish = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
    if (image.complete && image.naturalWidth > 0) {
      finish();
      return;
    }
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
  })`);

  const capture = await window.webContents.capturePage({ x: 0, y: 0, width: OUTPUT_SIZE, height: OUTPUT_SIZE });
  return capture.toPNG();
}

async function generateAssetsInElectron(options) {
  const { app, BrowserWindow } = require('electron');

  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  await app.whenReady();

  const specs = loadSvgFiles();
  await fsp.mkdir(options.outputDir, { recursive: true });

  const window = new BrowserWindow({
    show: false,
    width: OUTPUT_SIZE,
    height: OUTPUT_SIZE,
    useContentSize: true,
    backgroundColor: '#00000000',
    paintWhenInitiallyHidden: true,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  window.webContents.setZoomFactor(1);

  try {
    for (const spec of specs) {
      const svgMarkup = fs.readFileSync(spec.inputPath, 'utf8');
      const pngBuffer = await renderSvgToPng(window, svgMarkup);
      const outputPath = path.join(options.outputDir, path.basename(spec.outputPath));
      await fsp.writeFile(outputPath, pngBuffer);
      console.log(`generated ${path.basename(outputPath)}`);
    }
  } finally {
    window.destroy();
    await app.quit();
  }
}

function runElectronProcess(options) {
  return generateAssetsInElectron(options).catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}

function runCli(options) {
  ensureElectronInstalled();

  return new Promise((resolve, reject) => {
    const child = spawn(ELECTRON_BIN, ['--no-sandbox', '--disable-setuid-sandbox', __filename, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ROS_ELT_LOGO_PNG_OUTPUT_DIR: options.outputDir
      }
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Electron exited with code ${code}`));
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (isElectronMainProcess()) {
    const electronOptions = {
      ...options,
      outputDir: process.env.ROS_ELT_LOGO_PNG_OUTPUT_DIR ? path.resolve(process.env.ROS_ELT_LOGO_PNG_OUTPUT_DIR) : options.outputDir
    };
    await runElectronProcess(electronOptions);
    return;
  }

  await runCli(options);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});