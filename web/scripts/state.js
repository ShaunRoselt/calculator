import { STORAGE_KEYS } from './config.js';
import { toDateInputValue } from './utils.js';

function createGraphingExpressions() {
  return [
    { color: '#0063b1', value: '5', error: false },
    { color: '#107c10', value: 'log(8)', error: false },
    { color: '#e81123', value: 'cos(5)', error: false },
    { color: '#8a8886', value: '', error: false }
  ];
}

function createGraphingState() {
  return {
    expressions: createGraphingExpressions(),
    activeExpressionIndex: 3,
    openMenu: null,
    trigShifted: false,
    trigHyperbolic: false,
    mobileView: 'graph',
    viewport: {
      xMin: -24,
      xMax: 24,
      yMin: -15,
      yMax: 15
    },
    status: 'Plotting graph'
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
    history: [],
    memory: [],
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
      result: null
    },
    converter: {
      category: 'Length',
      fromUnit: 'Meter',
      toUnit: 'Foot',
      fromValue: '1',
      toValue: '',
      lastEdited: 'from'
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
    if (Array.isArray(history)) {
      state.history = history.slice(0, 60);
    }
    if (Array.isArray(memory)) {
      state.memory = memory.slice(0, 20);
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
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history.slice(0, 60)));
  localStorage.setItem(STORAGE_KEYS.memory, JSON.stringify(state.memory.slice(0, 20)));
}

export function persistNav() {
  localStorage.setItem(STORAGE_KEYS.nav, JSON.stringify(state.navOpen));
}

export function persistTheme() {
  localStorage.setItem(STORAGE_KEYS.theme, state.settings.theme);
}

export const state = createInitialState();
