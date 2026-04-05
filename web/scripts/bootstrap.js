const NERDAMER_CDN_URL = 'https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/all.min.js';

async function loadNerdamer() {
  if (globalThis.nerdamer) {
    return;
  }

  if (globalThis.process?.versions?.electron) {
    return;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = NERDAMER_CDN_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load nerdamer from CDN.'));
    document.head.append(script);
  });
}

await loadNerdamer();
await import('./app.js');