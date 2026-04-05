import { CONVERTER_MODE_TO_CATEGORY, isConverterMode } from './config.js';
import { hydrateState, persistCollections, persistNav, persistTheme, state } from './state.js';
import { getLayoutMode, render } from './Views/MainPage.js';
import {
  backspaceGraphExpression,
  clearGraphExpression,
  computeDateResults,
  drawGraph,
  handleAction,
  handleCurrencyKeypad,
  handleMemoryOperation,
  insertGraphToken,
  isCalculatorMode,
  recallHistory,
  recallMemory,
  resetConverterUnits,
  setConverterActiveField,
  selectGraphExpression,
  setGraphExpression,
  setGraphMobileView,
  syncConverterValues,
  updateGraph,
  zoomGraph
} from './logic.js';

hydrateState();
applyTheme();
computeDateResults();
syncConverterValues('from');
render();

document.addEventListener('click', handleClick);
document.addEventListener('change', handleChange);
document.addEventListener('input', handleInput);
document.addEventListener('focusin', handleFocusIn);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('resize', handleResize);
window.addEventListener('load', () => drawGraph());
window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
  if (state.settings.theme === 'system') {
    applyTheme();
  }
});

function applyTheme() {
  const effectiveTheme = state.settings.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : state.settings.theme;
  document.documentElement.dataset.theme = effectiveTheme;
}

function handleResize() {
  render();
}

function handleClick(event) {
  const target = event.target.closest('button');
  if (!target) {
    return;
  }

  if (target.dataset.navToggle) {
    state.navOpen = !state.navOpen;
    persistNav();
    render();
    return;
  }

  if (target.dataset.settingsBack) {
    state.mode = state.lastNonSettingsMode;
    state.navOpen = false;
    render();
    return;
  }

  if (target.dataset.closeSurface) {
    if (target.dataset.closeSurface === 'nav') {
      state.navOpen = false;
      persistNav();
    }
    if (target.dataset.closeSurface === 'panel') {
      state.historyOpen = false;
    }
    render();
    return;
  }

  if (target.dataset.togglePanel) {
    const nextTab = target.dataset.togglePanel;
    if (state.historyOpen && state.historyTab === nextTab) {
      state.historyOpen = false;
    } else {
      state.historyTab = nextTab;
      state.historyOpen = true;
    }
    render();
    return;
  }

  if (target.dataset.setMode) {
    const nextMode = target.dataset.setMode;
    if (nextMode !== 'settings') {
      state.lastNonSettingsMode = nextMode;
    }
    if (isConverterMode(nextMode)) {
      state.converter.category = CONVERTER_MODE_TO_CATEGORY[nextMode];
      resetConverterUnits();
      syncConverterValues('from');
    }
    state.mode = nextMode;
    state.navOpen = false;
    state.historyOpen = ['standard', 'scientific', 'programmer'].includes(state.mode) ? state.historyOpen : false;
    persistNav();
    render();
    return;
  }

  if (target.dataset.historyTab) {
    state.historyTab = target.dataset.historyTab;
    state.historyOpen = true;
    render();
    return;
  }

  if (target.dataset.historyClear) {
    state.history = [];
    persistCollections();
    render();
    return;
  }

  if (target.dataset.memoryClear) {
    state.memory = [];
    persistCollections();
    render();
    return;
  }

  if (target.dataset.historyIndex) {
    recallHistory(Number(target.dataset.historyIndex));
    if (getLayoutMode() !== 'desktop') {
      state.historyOpen = false;
    }
    render();
    return;
  }

  if (target.dataset.memoryRecall) {
    recallMemory(Number(target.dataset.memoryRecall));
    if (getLayoutMode() !== 'desktop') {
      state.historyOpen = false;
    }
    render();
    return;
  }

  if (target.dataset.memoryDelete) {
    state.memory.splice(Number(target.dataset.memoryDelete), 1);
    persistCollections();
    render();
    return;
  }

  if (target.dataset.memoryOp) {
    handleMemoryOperation(target.dataset.memoryOp);
    render();
    return;
  }

  if (target.dataset.dateMode) {
    state.date.mode = target.dataset.dateMode;
    computeDateResults();
    render();
    return;
  }

  if (target.dataset.converterSwap) {
    [state.converter.fromUnit, state.converter.toUnit] = [state.converter.toUnit, state.converter.fromUnit];
    [state.converter.fromValue, state.converter.toValue] = [state.converter.toValue || state.converter.fromValue, state.converter.fromValue];
    syncConverterValues(state.converter.lastEdited || 'from');
    render();
    return;
  }

  if (target.dataset.converterActiveField) {
    setConverterActiveField(target.dataset.converterActiveField);
    render();
    return;
  }

  if (target.dataset.currencyAction) {
    handleCurrencyKeypad(target.dataset.currencyAction, target.dataset.value || '');
    render();
    return;
  }

  if (target.dataset.graphPlot) {
    updateGraph();
    render();
    return;
  }

  if (target.dataset.graphSelect) {
    selectGraphExpression(Number(target.dataset.graphSelect));
    render();
    return;
  }

  if (target.dataset.graphView) {
    setGraphMobileView(target.dataset.graphView);
    render();
    return;
  }

  if (target.dataset.graphZoom) {
    zoomGraph(target.dataset.graphZoom);
    drawGraph();
    return;
  }

  if (target.dataset.graphEditAction) {
    if (target.dataset.graphEditAction === 'clear') {
      clearGraphExpression();
    }
    if (target.dataset.graphEditAction === 'backspace') {
      backspaceGraphExpression();
    }
    if (target.dataset.graphEditAction === 'plot') {
      updateGraph();
    }
    render();
    return;
  }

  if (target.dataset.graphInsert) {
    insertGraphToken(target.dataset.graphInsert);
    updateGraph();
    render();
    return;
  }

  if (target.dataset.action && target.dataset.action !== 'noop') {
    handleAction(target.dataset.action, target.dataset.value || '');
    render();
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.name?.startsWith('date-')) {
    const key = target.name.replace('date-', '');
    state.date[key] = target.type === 'number' ? Number(target.value || 0) : target.value;
    computeDateResults();
    render();
    return;
  }

  if (target.name === 'settings-theme') {
    state.settings.theme = target.value;
    persistTheme();
    applyTheme();
    render();
    return;
  }

  if (target.name?.startsWith('converter-')) {
    const key = target.name.replace('converter-', '');
    state.converter[key] = target.value;
    if (key === 'fromUnit' || key === 'fromValue') {
      setConverterActiveField('from');
    }
    if (key === 'toUnit' || key === 'toValue') {
      setConverterActiveField('to');
    }
    if (key === 'category') {
      resetConverterUnits();
    }
    syncConverterValues(key === 'toValue' || key === 'toUnit' ? 'to' : 'from');
    render();
    return;
  }

  if (target.name?.startsWith('graph-expression-')) {
    const index = Number(target.name.replace('graph-expression-', ''));
    setGraphExpression(index, target.value);
    updateGraph();
    render();
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.name?.startsWith('graph-expression-')) {
    const index = Number(target.name.replace('graph-expression-', ''));
    setGraphExpression(index, target.value);
    drawGraph();
    return;
  }

  if (target.name === 'converter-fromValue') {
    state.converter.fromValue = target.value;
    syncConverterValues('from');
    render();
    return;
  }

  if (target.name === 'converter-toValue') {
    state.converter.toValue = target.value;
    syncConverterValues('to');
    render();
  }
}

