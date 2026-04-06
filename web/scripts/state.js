import { STORAGE_KEYS } from './config.js';
import { toDateInputValue } from './utils.js';

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
