const NERDAMER_CDN_URL = 'https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/all.min.js';
const NERDAMER_LOCAL_URL = new URL('../../node_modules/nerdamer/all.min.js', import.meta.url).href;
const SERVICE_WORKER_URL = new URL('../../service-worker.js', import.meta.url).href;

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

  try {
    await loadScript(NERDAMER_LOCAL_URL, 'Unable to load nerdamer from the local package.');
  } catch {
    await loadScript(NERDAMER_CDN_URL, 'Unable to load nerdamer from CDN.');
  }
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
void registerServiceWorker();
await import('./app.js');