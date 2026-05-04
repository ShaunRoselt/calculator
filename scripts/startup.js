const NERDAMER_LOCAL_URL = new URL('../assets/vendor/nerdamer/all.min.js', import.meta.url).href;
const SERVICE_WORKER_URL = new URL('../service-worker.js', import.meta.url).href;
const LANGUAGE_STORAGE_KEY = 'calculator-language';

import { initI18n } from './i18n.js';
import { initThemes } from './themes.js';
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

await loadNerdamer();
await initThemes();
await initI18n(getUrlPreferenceOverrides().language || localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en');
void registerServiceWorker();
await import('./app.js');