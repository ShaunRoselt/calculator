const NERDAMER_LOCAL_URL = new URL('../assets/vendor/nerdamer/all.min.js', import.meta.url).href;
const SERVICE_WORKER_URL = new URL('../service-worker.js', import.meta.url).href;

import { STORAGE_KEYS } from './config.js';
import { initI18n } from './i18n.js';
import { prepareThemesForLaunch } from './themes.js';
import { getUrlPreferenceOverrides } from './urlParams.js';

async function loadScript(sourceUrl, errorMessage) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = sourceUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(errorMessage));
    document.head.append(script);
  });
}

async function loadNerdamer() {
  if (globalThis.nerdamer) {
    return;
  }

  await loadScript(NERDAMER_LOCAL_URL, 'Unable to load nerdamer from the local package.');
}

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
const themePreference = urlPreferenceOverrides.theme || localStorage.getItem(STORAGE_KEYS.theme) || 'system';
const languagePreference = urlPreferenceOverrides.language || localStorage.getItem(STORAGE_KEYS.language) || 'en';

await loadNerdamer();
await prepareThemesForLaunch(themePreference, getSystemThemeId());
await initI18n(languagePreference);
void registerServiceWorker();
await import('./app.js');