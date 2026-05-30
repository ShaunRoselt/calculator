import { STORAGE_KEYS } from './config.js';

function getSettingsFileBridge() {
  return typeof window.settingsFile === 'object' && window.settingsFile !== null
    ? window.settingsFile
    : null;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function normalizePreference(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getLocalSettings() {
  const settings = {
    theme: normalizePreference(localStorage.getItem(STORAGE_KEYS.theme)) || 'system',
    language: normalizePreference(localStorage.getItem(STORAGE_KEYS.language)) || 'en'
  };

  try {
    const repeatEquals = JSON.parse(localStorage.getItem(STORAGE_KEYS.repeatEquals) || 'true');
    if (typeof repeatEquals === 'boolean') {
      settings.repeatEquals = repeatEquals;
    }
  } catch {
    settings.repeatEquals = true;
  }

  try {
    const shortcuts = JSON.parse(localStorage.getItem(STORAGE_KEYS.shortcuts) || 'null');
    if (isPlainObject(shortcuts)) {
      settings.shortcuts = shortcuts;
    }
  } catch {
    // ignore broken shortcut settings
  }

  return settings;
}

function hasSettings(settings) {
  return Boolean(
    normalizePreference(settings?.theme)
    || normalizePreference(settings?.language)
    || typeof settings?.repeatEquals === 'boolean'
    || isPlainObject(settings?.shortcuts)
    || isPlainObject(settings?.windowBounds)
  );
}

function mergeSettings(localSettings, fileSettings) {
  return {
    ...(isPlainObject(localSettings) ? localSettings : {}),
    ...(isPlainObject(fileSettings) ? fileSettings : {})
  };
}

export function pickPersistableAppSettings(settings) {
  const persistable = {};

  const theme = normalizePreference(settings?.theme);
  if (theme) {
    persistable.theme = theme;
  }

  const language = normalizePreference(settings?.language);
  if (language) {
    persistable.language = language;
  }

  if (typeof settings?.repeatEquals === 'boolean') {
    persistable.repeatEquals = settings.repeatEquals;
  }

  if (isPlainObject(settings?.shortcuts)) {
    persistable.shortcuts = settings.shortcuts;
  }

  if (isPlainObject(settings?.windowBounds)) {
    persistable.windowBounds = settings.windowBounds;
  }

  return persistable;
}

function writeSettingsToLocalStorage(settings) {
  const theme = normalizePreference(settings?.theme);
  const language = normalizePreference(settings?.language);

  if (theme) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }

  if (language) {
    localStorage.setItem(STORAGE_KEYS.language, language);
  }

  if (typeof settings?.repeatEquals === 'boolean') {
    localStorage.setItem(STORAGE_KEYS.repeatEquals, JSON.stringify(settings.repeatEquals));
  }

  if (isPlainObject(settings?.shortcuts)) {
    localStorage.setItem(STORAGE_KEYS.shortcuts, JSON.stringify(settings.shortcuts));
  }
}

async function saveSettingsToFile(settings) {
  const persistableSettings = pickPersistableAppSettings(settings);
  const bridge = getSettingsFileBridge();
  if (!bridge || typeof bridge.save !== 'function' || !hasSettings(persistableSettings)) {
    return { available: false, saved: false };
  }

  try {
    return await bridge.save(persistableSettings);
  } catch (error) {
    console.warn('Unable to save settings file.', error);
    return { available: false, saved: false };
  }
}

export async function syncSettingsFileBeforeLaunch() {
  const bridge = getSettingsFileBridge();
  if (!bridge || typeof bridge.load !== 'function') {
    return { available: false, source: 'local' };
  }

  try {
    const fileResult = await bridge.load();
    const fileSettings = fileResult?.settings ?? null;
    const localSettings = getLocalSettings();
    const mergedSettings = mergeSettings(localSettings, fileSettings);

    if (hasSettings(mergedSettings)) {
      writeSettingsToLocalStorage(mergedSettings);
      await saveSettingsToFile(mergedSettings);
      return {
        ...fileResult,
        settings: mergedSettings,
        source: hasSettings(fileSettings) ? 'merged' : 'local'
      };
    }

    return { ...fileResult, source: 'none' };
  } catch (error) {
    console.warn('Unable to load settings file.', error);
    return { available: false, source: 'local' };
  }
}

let settingsFileSaveQueue = Promise.resolve();

export function flushSettingsFile() {
  const bridge = getSettingsFileBridge();
  const rendererFlush = settingsFileSaveQueue.catch(() => undefined);
  const mainFlush = bridge && typeof bridge.flush === 'function'
    ? bridge.flush().catch(() => undefined)
    : Promise.resolve();

  return Promise.all([rendererFlush, mainFlush]).then(() => undefined);
}

export function persistSettingsFile(settings) {
  const persistableSettings = pickPersistableAppSettings(settings);
  if (!hasSettings(persistableSettings)) {
    return;
  }

  writeSettingsToLocalStorage(persistableSettings);
  settingsFileSaveQueue = settingsFileSaveQueue
    .catch(() => undefined)
    .then(() => saveSettingsToFile(persistableSettings));
}
