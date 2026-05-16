#!/usr/bin/env node

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'marketing', 'steam', 'trailer');
const STILLS_DIR = path.join(OUTPUT_DIR, 'stills');
const CLIPS_DIR = path.join(OUTPUT_DIR, 'clips');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');
const FINAL_VIDEO_PATH = path.join(OUTPUT_DIR, 'Roselt-Calculator-Steam-Trailer-1080p60.mp4');
const APP_ENTRY = 'app.html';
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;
const VIDEO_FPS = 60;
const VIDEO_BITRATE = '12000k';
const VIDEO_MAXRATE = '12000k';
const VIDEO_BUFSIZE = '24000k';
const AUDIO_BITRATE = '192k';
const INTERNAL_ELECTRON_FLAGS = new Set(['--no-sandbox', '--disable-setuid-sandbox']);
const ELECTRON_BIN = typeof require('electron') === 'string'
  ? require('electron')
  : path.join(
    ROOT,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron.cmd' : 'electron'
  );

const SCENES = [
  { id: '01_standard_entry', page: 'standard', theme: 'dark', language: 'en', duration: 2.4 },
  { id: '02_standard_result', page: 'standard', theme: 'dark', language: 'en', duration: 2.4 },
  { id: '03_scientific_trig', page: 'scientific', theme: 'dark', language: 'en', duration: 2.5 },
  { id: '04_scientific_factorial', page: 'scientific', theme: 'dark', language: 'en', duration: 2.5 },
  { id: '05_graphing_plot', page: 'graphing', theme: 'dark', language: 'en', duration: 2.8 },
  { id: '06_graphing_analysis', page: 'graphing', theme: 'dark', language: 'en', duration: 2.8 },
  { id: '07_programmer_decimal', page: 'programmer', theme: 'dark', language: 'en', duration: 2.3 },
  { id: '08_programmer_hex', page: 'programmer', theme: 'dark', language: 'en', duration: 2.3 },
  { id: '09_programmer_bits', page: 'programmer', theme: 'dark', language: 'en', duration: 2.5 },
  { id: '10_date_difference', page: 'date', theme: 'dark', language: 'en', duration: 2.6 },
  { id: '11_date_shift', page: 'date', theme: 'dark', language: 'en', duration: 2.6 },
  { id: '12_currency', page: 'currency', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '13_volume', page: 'volume', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '14_length', page: 'length', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '15_weight', page: 'weight', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '16_temperature', page: 'temperature', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '17_energy', page: 'energy', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '18_area', page: 'area', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '19_speed', page: 'speed', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '20_time', page: 'time', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '21_power', page: 'power', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '22_data', page: 'data', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '23_pressure', page: 'pressure', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '24_angle', page: 'angle', theme: 'dark', language: 'en', duration: 2.0 },
  { id: '25_theme_gallery', page: 'settings', theme: 'dark', language: 'en', duration: 2.8 },
  { id: '26_theme_terminal', page: 'standard', theme: 'terminal', language: 'en', duration: 2.2 },
  { id: '27_theme_unicorn', page: 'standard', theme: 'unicorn', language: 'en', duration: 2.2 },
  { id: '28_theme_south_africa', page: 'standard', theme: 'south-africa', language: 'en', duration: 2.2 },
  { id: '29_language_gallery', page: 'settings', theme: 'dark', language: 'en', duration: 2.8 },
  { id: '30_language_german', page: 'standard', theme: 'dark', language: 'de', duration: 2.2 },
  { id: '31_language_japanese', page: 'standard', theme: 'dark', language: 'ja', duration: 2.2 },
  { id: '32_language_arabic', page: 'standard', theme: 'dark', language: 'ar', duration: 2.2 }
];
const SCENE_IDS = SCENES.map((scene) => scene.id);

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
    outputDir: OUTPUT_DIR,
    baseUrl: '',
    scenes: [...SCENE_IDS],
    help: false
  };

  for (const arg of argv) {
    if (INTERNAL_ELECTRON_FLAGS.has(arg)) {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg.startsWith('--output-dir=')) {
      const rawOutputDir = arg.slice('--output-dir='.length).trim();
      options.outputDir = rawOutputDir ? path.resolve(rawOutputDir) : OUTPUT_DIR;
      continue;
    }

    if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length).trim();
      continue;
    }

    if (arg.startsWith('--scenes=')) {
      options.scenes = parseCsvArgument(arg.slice('--scenes='.length), SCENE_IDS, SCENE_IDS);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log('Create a Steam-ready trailer for Roselt Calculator.');
  console.log('');
  console.log('Usage: npm run create:steam:trailer -- [options]');
  console.log('');
  console.log('Options:');
  console.log(`  --output-dir=${OUTPUT_DIR}  Override the output directory.`);
  console.log(`  --scenes=${SCENE_IDS.join(',')}  Limit the rendered scenes.`);
  console.log('  --help, -h                 Show this help.');
}