function handleFocusIn(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.name?.startsWith('graph-expression-')) {
    selectGraphExpression(Number(target.name.replace('graph-expression-', '')));
    return;
  }

  if (target.dataset.converterField) {
    setConverterActiveField(target.dataset.converterField);
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && (state.navOpen || state.historyOpen)) {
    state.navOpen = false;
    state.historyOpen = false;
    persistNav();
    render();
    event.preventDefault();
    return;
  }

  if (!isCalculatorMode(state.mode)) {
    if (state.mode === 'graphing' && event.key === 'Enter') {
      updateGraph();
      render();
    }
    if (state.mode === 'currency') {
      if (/^[0-9]$/.test(event.key)) {
        handleCurrencyKeypad('digit', event.key);
      } else if (event.key === 'Backspace') {
        handleCurrencyKeypad('backspace');
      } else if (event.key === 'Escape') {
        handleCurrencyKeypad('clear');
      } else if (event.key === ',' || event.key === '.') {
        handleCurrencyKeypad('decimal');
      } else {
        return;
      }
      event.preventDefault();
      render();
    }
    return;
  }

  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
    return;
  }

  const key = event.key;
  if (/^[0-9]$/.test(key)) {
    handleAction('digit', key);
  } else if (state.mode === 'programmer' && /^[a-fA-F]$/.test(key)) {
    handleAction('digit', key.toUpperCase());
  } else if (key === '.') {
    handleAction('decimal', '.');
  } else if (key === 'Backspace') {
    handleAction('backspace', '');
  } else if (key === 'Escape') {
    handleAction('clear-all', '');
  } else if (key === 'Enter' || key === '=') {
    handleAction('equals', '');
  } else if (['+', '-', '*', '/'].includes(key)) {
    handleAction('operator', key);
  } else {
    return;
  }

  event.preventDefault();
  render();
}
