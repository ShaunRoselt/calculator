#!/usr/bin/env node

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIR = path.join(__dirname, 'Steam Store', 'Delphi');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'store');
const ELECTRON_BIN = typeof require('electron') === 'string'
  ? require('electron')
  : path.join(
    ROOT,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron.cmd' : 'electron'
  );
const DARK_BACKGROUND = '#1b1c20';
const FOREGROUND = '#f4f4f5';
const ACCENT = '#57b9ed';
const ACCENT_SOFT = '#4fb2e7';
const LOGO_DATA_URL = toDataUrl(fs.readFileSync(path.join(ROOT, 'assets', 'logos', 'dark.svg'), 'utf8'), 'image/svg+xml');
const FONT_REGULAR_DATA_URL = toDataUrl(fs.readFileSync(path.join(ROOT, 'assets', 'fonts', 'Selawik', 'selawk.woff2')), 'font/woff2');
const FONT_BOLD_DATA_URL = toDataUrl(fs.readFileSync(path.join(ROOT, 'assets', 'fonts', 'Selawik', 'selawkb.woff2')), 'font/woff2');
const LOGO_VIEWBOX_WIDTH = 499;
const LOGO_VIEWBOX_HEIGHT = 667;
const LOGO_ASPECT_RATIO = LOGO_VIEWBOX_WIDTH / LOGO_VIEWBOX_HEIGHT;
const INTERNAL_ELECTRON_FLAGS = new Set(['--no-sandbox', '--disable-setuid-sandbox']);

function toDataUrl(content, mimeType) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function isElectronMainProcess() {
  return Boolean(process.versions?.electron) && process.type !== 'renderer';
}

function printHelp() {
  console.log('Generate Steam store marketing images into marketing/steam/store.');
  console.log('');
  console.log('Usage: npm run generate:steam:store -- [options]');
  console.log('       node marketing/steam/generate_store_images.cjs [options]');
  console.log('');
  console.log('Options:');
  console.log(`  --output-dir=${DEFAULT_OUTPUT_DIR}  Override the output directory.`);
  console.log('  --help, -h                         Show this help.');
}

function parseArgs(argv) {
  const options = {
    outputDir: DEFAULT_OUTPUT_DIR,
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
      options.outputDir = rawOutputDir ? path.resolve(rawOutputDir) : DEFAULT_OUTPUT_DIR;
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

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Unsupported source asset format: ${filePath}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function detectLayout(fileName) {
  if (fileName === 'Library Hero.png') {
    return 'hero';
  }

  if (fileName === 'Shortcut Icon.png') {
    return 'icon';
  }

  if (fileName === 'Library Logo.png') {
    return 'logo-wide';
  }

  if (fileName === 'Library Capsule.png' || fileName === 'Vertical Capsule.png') {
    return 'stacked';
  }

  if (fileName === 'Small Capsule.png') {
    return 'small';
  }

  if (fileName === 'Main Capsule.png') {
    return 'feature';
  }

  return 'wide';
}

function loadTemplateSpecs() {
  return fs
    .readdirSync(SOURCE_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith('.png'))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      const sourcePath = path.join(SOURCE_DIR, fileName);
      const { width, height } = readPngSize(sourcePath);

      return {
        fileName,
        width,
        height,
        layout: detectLayout(fileName)
      };
    });
}

