import { CONVERTER_MODE_TO_CATEGORY, DEFAULT_CURRENCY_RATES, MOCK_CURRENCY_NOTE, MOCK_CURRENCY_UPDATED_AT, STORAGE_KEYS } from './config.js';
import { toDateInputValue } from './utils.js';

const CALCULATOR_COLLECTION_MODES = ['standard', 'scientific', 'programmer', 'date', ...Object.keys(CONVERTER_MODE_TO_CATEGORY)];

function createEmptyCollections() {
  return CALCULATOR_COLLECTION_MODES.reduce((collections, mode) => {
    collections[mode] = {
      history: [],
      memory: []
    };
    return collections;
  }, {});
}

function normalizeHistoryEntries(value) {
  return Array.isArray(value) ? value.slice(0, 60) : [];
}

function normalizeMemoryEntries(value) {
  return Array.isArray(value) ? value.slice(0, 20) : [];
}

function normalizeCollectionsByMode(value, collectionName) {
  const collections = createEmptyCollections();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return collections;
  }

  for (const mode of CALCULATOR_COLLECTION_MODES) {
    const collection = value[mode];
    if (!collection || typeof collection !== 'object' || Array.isArray(collection)) {
      continue;
    }

    collections[mode][collectionName] = collectionName === 'history'
      ? normalizeHistoryEntries(collection.history)
      : normalizeMemoryEntries(collection.memory);
  }

  return collections;
}

function serializeCollections(collectionName) {
  return CALCULATOR_COLLECTION_MODES.reduce((collections, mode) => {
    collections[mode] = collectionName === 'history'
      ? { history: normalizeHistoryEntries(state.collections[mode]?.history) }
      : { memory: normalizeMemoryEntries(state.collections[mode]?.memory) };
    return collections;
  }, {});
}

function migrateLegacyHistory(value) {
  const collections = createEmptyCollections();
  if (!Array.isArray(value)) {
    return collections;
  }

  for (const entry of value) {
    const mode = CALCULATOR_COLLECTION_MODES.includes(entry?.mode) ? entry.mode : 'standard';
    collections[mode].history.push(entry);
  }

  for (const mode of CALCULATOR_COLLECTION_MODES) {
    collections[mode].history = collections[mode].history.slice(0, 60);
  }

  return collections;
}

function migrateLegacyMemory(value) {
  const collections = createEmptyCollections();
  if (Array.isArray(value)) {
    collections.standard.memory = normalizeMemoryEntries(value);
  }
  return collections;
}

function createDefaultGraphViewport() {
  return {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10
  };
}

const GRAPH_EXPRESSION_COLORS = ['#107c10', '#0063b1', '#e81123', '#8a8886'];

function createGraphingExpression(index = 0) {
  return {
    color: GRAPH_EXPRESSION_COLORS[index % GRAPH_EXPRESSION_COLORS.length],
    value: '',
    plottedValue: '',
    error: false,
    visible: true,
    lineStyle: 'solid'
  };
}

function createGraphingExpressions() {
  return [createGraphingExpression()];
}

function createGraphingState() {
  return {
    expressions: createGraphingExpressions(),
    activeExpressionIndex: 0,
    analysisExpressionIndex: null,
    analysisData: null,
    openMenu: null,
    settingsOpen: false,
    trigShifted: false,
    trigHyperbolic: false,
    stylePanelExpressionIndex: null,
    angle: 'RAD',
    lineThickness: 2,
    theme: 'light',
    isManualAdjustment: false,
    tracingEnabled: false,
    mobileView: 'graph',
    viewport: createDefaultGraphViewport(),
    status: 'Enter an expression'
  };
}

