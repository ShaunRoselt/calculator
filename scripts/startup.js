const SERVICE_WORKER_URL = new URL('../service-worker.js', import.meta.url).href;

import { STORAGE_KEYS } from './config.js';
import { initI18n } from './i18n.js';
import { syncSettingsFileBeforeLaunch } from './settingsFile.js';
import { prepareThemesForLaunch } from './themes.js';
import { getUrlPreferenceOverrides } from './urlParams.js';

async function registerServiceWorker() {
  const canRegisterServiceWorker = 'serviceWorker' in navigator
    && window.isSecureContext
    && window.location.protocol !== 'file:';

  if (!canRegisterServiceWorker) {
    return;
  }

  try {
    await navigator.serviceWorker.register(SERVICE_WORKER_URL, { updateViaCache: 'none' });
  } catch (error) {
    console.warn('Service worker registration failed.', error);
  }
}

function getSystemThemeId() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

const urlPreferenceOverrides = getUrlPreferenceOverrides();

if (!urlPreferenceOverrides.theme && !urlPreferenceOverrides.language && !urlPreferenceOverrides.readOnly) {
  await syncSettingsFileBeforeLaunch();
}

const themePreference = urlPreferenceOverrides.theme || localStorage.getItem(STORAGE_KEYS.theme) || 'system';
const languagePreference = urlPreferenceOverrides.language || localStorage.getItem(STORAGE_KEYS.language) || 'en';

await prepareThemesForLaunch(themePreference, getSystemThemeId());
await initI18n(languagePreference);
void registerServiceWorker();
await import('./app.js');
