const SERVICE_WORKER_URL = new URL('../service-worker.js', import.meta.url).href;

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

void registerServiceWorker();