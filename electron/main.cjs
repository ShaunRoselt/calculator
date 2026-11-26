const path = require('node:path');
const fs = require('node:fs/promises');
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');

const STEAM_APP_ID = 4597760;
const SETTINGS_SAVE_DIRECTORY = 'Saves';
const SETTINGS_SAVE_FILENAME = 'Settings.json';
const SETTINGS_SAVE_SCHEMA_VERSION = 1;
const appIconPath = process.platform === 'win32'
  ? path.join(__dirname, '..', 'assets', 'icons', 'app-icon-dark.ico')
  : path.join(__dirname, '..', 'assets', 'pwa', 'icon-192.png');

const isFlatpak = Boolean(process.env.FLATPAK_ID);
const minimumWindowWidth = 320;
const minimumWindowHeight = 520;
const windowDisplayScales = new WeakMap();
let settingsSaveCache = null;
let settingsFileQueue = Promise.resolve();
let windowBoundsSaveTimer = null;
let isFlushingSettingsOnQuit = false;
let steamUtils;

if (process.platform === 'linux') {
  app.setDesktopName('io.github.ShaunRoselt.Calculator.desktop');
}

app.setName('Roselt Calculator');

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function normalizePositiveInteger(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function normalizeInteger(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value)
    : null;
}

function normalizeWindowBounds(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const width = normalizePositiveInteger(value.width);
  const height = normalizePositiveInteger(value.height);
  if (width === null || height === null) {
    return null;
  }

  const bounds = {
    width: Math.max(minimumWindowWidth, width),
    height: Math.max(minimumWindowHeight, height)
  };
  const x = normalizeInteger(value.x);
  const y = normalizeInteger(value.y);

  if (x !== null) {
    bounds.x = x;
  }

  if (y !== null) {
    bounds.y = y;
  }

  return bounds;
}

function getAppInstallDirectory() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }

  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'));
  }

  return path.join(__dirname, '..');
}

function getLegacySettingsSavePath() {
  return path.join(getAppInstallDirectory(), SETTINGS_SAVE_DIRECTORY, SETTINGS_SAVE_FILENAME);
}

function getSettingsSavePath() {
  return process.env.PORTABLE_EXECUTABLE_DIR
    ? getLegacySettingsSavePath()
    : path.join(app.getPath('userData'), SETTINGS_SAVE_DIRECTORY, SETTINGS_SAVE_FILENAME);
}

function normalizeSettingsSave(value) {
  const rawSettings = isPlainObject(value?.settings) ? value.settings : value;
  if (!isPlainObject(rawSettings)) {
    return null;
  }

  const settings = {};
  if (typeof rawSettings.theme === 'string' && rawSettings.theme.trim()) {
    settings.theme = rawSettings.theme.trim();
  }

  if (typeof rawSettings.language === 'string' && rawSettings.language.trim()) {
    settings.language = rawSettings.language.trim();
  }

  if (typeof rawSettings.repeatEquals === 'boolean') {
    settings.repeatEquals = rawSettings.repeatEquals;
  }

  if (Number.isInteger(rawSettings.zoomPercent) && rawSettings.zoomPercent >= 50 && rawSettings.zoomPercent <= 200) {
    settings.zoomPercent = rawSettings.zoomPercent;
  }

  if (isPlainObject(rawSettings.shortcuts)) {
    settings.shortcuts = rawSettings.shortcuts;
  }

  const windowBounds = normalizeWindowBounds(rawSettings.windowBounds);
  if (windowBounds) {
    settings.windowBounds = windowBounds;
  }

  return Object.keys(settings).length > 0 ? settings : null;
}

function mergeSettings(existingSettings, nextSettings) {
  return {
    ...(isPlainObject(existingSettings) ? existingSettings : {}),
    ...(isPlainObject(nextSettings) ? nextSettings : {})
  };
}

function createSettingsFileResponse(extra = {}) {
  return {
    available: true,
    path: getSettingsSavePath(),
    directory: path.dirname(getSettingsSavePath()),
    filename: SETTINGS_SAVE_FILENAME,
    error: '',
    ...extra
  };
}

async function readSettingsSaveFile() {
  const savePath = getSettingsSavePath();

  try {
    const rawContents = await fs.readFile(savePath, 'utf8').catch((error) => {
      const legacyPath = getLegacySettingsSavePath();
      if (error.code === 'ENOENT' && legacyPath !== savePath) {
        return fs.readFile(legacyPath, 'utf8');
      }
      throw error;
    });
    const parsedContents = JSON.parse(rawContents);
    settingsSaveCache = normalizeSettingsSave(parsedContents);
    return createSettingsFileResponse({
      exists: true,
      settings: settingsSaveCache
    });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      settingsSaveCache = null;
      return createSettingsFileResponse({ exists: false, settings: null });
    }

    return createSettingsFileResponse({
      exists: false,
      settings: null,
      error: getErrorMessage(error)
    });
  }
}

