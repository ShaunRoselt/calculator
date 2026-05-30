const path = require('node:path');
const fs = require('node:fs/promises');
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');

const SETTINGS_SAVE_DIRECTORY = 'Saves';
const SETTINGS_SAVE_FILENAME = 'Settings.json';
const SETTINGS_SAVE_SCHEMA_VERSION = 1;
const appIconPath = process.platform === 'win32'
  ? path.join(__dirname, '..', 'assets', 'icons', 'app-icon-dark.ico')
  : path.join(__dirname, '..', 'assets', 'icons', 'app-icon-4096.png');

const isFlatpak = Boolean(process.env.FLATPAK_ID);
const minimumWindowWidth = 320;
const minimumWindowHeight = 520;
let settingsSaveCache = null;
let settingsSaveWriteQueue = Promise.resolve();
let windowBoundsSaveTimer = null;
let isFlushingSettingsOnQuit = false;

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

function getSettingsSavePath() {
  return path.join(getAppInstallDirectory(), SETTINGS_SAVE_DIRECTORY, SETTINGS_SAVE_FILENAME);
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
    const rawContents = await fs.readFile(savePath, 'utf8');
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
  const mergedSettings = mergeSettings(settingsSaveCache, normalizedSettings);
  const payload = {
    schemaVersion: SETTINGS_SAVE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    settings: mergedSettings
  };

  try {
    await fs.mkdir(path.dirname(savePath), { recursive: true });
    await fs.writeFile(savePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    settingsSaveCache = mergedSettings;
    return createSettingsFileResponse({ saved: true, exists: true, settings: mergedSettings });
  } catch (error) {
    return createSettingsFileResponse({
      saved: false,
      exists: false,
      settings: normalizedSettings,
      error: getErrorMessage(error)
    });
  }
}

function queueSettingsSave(settings) {
  settingsSaveWriteQueue = settingsSaveWriteQueue
    .catch(() => undefined)
    .then(() => writeSettingsSaveFile(settings));
  return settingsSaveWriteQueue;
}

function getDefaultWindowBounds() {
  const width = isFlatpak ? 320 : 420;
  const height = isFlatpak ? 620 : 900;
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
      void queueSettingsSave({ windowBounds: window.getBounds() });
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
    autoHideMenuBar: true,
    backgroundColor: '#1f2025',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'app.html'), {
    query: { page: 'standard' },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const sendFullscreenState = () => {
    mainWindow.webContents.send('app:fullscreen-changed', mainWindow.isFullScreen());
  };

  mainWindow.on('enter-full-screen', sendFullscreenState);
  mainWindow.on('leave-full-screen', sendFullscreenState);
  mainWindow.on('resize', () => saveWindowBounds(mainWindow));
  mainWindow.on('move', () => saveWindowBounds(mainWindow));
  mainWindow.on('close', () => saveWindowBounds(mainWindow, { immediate: true }));
  mainWindow.webContents.once('did-finish-load', sendFullscreenState);
}

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

ipcMain.handle('settings-file:load', () => readSettingsSaveFile());

ipcMain.handle('settings-file:save', (_event, settings) => queueSettingsSave(settings));

ipcMain.handle('settings-file:get-path', () => createSettingsFileResponse());

ipcMain.handle('settings-file:flush', () => settingsSaveWriteQueue);

app.on('before-quit', (event) => {
  if (isFlushingSettingsOnQuit) {
    return;
  }

  event.preventDefault();
  isFlushingSettingsOnQuit = true;
  void settingsSaveWriteQueue.finally(() => {
    isFlushingSettingsOnQuit = false;
    app.quit();
  });
});

app.whenReady().then(async () => {
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