function svgLength(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function escapeText(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderLogo(x, y, height) {
  const width = height * LOGO_ASPECT_RATIO;

  return `<image href="${LOGO_DATA_URL}" x="${svgLength(x)}" y="${svgLength(y)}" width="${svgLength(width)}" height="${svgLength(height)}" preserveAspectRatio="xMidYMid meet"/>`;
}

function renderTextLines({ lines, x, y, fontSize, lineHeight, textAnchor = 'middle' }) {
  return lines
    .map((line, index) => `<text class="title" x="${svgLength(x)}" y="${svgLength(y + index * lineHeight)}" font-size="${svgLength(fontSize)}" text-anchor="${textAnchor}">${escapeText(line)}</text>`)
    .join('');
}

function renderBackdrop(width, height, options = {}) {
  const edgeRadius = Math.min(width, height) * 0.06;
  const accentOpacity = options.hero ? 0.2 : 0.1;

  return [
    `<rect width="${width}" height="${height}" fill="${DARK_BACKGROUND}" rx="${svgLength(edgeRadius)}"/>`,
    `<rect width="${width}" height="${height}" fill="url(#baseGradient)" rx="${svgLength(edgeRadius)}"/>`,
    `<circle cx="${svgLength(width * 0.18)}" cy="${svgLength(height * 0.16)}" r="${svgLength(Math.max(width, height) * 0.22)}" fill="url(#blueGlow)" opacity="${accentOpacity}"/>`,
    `<circle cx="${svgLength(width * 0.84)}" cy="${svgLength(height * 0.82)}" r="${svgLength(Math.max(width, height) * 0.24)}" fill="url(#blueGlow)" opacity="${accentOpacity * 0.8}"/>`,
    `<rect x="${svgLength(width * 0.04)}" y="${svgLength(height * 0.04)}" width="${svgLength(width * 0.92)}" height="${svgLength(height * 0.92)}" rx="${svgLength(edgeRadius * 0.72)}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${svgLength(Math.max(2, Math.min(width, height) * 0.003))}"/>`
  ].join('');
}

function renderHeroKeys(width, height) {
  const startX = width * 0.08;
  const startY = height * 0.22;
  const keyWidth = width * 0.12;
  const keyHeight = height * 0.22;
  const gap = width * 0.022;
  const rows = 2;
  const cols = 3;
  const cells = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < cols; columnIndex += 1) {
      const x = startX + columnIndex * (keyWidth + gap);
      const y = startY + rowIndex * (keyHeight + gap * 1.4);
      const fillOpacity = rowIndex === 0 && columnIndex === 2 ? 0.14 : 0.04;

      cells.push(`<rect x="${svgLength(x)}" y="${svgLength(y)}" width="${svgLength(keyWidth)}" height="${svgLength(keyHeight)}" rx="${svgLength(width * 0.015)}" fill="rgba(87,185,237,${fillOpacity})" stroke="rgba(87,185,237,0.18)" stroke-width="${svgLength(width * 0.0019)}"/>`);
    }
  }

  return cells.join('');
}

function renderWideLayout(spec) {
  const logoHeight = spec.height * (spec.layout === 'feature' ? 0.5 : 0.4);
  const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
  const logoX = (spec.width - logoWidth) / 2;
  const logoY = spec.height * 0.08;
  const fontSize = spec.height * (spec.layout === 'feature' ? 0.21 : 0.22);
  const baselineY = spec.height * (spec.layout === 'feature' ? 0.85 : 0.82);
  const accentWidth = spec.width * 0.44;
  const accentHeight = Math.max(6, spec.height * 0.015);
  const accentX = (spec.width - accentWidth) / 2;
  const accentY = baselineY - fontSize * 0.95;

  return [
    `<rect x="${svgLength(accentX)}" y="${svgLength(accentY)}" width="${svgLength(accentWidth)}" height="${svgLength(accentHeight)}" rx="${svgLength(accentHeight / 2)}" fill="url(#accentGradient)" opacity="0.78"/>`,
    renderLogo(logoX, logoY, logoHeight),
    renderTextLines({
      lines: ['Roselt Calculator'],
      x: spec.width / 2,
      y: baselineY,
      fontSize,
      lineHeight: fontSize * 1.1
    })
  ].join('');
}

function renderSmallLayout(spec) {
  const logoHeight = spec.height * 0.34;
  const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
  const logoX = (spec.width - logoWidth) / 2;
  const logoY = spec.height * 0.06;
  const fontSize = Math.min(spec.height * 0.3, spec.width * 0.115);

  return [
    renderLogo(logoX, logoY, logoHeight),
    renderTextLines({
      lines: ['Roselt Calculator'],
      x: spec.width / 2,
      y: spec.height * 0.79,
      fontSize,
      lineHeight: fontSize * 1.08
    })
  ].join('');
}

function renderStackedLayout(spec) {
  const logoHeight = spec.height * 0.42;
  const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
  const logoX = (spec.width - logoWidth) / 2;
  const logoY = spec.height * 0.08;
  const fontSize = Math.min(spec.width * 0.16, spec.height * 0.135);

  return [
    renderLogo(logoX, logoY, logoHeight),
    renderTextLines({
      lines: ['Roselt', 'Calculator'],
      x: spec.width / 2,
      y: spec.height * 0.72,
      fontSize,
      lineHeight: fontSize * 1.16
    })
  ].join('');
}

function renderLogoWideLayout(spec) {
  const logoHeight = spec.height * 0.48;
  const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
  const logoX = (spec.width - logoWidth) / 2;
  const logoY = spec.height * 0.08;
  const fontSize = Math.min(spec.height * 0.19, spec.width * 0.11);

  return [
    renderLogo(logoX, logoY, logoHeight),
    renderTextLines({
      lines: ['Roselt Calculator'],
      x: spec.width / 2,
      y: spec.height * 0.84,
      fontSize,
      lineHeight: fontSize * 1.08
    })
  ].join('');
}