async function writeSettingsSaveFile(settings) {
  const normalizedSettings = normalizeSettingsSave(settings);
  if (!normalizedSettings) {
    return createSettingsFileResponse({
      saved: false,
      error: 'No settings were provided.'
    });
  }

  const savePath = getSettingsSavePath();
  const tempPath = `${savePath}.${process.pid}.tmp`;
  const mergedSettings = mergeSettings(settingsSaveCache, normalizedSettings);
  const payload = {
    schemaVersion: SETTINGS_SAVE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    settings: mergedSettings
  };

  try {
    await fs.mkdir(path.dirname(savePath), { recursive: true });
    await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, savePath);
    settingsSaveCache = mergedSettings;
    return createSettingsFileResponse({ saved: true, exists: true, settings: mergedSettings });
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    return createSettingsFileResponse({
      saved: false,
      exists: false,
      settings: normalizedSettings,
      error: getErrorMessage(error)
    });
  }
}

function queueSettingsFileOperation(operation) {
  settingsFileQueue = settingsFileQueue
    .catch(() => undefined)
    .then(operation);
  return settingsFileQueue;
}

function getDefaultWindowBounds() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workArea;
  const width = Math.max(minimumWindowWidth, Math.min(screenWidth, isFlatpak ? 320 : 420));
  const height = Math.max(minimumWindowHeight, Math.min(screenHeight, isFlatpak ? 620 : 900));
  return centerWindowBounds({ width, height });
}

function centerWindowBounds({ width, height }) {
  const primaryWorkArea = screen.getPrimaryDisplay().workArea;
  return {
    width,
    height,
    x: primaryWorkArea.x + Math.max(0, Math.round((primaryWorkArea.width - width) / 2)),
    y: primaryWorkArea.y + Math.max(0, Math.round((primaryWorkArea.height - height) / 2))
  };
}

function clampWindowBounds(savedBounds) {
  const defaultBounds = getDefaultWindowBounds();
  const normalizedBounds = normalizeWindowBounds(savedBounds);
  if (!normalizedBounds) {
    return defaultBounds;
  }

  const nearestDisplay = typeof normalizedBounds.x === 'number' && typeof normalizedBounds.y === 'number'
    ? screen.getDisplayNearestPoint({ x: normalizedBounds.x, y: normalizedBounds.y })
    : screen.getPrimaryDisplay();
  const workArea = nearestDisplay.workArea;
  const width = Math.min(Math.max(normalizedBounds.width, minimumWindowWidth), workArea.width);
  const height = Math.min(Math.max(normalizedBounds.height, minimumWindowHeight), workArea.height);

  if (typeof normalizedBounds.x !== 'number' || typeof normalizedBounds.y !== 'number') {
    return centerWindowBounds({ width, height });
  }

  return {
    width,
    height,
    x: Math.min(Math.max(normalizedBounds.x, workArea.x), workArea.x + workArea.width - width),
    y: Math.min(Math.max(normalizedBounds.y, workArea.y), workArea.y + workArea.height - height)
  };
}

function getRestorableWindowBounds() {
  return clampWindowBounds(settingsSaveCache?.windowBounds);
}

function saveWindowBounds(window, { immediate = false } = {}) {
  if (!window || window.isDestroyed() || window.isFullScreen() || window.isMinimized()) {
    return;
  }

  if (windowBoundsSaveTimer) {
    clearTimeout(windowBoundsSaveTimer);
    windowBoundsSaveTimer = null;
  }

  const saveBounds = () => {
    if (!window.isDestroyed() && !window.isFullScreen() && !window.isMinimized()) {
      const windowBounds = window.getNormalBounds();
      const displayScale = windowDisplayScales.get(window) ?? 1;
      // Store unscaled sizes so changing monitors or display servers cannot compound scaling.
      windowBounds.width = Math.round(windowBounds.width * displayScale);
      windowBounds.height = Math.round(windowBounds.height * displayScale);
      void queueSettingsFileOperation(() => writeSettingsSaveFile({ windowBounds }));
    }
  };

  if (immediate) {
    saveBounds();
    return;
  }

  windowBoundsSaveTimer = setTimeout(saveBounds, 300);
  windowBoundsSaveTimer.unref?.();
}

