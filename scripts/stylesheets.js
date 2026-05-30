const RESPONSIVE_STYLESHEET_ID = 'responsive-stylesheet';

const STYLE_PATHS = {
  main: 'styles/Views/MainPage.css',
  calculator: 'styles/Views/Calculator.css',
  scientificAngles: 'styles/Views/CalculatorScientificAngleButtons.css',
  programmerDisplay: 'styles/Views/CalculatorProgrammerDisplayPanel.css',
  programmerBits: 'styles/Views/CalculatorProgrammerBitFlipPanel.css',
  history: 'styles/Views/HistoryList.css',
  memory: 'styles/Views/Memory.css',
  date: 'styles/Views/DateCalculator.css',
  unitConverter: 'styles/Views/UnitConverter.css',
  graphing: 'styles/Views/GraphingCalculator/GraphingCalculator.css',
  settings: 'styles/Views/Settings.css'
};

const MODE_STYLE_KEYS = {
  standard: ['calculator', 'history', 'memory'],
  scientific: ['calculator', 'scientificAngles', 'history', 'memory'],
  programmer: ['calculator', 'programmerDisplay', 'programmerBits', 'history', 'memory'],
  date: ['date', 'history'],
  graphing: ['date', 'settings', 'graphing'],
  settings: ['date', 'settings'],
  currency: ['unitConverter', 'history'],
  volume: ['unitConverter', 'history'],
  length: ['unitConverter', 'history'],
  weight: ['unitConverter', 'history'],
  temperature: ['unitConverter', 'history'],
  energy: ['unitConverter', 'history'],
  area: ['unitConverter', 'history'],
  speed: ['unitConverter', 'history'],
  time: ['unitConverter', 'history'],
  power: ['unitConverter', 'history'],
  data: ['unitConverter', 'history'],
  pressure: ['unitConverter', 'history'],
  angle: ['unitConverter', 'history']
};

const loadedStyleKeys = new Set();
const loadingStylePromises = new Map();

function getStylesheetAnchor() {
  return document.getElementById(RESPONSIVE_STYLESHEET_ID) ?? null;
}

function appendStylesheet(key) {
  const href = STYLE_PATHS[key];
  if (!href) {
    return Promise.resolve();
  }

  const existingLink = document.querySelector(`link[data-lazy-style="${key}"], link[href="${href}"]`);
  if (existingLink instanceof HTMLLinkElement) {
    existingLink.dataset.lazyStyle = key;
    loadedStyleKeys.add(key);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.lazyStyle = key;
    link.onload = () => {
      loadedStyleKeys.add(key);
      resolve();
    };
    link.onerror = () => reject(new Error(`Unable to load stylesheet ${href}`));

    const anchor = getStylesheetAnchor();
    if (anchor?.parentNode) {
      anchor.parentNode.insertBefore(link, anchor);
    } else {
      document.head.append(link);
    }
  });
}

export function ensureStylesheets(keys) {
  const uniqueKeys = [...new Set(['main', ...keys])];
  return Promise.all(uniqueKeys.map((key) => {
    if (loadedStyleKeys.has(key)) {
      return Promise.resolve();
    }

    if (!loadingStylePromises.has(key)) {
      loadingStylePromises.set(key, appendStylesheet(key).catch((error) => {
        loadingStylePromises.delete(key);
        throw error;
      }));
    }

    return loadingStylePromises.get(key);
  }));
}

export function ensureModeStyles(mode) {
  return ensureStylesheets(MODE_STYLE_KEYS[mode] ?? MODE_STYLE_KEYS.standard);
}