function createInitialState() {
  const todayString = toDateInputValue(new Date());
  return {
    mode: 'standard',
    lastNonSettingsMode: 'standard',
    navOpen: false,
    historyOpen: false,
    historyTab: 'history',
    collections: createEmptyCollections(),
    settings: {
      theme: 'system'
    },
    standard: createStandardState(),
    scientific: createScientificState(),
    programmer: createProgrammerState(),
    date: {
      mode: 'difference',
      from: todayString,
      to: todayString,
      baseDate: todayString,
      operation: 'add',
      years: 0,
      months: 0,
      days: 0,
      result: null,
      openModeMenu: false,
      openPicker: null,
      pickerMonth: todayString.slice(0, 7)
    },
    converter: {
      category: 'Length',
      fromUnit: 'Meter',
      toUnit: 'Foot',
      fromValue: '1',
      toValue: '',
      lastEdited: 'from',
      openCurrencyMenu: null,
      currencyRates: { ...DEFAULT_CURRENCY_RATES },
      currencyUpdatedAt: MOCK_CURRENCY_UPDATED_AT,
      currencyUpdateMessage: MOCK_CURRENCY_NOTE,
      isUpdatingRates: false,
      currencyKeyboardField: 'from'
    },
    graphing: createGraphingState()
  };
}

export function createStandardState() {
  return {
    display: '0',
    expression: '',
    accumulator: null,
    operator: null,
    waitingForOperand: false,
    lastOperand: null,
    error: false,
    justEvaluated: false
  };
}

export function createScientificState() {
  return {
    display: '0',
    expression: '',
    angle: 'DEG',
    isExponentialFormat: false,
    isShifted: false,
    isHyperbolic: false,
    openMenu: null,
    error: false,
    justEvaluated: false
  };
}

export function createProgrammerState() {
  return {
    display: '0',
    expression: '',
    accumulator: null,
    operator: null,
    waitingForOperand: false,
    error: false,
    base: 'DEC',
    wordSize: 'QWORD',
    isBitFlipChecked: false,
    justEvaluated: false
  };
}

export function hydrateState() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
    const memory = JSON.parse(localStorage.getItem(STORAGE_KEYS.memory) || '[]');
    const nav = JSON.parse(localStorage.getItem(STORAGE_KEYS.nav) || 'null');
    const theme = localStorage.getItem(STORAGE_KEYS.theme);
    state.collections = Array.isArray(history)
      ? migrateLegacyHistory(history)
      : normalizeCollectionsByMode(history, 'history');

    const memoryCollections = Array.isArray(memory)
      ? migrateLegacyMemory(memory)
      : normalizeCollectionsByMode(memory, 'memory');

    for (const mode of CALCULATOR_COLLECTION_MODES) {
      state.collections[mode].memory = memoryCollections[mode].memory;
    }

    if (typeof nav === 'boolean') {
      state.navOpen = nav;
    }
    if (['light', 'dark', 'system'].includes(theme)) {
      state.settings.theme = theme;
    }
  } catch {
    // ignore broken local storage
  }
}

export function persistCollections() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(serializeCollections('history')));
  localStorage.setItem(STORAGE_KEYS.memory, JSON.stringify(serializeCollections('memory')));
}

export function getHistoryCollection(mode = state.mode) {
  return state.collections[mode]?.history ?? [];
}

export function getMemoryCollection(mode = state.mode) {
  return state.collections[mode]?.memory ?? [];
}

export function replaceHistoryCollection(nextHistory, mode = state.mode) {
  if (!state.collections[mode]) {
    return;
  }
  state.collections[mode].history = normalizeHistoryEntries(nextHistory);
}

export function replaceMemoryCollection(nextMemory, mode = state.mode) {
  if (!state.collections[mode]) {
    return;
  }
  state.collections[mode].memory = normalizeMemoryEntries(nextMemory);
}

export function persistNav() {
  localStorage.setItem(STORAGE_KEYS.nav, JSON.stringify(state.navOpen));
}

export function persistTheme() {
  localStorage.setItem(STORAGE_KEYS.theme, state.settings.theme);
}

export const state = createInitialState();
