const scope = new URL(self.registration.scope);
const cachePrefix = `roselt-shell:${scope.href}:`;
const cacheName = `${cachePrefix}2`;
const appUrl = new URL('app.html', scope).href;
const shellAssets = [
  'app.html',
  'manifest.json',
  'scripts/startup.js',
  'scripts/app.js',
  'scripts/config.js',
  'scripts/currencyData.js',
  'scripts/currencyLocale.js',
  'scripts/dom.js',
  'scripts/graphAnalysisCas.js',
  'scripts/i18n.js',
  'scripts/logic.js',
  'scripts/nerdamer.js',
  'scripts/settingsFile.js',
  'scripts/state.js',
  'scripts/stylesheets.js',
  'scripts/themes.js',
  'scripts/tooltip.js',
  'scripts/urlParams.js',
  'scripts/utils.js',
  'scripts/vendor/localeCurrency.js',
  'scripts/Views/Calculator.js',
  'scripts/Views/CalculatorProgrammerBitFlipPanel.js',
  'scripts/Views/CalculatorProgrammerDisplayPanel.js',
  'scripts/Views/CalculatorScientificAngleButtons.js',
  'scripts/Views/DateCalculator.js',
  'scripts/Views/GraphingCalculator/GraphingCalculator.js',
  'scripts/Views/HistoryList.js',
  'scripts/Views/MainPage.js',
  'scripts/Views/Memory.js',
  'scripts/Views/Settings.js',
  'scripts/Views/UnitConverter.js',
  'scripts/Views/ViewIcons.js',
  'styles/theme.css',
  'styles/responsive.css',
  'styles/Views/Calculator.css',
  'styles/Views/CalculatorProgrammerBitFlipPanel.css',
  'styles/Views/CalculatorProgrammerDisplayPanel.css',
  'styles/Views/CalculatorScientificAngleButtons.css',
  'styles/Views/DateCalculator.css',
  'styles/Views/GraphingCalculator/GraphingCalculator.css',
  'styles/Views/HistoryList.css',
  'styles/Views/MainPage.css',
  'styles/Views/Memory.css',
  'styles/Views/Settings.css',
  'styles/Views/UnitConverter.css',
  'assets/fonts/Selawik/selawk.woff2',
  'assets/fonts/Selawik/selawkb.woff2',
  'assets/fonts/Selawik/selawksb.woff2',
  'assets/i18n/en.json',
  'assets/logos/dark.svg',
  'assets/logos/light.svg',
  'assets/pwa/icon-192.png',
  'assets/pwa/icon-512.png',
  'assets/themes/css/dark.css',
  'assets/themes/css/light.css',
  'assets/themes/data/index.json',
  'assets/vendor/nerdamer/bundle.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(shellAssets.map((asset) => new Request(new URL(asset, scope), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter((name) => name.startsWith(cachePrefix) && name !== cacheName);
    await Promise.all(oldCaches.map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) {
    return;
  }

  const path = url.pathname.slice(scope.pathname.length);
  const isAllowedAsset = path === 'manifest.json' || /^(assets|scripts|styles)\//.test(path);
  if (path !== 'app.html' && !isAllowedAsset) {
    return;
  }

  // All calculator modes use the same document and read the query from the address bar.
  const key = path === 'app.html' ? appUrl : request;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(request);
      if (response.ok && !response.redirected) {
        await cache.put(key, response.clone()).catch(() => undefined);
      }
      return response;
    } catch (error) {
      const cached = await cache.match(key);
      if (cached) return cached;
      throw error;
    }
  })());
});
