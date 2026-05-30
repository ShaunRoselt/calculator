const NERDAMER_LOCAL_URL = new URL('../assets/vendor/nerdamer/all.min.js', import.meta.url).href;

let nerdamerLoadPromise = null;

function loadScript(sourceUrl, errorMessage) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = sourceUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(errorMessage));
    document.head.append(script);
  });
}

export async function ensureNerdamerLoaded() {
  if (globalThis.nerdamer) {
    return globalThis.nerdamer;
  }

  if (!nerdamerLoadPromise) {
    nerdamerLoadPromise = loadScript(NERDAMER_LOCAL_URL, 'Unable to load nerdamer from the local package.')
      .then(() => globalThis.nerdamer ?? null)
      .catch((error) => {
        nerdamerLoadPromise = null;
        throw error;
      });
  }

  return nerdamerLoadPromise;
}