function createMainWindow() {
  const { width, height, x, y } = getRestorableWindowBounds();

  const mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: minimumWindowWidth,
    minHeight: minimumWindowHeight,
    x,
    y,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1f2025',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Reveal the window only once the first paint is ready. This avoids the
  // white/blank flash that is especially noticeable under Wine/Proton and
  // makes the app feel like it opens instantly.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'app.html'), {
    query: { page: 'standard' },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).protocol === 'https:') {
      void shell.openExternal(url).catch((error) => console.warn('Unable to open external link.', error));
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  const sendFullscreenState = () => {
    mainWindow.webContents.send('app:fullscreen-changed', mainWindow.isFullScreen());
  };

  mainWindow.on('enter-full-screen', sendFullscreenState);
  mainWindow.on('leave-full-screen', sendFullscreenState);
  mainWindow.on('resize', () => saveWindowBounds(mainWindow));
  mainWindow.on('move', () => saveWindowBounds(mainWindow));
  mainWindow.on('close', () => {
    if (!isFlushingSettingsOnQuit) {
      saveWindowBounds(mainWindow, { immediate: true });
    }
  });
  mainWindow.webContents.once('did-finish-load', sendFullscreenState);
}

ipcMain.on('app:display-scale', (event, displayScale) => {
  if (event.senderFrame !== event.sender.mainFrame || !Number.isFinite(displayScale) || displayScale < 0.25 || displayScale > 1) {
    return;
  }

  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) {
    return;
  }

  const previousScale = windowDisplayScales.get(window) ?? 1;
  if (previousScale === displayScale) {
    return;
  }

  const bounds = window.getNormalBounds();
  const { workArea } = screen.getDisplayMatching(bounds);
  windowDisplayScales.set(window, displayScale);
  window.setMinimumSize(
    Math.min(Math.ceil(minimumWindowWidth / displayScale), workArea.width),
    Math.min(Math.ceil(minimumWindowHeight / displayScale), workArea.height)
  );
  if (!window.isMaximized() && !window.isFullScreen() && !window.isMinimized()) {
    window.setSize(
      Math.min(Math.round(bounds.width * previousScale / displayScale), workArea.width),
      Math.min(Math.round(bounds.height * previousScale / displayScale), workArea.height)
    );
  }
});

ipcMain.handle('app:show-gamepad-keyboard', async (event, mode, bounds) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!steamUtils || event.senderFrame !== event.sender.mainFrame || !window?.isFocused()
    || ![0, 1, 3].includes(mode) || !Array.isArray(bounds) || bounds.length !== 4
    || !bounds.every(Number.isFinite) || bounds[2] <= 0 || bounds[3] <= 0) {
    return false;
  }

  const zoom = event.sender.getZoomFactor();
  const { scaleFactor } = screen.getDisplayMatching(window.getBounds());
  const pixelBounds = bounds.map((value) => Math.round(value * zoom * scaleFactor));
  try {
    return await steamUtils.showFloatingGamepadTextInput(mode, ...pixelBounds);
  } catch (error) {
    console.warn('Unable to open the Steam keyboard.', error);
    return false;
  }
});

ipcMain.handle('app:get-fullscreen', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window?.isFullScreen() ?? false;
});

ipcMain.handle('app:set-fullscreen', (event, enabled) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    return false;
  }

  window.setFullScreen(Boolean(enabled));
  return window.isFullScreen();
});

ipcMain.handle('settings-file:load', () => queueSettingsFileOperation(readSettingsSaveFile));

ipcMain.handle('settings-file:save', (_event, settings) =>
  queueSettingsFileOperation(() => writeSettingsSaveFile(settings)));

ipcMain.handle('settings-file:get-path', () => createSettingsFileResponse());

ipcMain.handle('settings-file:flush', () => settingsFileQueue);

app.on('before-quit', (event) => {
  if (isFlushingSettingsOnQuit) {
    return;
  }

  event.preventDefault();
  isFlushingSettingsOnQuit = true;
  for (const window of BrowserWindow.getAllWindows()) {
    saveWindowBounds(window, { immediate: true });
  }
  // Keep the flag set: once we've committed to quitting, the next app.quit()
  // must pass straight through this handler. Resetting it here would make
  // app.quit() re-enter before-quit, re-prevent the quit, and spin forever
  // (100% CPU, window never closes).
  void settingsFileQueue.finally(() => {
    app.quit();
  });
});

app.whenReady().then(async () => {
  if ([process.env.SteamAppId, process.env.SteamGameId].includes(String(STEAM_APP_ID))) {
    try {
      steamUtils = require('@armaldio/steamworks.js').init(STEAM_APP_ID).utils;
    } catch (error) {
      console.warn('Unable to initialize Steamworks.', error);
    }
  }
  await readSettingsSaveFile();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
