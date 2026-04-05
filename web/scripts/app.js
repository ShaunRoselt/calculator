import { hydrateState, persistCollections, persistNav, state } from './state.js';
import { getLayoutMode, render } from './Views/MainPage.js';
import {
  computeDateResults,
  drawGraph,
  handleAction,
  handleMemoryOperation,
  isCalculatorMode,
  recallHistory,
  recallMemory,
  resetConverterUnits,
  syncConverterValues,
  updateGraph
} from './logic.js';

hydrateState();
computeDateResults();
syncConverterValues('from');
render();

document.addEventListener('click', handleClick);
document.addEventListener('change', handleChange);
document.addEventListener('input', handleInput);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('resize', handleResize);
window.addEventListener('load', () => drawGraph());

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
    state.mode = target.dataset.setMode;
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
    syncConverterValues('from');
    render();
    return;
  }

  if (target.dataset.graphPlot) {
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

  if (target.name?.startsWith('converter-')) {
    const key = target.name.replace('converter-', '');
    state.converter[key] = target.value;
    if (key === 'category') {
      resetConverterUnits();
    }
    syncConverterValues('from');
    render();
    return;
  }

  if (target.name === 'graph-expression') {
    state.graphing.expression = target.value;
    updateGraph();
    render();
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.name === 'graph-expression') {
    state.graphing.expression = target.value;
    drawGraph();
    return;
  }

  if (target.name === 'converter-fromValue') {
    state.converter.fromValue = target.value;
    syncConverterValues('from');
    render();
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