function resolveScenes(options) {
  return SCENES.filter((scene) => options.scenes.includes(scene.id));
}

function isElectronMainProcess() {
  return Boolean(process.versions?.electron) && process.type !== 'renderer';
}

function ensureElectronInstalled() {
  if (!fs.existsSync(ELECTRON_BIN)) {
    throw new Error(`Electron binary not found at ${ELECTRON_BIN}. Run npm install first.`);
  }
}

async function ensureFfmpegInstalled() {
  await runCommand('ffmpeg', ['-version'], { cwd: ROOT, stdio: 'ignore' });
}

async function ensureCleanOutput(outputDir) {
  await fsp.rm(outputDir, { recursive: true, force: true });
  await fsp.mkdir(path.join(outputDir, 'stills'), { recursive: true });
  await fsp.mkdir(path.join(outputDir, 'clips'), { recursive: true });
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
    throw new Error('Unable to determine the temporary trailer server address.');
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

function getLaunchEnv(extraEnv = {}) {
  const env = {
    ...process.env,
    ...extraEnv
  };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function buildHelperSource() {
  return `
if (!globalThis.__trailerHelpers) {
  globalThis.__trailerHelpers = (() => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let moduleCache = null;

    async function getModules() {
      if (moduleCache) {
        return moduleCache;
      }

      const [
        stateModule,
        logicModule,
        configModule,
        viewModule
      ] = await Promise.all([
        import('./scripts/state.js'),
        import('./scripts/logic.js'),
        import('./scripts/config.js'),
        import('./scripts/Views/MainPage.js')
      ]);

      moduleCache = {
        stateModule,
        logicModule,
        configModule,
        viewModule
      };
      return moduleCache;
    }

    function openSettingsExpanders() {
      document.querySelectorAll('.settings-expander').forEach((element) => {
        if (element instanceof HTMLDetailsElement) {
          element.open = true;
        }
      });
    }

    function setConverterScene(state, logicModule, configModule, mode, fromValue, fromIndex = 0, toIndex = 1) {
      const category = configModule.CONVERTER_MODE_TO_CATEGORY[mode];
      state.converter.category = category;
      logicModule.resetConverterUnits();
      const units = logicModule.getUnitsForCategory(category);
      const resolvedFromIndex = Math.min(Math.max(fromIndex, 0), Math.max(0, units.length - 1));
      const resolvedToIndex = Math.min(Math.max(toIndex, 0), Math.max(0, units.length - 1));
      state.converter.fromUnit = units[resolvedFromIndex]?.name ?? units[0]?.name ?? '';
      state.converter.toUnit = units[resolvedToIndex]?.name ?? units[Math.min(1, units.length - 1)]?.name ?? state.converter.fromUnit;
      state.converter.fromValue = String(fromValue);
      state.converter.lastEdited = 'from';
      logicModule.syncConverterValues('from');
    }

    async function prepareScene(sceneId) {
      const {
        stateModule,
        logicModule,
        configModule,
        viewModule
      } = await getModules();
      const {
        state,
        createStandardState,
        createScientificState,
        createProgrammerState
      } = stateModule;
      const {
        handleAction,
        computeDateResults,
        setGraphExpression,
        commitGraphExpression,
        updateGraph,
        openGraphExpressionAnalysis
      } = logicModule;
      const { render } = viewModule;

      state.navOpen = false;
      state.historyOpen = false;
      state.historyTab = 'history';
      state.settings.openMenu = null;

      switch (sceneId) {
        case '01_standard_entry':
          state.standard = createStandardState();
          handleAction('digit', '1');
          handleAction('digit', '2');
          handleAction('digit', '5');
          handleAction('operator', '*');
          handleAction('digit', '1');
          handleAction('digit', '6');
          break;
        case '02_standard_result':
        case '26_theme_terminal':
        case '27_theme_unicorn':
        case '28_theme_south_africa':
        case '30_language_german':
        case '31_language_japanese':
        case '32_language_arabic':
          state.standard = createStandardState();
          handleAction('digit', '1');
          handleAction('digit', '2');
          handleAction('digit', '5');
          handleAction('operator', '*');
          handleAction('digit', '1');
          handleAction('digit', '6');
          handleAction('equals');
          break;
        case '03_scientific_trig':
          state.scientific = createScientificState();
          handleAction('digit', '4');
          handleAction('digit', '5');
          state.scientific.openMenu = 'trig';
          break;
        case '04_scientific_factorial':
          state.scientific = createScientificState();
          handleAction('digit', '5');
          handleAction('scientific-unary', 'factorial');
          break;
        case '05_graphing_plot':
          setGraphExpression(0, 'x^2-4');
          commitGraphExpression(0);
          break;
        case '06_graphing_analysis':
          setGraphExpression(0, 'x^2-4');
          commitGraphExpression(0);
          openGraphExpressionAnalysis(0);
          break;
        case '07_programmer_decimal':
          state.programmer = createProgrammerState();
          handleAction('digit', '2');
          handleAction('digit', '5');
          handleAction('digit', '5');
          break;
        case '08_programmer_hex':
          state.programmer = createProgrammerState();
          handleAction('digit', '2');
          handleAction('digit', '5');
          handleAction('digit', '5');
          handleAction('set-base', 'HEX');
          break;
        case '09_programmer_bits':
          state.programmer = createProgrammerState();
          handleAction('digit', '2');
          handleAction('digit', '5');
          handleAction('digit', '5');
          handleAction('set-base', 'HEX');
          handleAction('set-programmer-view', 'bitflip');
          break;
        case '10_date_difference':
          state.date.mode = 'difference';
          state.date.from = '2024-01-01';
          state.date.to = '2025-05-15';
          computeDateResults();
          break;
        case '11_date_shift':
          state.date.mode = 'shift';
          state.date.baseDate = '2026-05-15';
          state.date.operation = 'add';
          state.date.years = 0;
          state.date.months = 6;
          state.date.days = 18;
          computeDateResults();
          break;
        case '12_currency':
          setConverterScene(state, logicModule, configModule, 'currency', '250', 0, 1);
          break;
        case '13_volume':
          setConverterScene(state, logicModule, configModule, 'volume', '3.5', 5, 9);
          break;
        case '14_length':
          setConverterScene(state, logicModule, configModule, 'length', '120', 6, 10);
          break;
        case '15_weight':
          setConverterScene(state, logicModule, configModule, 'weight', '75', 9, 14);
          break;
        case '16_temperature':
          setConverterScene(state, logicModule, configModule, 'temperature', '23', 0, 1);
          break;
        case '17_energy':
          setConverterScene(state, logicModule, configModule, 'energy', '512', 3, 8);
          break;
        case '18_area':
          setConverterScene(state, logicModule, configModule, 'area', '1500', 5, 10);
          break;
        case '19_speed':
          setConverterScene(state, logicModule, configModule, 'speed', '88', 3, 9);
          break;
        case '20_time':
          setConverterScene(state, logicModule, configModule, 'time', '48', 5, 7);
          break;
        case '21_power':
          setConverterScene(state, logicModule, configModule, 'power', '750', 1, 4);
          break;
        case '22_data':
          setConverterScene(state, logicModule, configModule, 'data', '2048', 4, 7);
          break;
        case '23_pressure':
          setConverterScene(state, logicModule, configModule, 'pressure', '101.3', 0, 1);
          break;
        case '24_angle':
          setConverterScene(state, logicModule, configModule, 'angle', '180', 0, 3);
          break;
        case '25_theme_gallery':
          state.settings.openMenu = 'theme';
          break;
        case '29_language_gallery':
          state.settings.openMenu = 'language';
          break;
        default:
          break;
      }

      render();

      if (sceneId === '05_graphing_plot' || sceneId === '06_graphing_analysis') {
        updateGraph();
      }

      if (sceneId === '25_theme_gallery' || sceneId === '29_language_gallery') {
        openSettingsExpanders();
        await wait(80);
        if (sceneId === '29_language_gallery') {
          const scroller = document.querySelector('.settings-select-menu-options');
          if (scroller instanceof HTMLElement) {
            scroller.scrollTop = Math.max(0, Math.round(scroller.scrollHeight * 0.28));
          }
        }
      }

      await wait(sceneId.startsWith('05_') || sceneId.startsWith('06_') ? 500 : 220);
    }

    return {
      prepareScene
    };
  })();
}
`;
}

async function captureScene(BrowserWindow, options, scene) {
  const targetPath = path.join(options.outputDir, 'stills', `${scene.id}.png`);
  const url = `${options.baseUrl}/${APP_ENTRY}?page=${encodeURIComponent(scene.page)}&theme=${encodeURIComponent(scene.theme)}&language=${encodeURIComponent(scene.language)}`;
  console.log(`[capture] ${scene.id}: loading ${url}`);
  const win = new BrowserWindow({
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    useContentSize: true,
    show: true,
    paintWhenInitiallyHidden: true,
    backgroundColor: '#1f2025',
    webPreferences: {
      contextIsolation: false,
      sandbox: false
    }
  });
  const debuggerSession = win.webContents.debugger;

  try {
    await win.loadURL(url);
    console.log(`[capture] ${scene.id}: loaded`);
    await win.webContents.executeJavaScript(`${buildHelperSource()}\nvoid 0;`);
    console.log(`[capture] ${scene.id}: helper ready`);
    await win.webContents.executeJavaScript(`globalThis.__trailerHelpers.prepareScene(${JSON.stringify(scene.id)}).then(() => undefined)`);
    console.log(`[capture] ${scene.id}: scene prepared`);
    debuggerSession.attach('1.3');
    await debuggerSession.sendCommand('Page.enable');
    await debuggerSession.sendCommand('Emulation.setDeviceMetricsOverride', {
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: VIDEO_WIDTH,
      screenHeight: VIDEO_HEIGHT
    });
    const { data } = await debuggerSession.sendCommand('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    await fsp.writeFile(targetPath, Buffer.from(data, 'base64'));
    console.log(`[capture] ${scene.id}: wrote ${path.relative(options.outputDir, targetPath).replaceAll(path.sep, '/')}`);
  } finally {
    if (debuggerSession.isAttached()) {
      debuggerSession.detach();
    }
    await win.close();
  }
}

async function runElectronCapture() {
  const { app, BrowserWindow } = require('electron');
  const options = parseArgs(process.argv.slice(2));
  const scenes = resolveScenes(options);
  if (!options.baseUrl) {
    throw new Error('Missing --base-url value for Electron capture.');
  }

  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  await app.whenReady();

  try {
    for (const scene of scenes) {
      await captureScene(BrowserWindow, options, scene);
    }
  } finally {
    app.quit();
  }
}

async function spawnElectronCapture(options) {
  await runCommand(
    ELECTRON_BIN,
    [
      __filename,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--output-dir=${options.outputDir}`,
      `--base-url=${options.baseUrl}`,
      `--scenes=${options.scenes.join(',')}`
    ],
    {
      cwd: ROOT,
      env: getLaunchEnv(),
      stdio: 'inherit'
    }
  );
}

function buildStillPath(outputDir, scene) {
  return path.join(outputDir, 'stills', `${scene.id}.png`);
}

function buildClipPath(outputDir, scene) {
  return path.join(outputDir, 'clips', `${scene.id}.mp4`);
}

async function renderSceneClip(outputDir, scene) {
  const stillPath = buildStillPath(outputDir, scene);
  const clipPath = buildClipPath(outputDir, scene);
  const fadeOutStart = Math.max(0, scene.duration - 0.28).toFixed(2);
  const filterChain = [
    `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:flags=lanczos`,
    'format=yuv420p',
    'fade=t=in:st=0:d=0.28',
    `fade=t=out:st=${fadeOutStart}:d=0.28`
  ].join(',');

  await runCommand(
    'ffmpeg',
    [
      '-y',
      '-loop', '1',
      '-framerate', String(VIDEO_FPS),
      '-t', String(scene.duration),
      '-i', stillPath,
      '-f', 'lavfi',
      '-t', String(scene.duration),
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-vf', filterChain,
      '-r', String(VIDEO_FPS),
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-profile:v', 'high',
      '-level', '4.2',
      '-pix_fmt', 'yuv420p',
      '-x264-params', 'nal-hrd=cbr:force-cfr=1',
      '-b:v', VIDEO_BITRATE,
      '-minrate', VIDEO_BITRATE,
      '-maxrate', VIDEO_MAXRATE,
      '-bufsize', VIDEO_BUFSIZE,
      '-g', String(VIDEO_FPS * 2),
      '-c:a', 'aac',
      '-b:a', AUDIO_BITRATE,
      '-ar', '48000',
      '-ac', '2',
      '-shortest',
      clipPath
    ],
    {
      cwd: ROOT,
      stdio: 'inherit'
    }
  );
}

function quoteConcatPath(filePath) {
  return `file '${filePath.replaceAll("'", "'\\''")}'`;
}

async function renderTrailer(outputDir, scenes) {
  for (const scene of scenes) {
    await renderSceneClip(outputDir, scene);
  }

  const concatManifestPath = path.join(outputDir, 'clips.txt');
  const concatManifest = `${scenes.map((scene) => quoteConcatPath(buildClipPath(outputDir, scene))).join('\n')}\n`;
  await fsp.writeFile(concatManifestPath, concatManifest, 'utf8');

  await runCommand(
    'ffmpeg',
    [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatManifestPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      path.join(outputDir, path.basename(FINAL_VIDEO_PATH))
    ],
    {
      cwd: ROOT,
      stdio: 'inherit'
    }
  );
}

async function writeManifest(outputDir, scenes) {
  const totalDurationSeconds = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const manifest = {
    createdAt: new Date().toISOString(),
    outputVideo: path.relative(outputDir, path.join(outputDir, path.basename(FINAL_VIDEO_PATH))).replaceAll(path.sep, '/'),
    resolution: `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`,
    fps: VIDEO_FPS,
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    targetVideoBitrate: VIDEO_BITRATE,
    durationSeconds: Number(totalDurationSeconds.toFixed(2)),
    scenes: scenes.map((scene) => ({
      ...scene,
      still: path.relative(outputDir, buildStillPath(outputDir, scene)).replaceAll(path.sep, '/'),
      clip: path.relative(outputDir, buildClipPath(outputDir, scene)).replaceAll(path.sep, '/')
    }))
  };

  await fsp.writeFile(path.join(outputDir, path.basename(MANIFEST_PATH)), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const scenes = resolveScenes(options);
  if (options.help) {
    printHelp();
    return;
  }

  ensureElectronInstalled();
  await ensureFfmpegInstalled();
  await ensureCleanOutput(options.outputDir);
  const { server, baseUrl } = await startStaticServer();
  options.baseUrl = baseUrl;

  try {
    await spawnElectronCapture(options);
    await renderTrailer(options.outputDir, scenes);
    await writeManifest(options.outputDir, scenes);
  } finally {
    await stopStaticServer(server);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

(async () => {
  try {
    if (isElectronMainProcess()) {
      await runElectronCapture();
      return;
    }

    await runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  }
})();