function renderIconLayout(spec) {
  const logoHeight = Math.min(spec.width, spec.height) * 0.74;
  const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
  const logoX = (spec.width - logoWidth) / 2;
  const logoY = (spec.height - logoHeight) / 2;

  return [
    `<circle cx="${svgLength(spec.width * 0.5)}" cy="${svgLength(spec.height * 0.48)}" r="${svgLength(spec.width * 0.34)}" fill="url(#blueGlow)" opacity="0.15"/>`,
    renderLogo(logoX, logoY, logoHeight)
  ].join('');
}

function renderHeroLayout(spec) {
  return '';
}

function renderLayout(spec) {
  if (spec.layout === 'hero') {
    return renderHeroLayout(spec);
  }

  if (spec.layout === 'icon') {
    return renderIconLayout(spec);
  }

  if (spec.layout === 'logo-wide') {
    return renderLogoWideLayout(spec);
  }

  if (spec.layout === 'stacked') {
    return renderStackedLayout(spec);
  }

  if (spec.layout === 'small') {
    return renderSmallLayout(spec);
  }

  return renderWideLayout(spec);
}

function createSvg(spec) {
  const backdropMarkup = spec.layout === 'logo-wide'
    ? ''
    : renderBackdrop(spec.width, spec.height, { hero: spec.layout === 'hero' });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}" role="img" aria-label="${escapeText(spec.fileName.replace(/\.png$/i, ''))}">
  <defs>
    <style>
      @font-face {
        font-family: 'Steam Selawik';
        font-style: normal;
        font-weight: 400;
        src: url('${FONT_REGULAR_DATA_URL}') format('woff2');
      }

      @font-face {
        font-family: 'Steam Selawik';
        font-style: normal;
        font-weight: 700;
        src: url('${FONT_BOLD_DATA_URL}') format('woff2');
      }

      .title {
        fill: ${FOREGROUND};
        font-family: 'Steam Selawik', sans-serif;
        font-weight: 700;
        letter-spacing: -0.05em;
        text-rendering: geometricPrecision;
      }

      .eyebrow {
        fill: rgba(244, 244, 245, 0.72);
        font-family: 'Steam Selawik', sans-serif;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }
    </style>
    <linearGradient id="baseGradient" x1="0" y1="0" x2="${svgLength(spec.width)}" y2="${svgLength(spec.height)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#16171b"/>
      <stop offset="0.5" stop-color="${DARK_BACKGROUND}"/>
      <stop offset="1" stop-color="#202228"/>
    </linearGradient>
    <radialGradient id="blueGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${svgLength(spec.width * 0.5)} ${svgLength(spec.height * 0.5)}) rotate(90) scale(${svgLength(spec.height * 0.8)} ${svgLength(spec.width * 0.7)})">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="1"/>
      <stop offset="1" stop-color="${ACCENT_SOFT}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ACCENT}"/>
      <stop offset="1" stop-color="${ACCENT_SOFT}"/>
    </linearGradient>
  </defs>
  ${backdropMarkup}
  ${renderLayout(spec)}
</svg>`;
}

async function renderSvgToPng(BrowserWindow, window, svgMarkup, width, height) {
  window.setContentSize(width, height);
  const svgUrl = toDataUrl(svgMarkup, 'image/svg+xml');
  await window.loadURL(svgUrl);
  await window.webContents.executeJavaScript(`new Promise((resolve) => {
    const finish = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
    if (document.fonts?.ready) {
      document.fonts.ready.then(finish, finish);
      return;
    }
    finish();
  })`);
  const image = await window.webContents.capturePage({ x: 0, y: 0, width, height });

  return image.toPNG();
}

async function generateAssetsInElectron(options) {
  const { app, BrowserWindow } = require('electron');

  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  await app.whenReady();

  const specs = loadTemplateSpecs();
  await fsp.mkdir(options.outputDir, { recursive: true });

  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
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
      const svgMarkup = createSvg(spec);
      const pngBuffer = await renderSvgToPng(BrowserWindow, window, svgMarkup, spec.width, spec.height);
      const outputPath = path.join(options.outputDir, spec.fileName);
      await fsp.writeFile(outputPath, pngBuffer);
      console.log(`generated ${spec.fileName} (${spec.width}x${spec.height})`);
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
    const childEnv = {
      ...process.env,
      ROS_ELT_STORE_OUTPUT_DIR: options.outputDir
    };
    delete childEnv.ELECTRON_RUN_AS_NODE;

    const child = spawn(ELECTRON_BIN, [__filename, '--no-sandbox', '--disable-setuid-sandbox', ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: childEnv
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
      outputDir: process.env.ROS_ELT_STORE_OUTPUT_DIR ? path.resolve(process.env.ROS_ELT_STORE_OUTPUT_DIR) : options.outputDir
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
