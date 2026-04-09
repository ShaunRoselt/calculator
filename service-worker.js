const STATIC_CACHE = 'calculator-static-v2';
const RUNTIME_CACHE = 'calculator-runtime-v2';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './web/styles/theme.css',
  './web/styles/responsive.css',
  './web/styles/Views/MainPage.css',
  './web/styles/Views/Calculator.css',
  './web/styles/Views/CalculatorScientificAngleButtons.css',
  './web/styles/Views/CalculatorProgrammerDisplayPanel.css',
  './web/styles/Views/CalculatorProgrammerBitFlipPanel.css',
  './web/styles/Views/HistoryList.css',
  './web/styles/Views/Memory.css',
  './web/styles/Views/DateCalculator.css',
  './web/styles/Views/UnitConverter.css',
  './web/styles/Views/GraphingCalculator/GraphingCalculator.css',
  './web/styles/Views/Settings.css',
  './web/scripts/bootstrap.js',
  './web/scripts/app.js',
  './web/scripts/config.js',
  './web/scripts/state.js',
  './web/scripts/logic.js',
  './web/scripts/utils.js',
  './web/scripts/dom.js',
  './web/scripts/graphAnalysisCas.js',
  './web/scripts/tooltip.js',
  './web/scripts/Views/MainPage.js',
  './web/scripts/Views/Calculator.js',
  './web/scripts/Views/CalculatorScientificAngleButtons.js',
  './web/scripts/Views/CalculatorProgrammerDisplayPanel.js',
  './web/scripts/Views/CalculatorProgrammerBitFlipPanel.js',
  './web/scripts/Views/HistoryList.js',
  './web/scripts/Views/Memory.js',
  './web/scripts/Views/DateCalculator.js',
  './web/scripts/Views/UnitConverter.js',
  './web/scripts/Views/Settings.js',
  './web/scripts/Views/ViewIcons.js',
  './web/scripts/Views/GraphingCalculator/GraphingCalculator.js',
  './web/assets/pwa/icon-192.png',
  './web/assets/pwa/icon-512.png',
  './src/Calculator/Assets/CalculatorAppList.targetsize-32_altform-unplated.png',
  './src/Calculator/Assets/CalculatorAppList.targetsize-32_altform-lightunplated.png',
  './node_modules/nerdamer/all.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => ![STATIC_CACHE, RUNTIME_CACHE].includes(cacheName))
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  event.respondWith(handleAssetRequest(request));
});

async function handleNavigationRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      cache.put('./index.html', response.clone());
    }
    return response;
  } catch {
    return getCachedIndexResponse();
  }
}

async function handleAssetRequest(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) {
    return cached;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}

async function getCachedIndexResponse() {
  return caches.match('./index.html', { ignoreSearch: true })
    || caches.match('./', { ignoreSearch: true });
}