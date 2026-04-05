import { CONVERTER_MODE_TO_CATEGORY, DEFAULT_MODE, isConverterMode, isMode } from './config.js';
import { hydrateState, persistCollections, persistNav, persistTheme, state } from './state.js';
import { installTooltipHandling } from './tooltip.js';
import { getLayoutMode, render } from './Views/MainPage.js';
import {
  backspaceGraphExpression,
  closeGraphExpressionAnalysis,
  clearGraphExpression,
  commitGraphExpression,
  computeDateResults,
  drawGraph,
  handleAction,
  handleConverterKeypad,
  handleCurrencyKeypad,
  handleMemoryOperation,
  insertGraphToken,
  isCalculatorMode,
  openGraphExpressionAnalysis,
  recallHistory,
  recallMemory,
  removeGraphExpression,
  resetGraphViewport,
  resetConverterUnits,
  setConverterActiveField,
  setGraphExpressionColor,
  setGraphExpressionLineStyle,
  selectGraphExpression,
  setGraphExpression,
  setGraphMobileView,
  syncConverterValues,
  toggleGraphExpressionVisibility,
  updateGraph,
  zoomGraph
} from './logic.js';

const PAGE_QUERY_PARAM = 'page';
const CALCULATOR_HISTORY_MODES = new Set(['standard', 'scientific', 'programmer']);

hydrateState();
applyUrlMode({ replaceHistory: true, renderView: false });
applyTheme();
computeDateResults();
syncConverterValues('from');
render();
installTooltipHandling();

document.addEventListener('click', handleClick);
document.addEventListener('change', handleChange);
document.addEventListener('input', handleInput);
document.addEventListener('focusin', handleFocusIn);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('resize', handleResize);
window.addEventListener('load', () => drawGraph());
window.addEventListener('popstate', handlePopState);
window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
  if (state.settings.theme === 'system') {
    applyTheme();
  }
});

function normalizeMode(mode) {
  if (typeof mode !== 'string') {
    return null;
  }

  const normalizedMode = mode.trim().toLowerCase();
  return isMode(normalizedMode) ? normalizedMode : null;
}

function getModeFromUrl(url = window.location.href) {
  const parsedUrl = new URL(url, window.location.href);
  return normalizeMode(parsedUrl.searchParams.get(PAGE_QUERY_PARAM));
}

function syncUrlWithMode(mode, { replaceHistory = false } = {}) {
  const nextMode = normalizeMode(mode) ?? DEFAULT_MODE;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(PAGE_QUERY_PARAM, nextMode);

  if (nextUrl.href === window.location.href) {
    return;
  }

  const historyMethod = replaceHistory ? 'replaceState' : 'pushState';
  window.history[historyMethod]({ page: nextMode }, '', nextUrl);
}

function setMode(nextMode, { replaceHistory = false, renderView = true } = {}) {
  const resolvedMode = normalizeMode(nextMode) ?? DEFAULT_MODE;

  if (resolvedMode !== 'settings') {
    state.lastNonSettingsMode = resolvedMode;
  }

  if (isConverterMode(resolvedMode)) {
    state.converter.category = CONVERTER_MODE_TO_CATEGORY[resolvedMode];
    resetConverterUnits();
    syncConverterValues('from');
  }

  state.mode = resolvedMode;
  state.navOpen = false;
  state.historyOpen = CALCULATOR_HISTORY_MODES.has(state.mode) ? state.historyOpen : false;
  persistNav();
  syncUrlWithMode(state.mode, { replaceHistory });

  if (renderView) {
    render();
  }
}

function applyUrlMode({ replaceHistory = false, renderView = true } = {}) {
  setMode(getModeFromUrl() ?? DEFAULT_MODE, { replaceHistory, renderView });
}

function applyTheme() {
  const effectiveTheme = state.settings.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : state.settings.theme;
  document.documentElement.dataset.theme = effectiveTheme;
}

function handleResize() {
  render();
}

function handlePopState() {
  applyUrlMode({ replaceHistory: true });
}

function handleClick(event) {
  const source = event.target instanceof Element ? event.target : null;
  let shouldRender = false;

  if (source && state.mode === 'graphing') {
    if (state.graphing.settingsOpen && !source.closest('.graph-settings-panel, [data-graph-settings-toggle]')) {
      state.graphing.settingsOpen = false;
      shouldRender = true;
    }
    if (state.graphing.stylePanelExpressionIndex != null && !source.closest('.graph-expression-style-panel, [data-graph-expression-style]')) {
      state.graphing.stylePanelExpressionIndex = null;
      shouldRender = true;
    }
    if (state.graphing.openMenu && !source.closest('.graph-keypad-shell')) {
      state.graphing.openMenu = null;
      state.graphing.trigShifted = false;
      state.graphing.trigHyperbolic = false;
      shouldRender = true;
    }
  }

  const target = source?.closest('button');
  if (!target) {
    if (shouldRender) {
      render();
    }
    return;
  }

  if (target.dataset.navToggle) {
    state.navOpen = !state.navOpen;
    persistNav();
    render();
    return;
  }

  if (target.dataset.settingsBack) {
    setMode(state.lastNonSettingsMode);
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
    setMode(target.dataset.setMode);
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

  if (target.dataset.converterAction) {
    handleConverterKeypad(target.dataset.converterAction, target.dataset.value || '');
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
    state.graphing.openMenu = null;
    state.graphing.settingsOpen = false;
    selectGraphExpression(Number(target.dataset.graphSelect));
    render();
    return;
  }

  if (target.dataset.graphExpressionVisibility) {
    toggleGraphExpressionVisibility(Number(target.dataset.graphExpressionVisibility));
    drawGraph();
    render();
    return;
  }

  if (target.dataset.graphExpressionRemove) {
    removeGraphExpression(Number(target.dataset.graphExpressionRemove));
    updateGraph();
    render();
    return;
  }

  if (target.dataset.graphExpressionStyle) {
    const index = Number(target.dataset.graphExpressionStyle);
    state.graphing.stylePanelExpressionIndex = state.graphing.stylePanelExpressionIndex === index ? null : index;
    render();
    return;
  }

  if (target.dataset.graphExpressionColor) {
    setGraphExpressionColor(Number(target.dataset.graphExpressionColor), target.dataset.colorValue || '');
    drawGraph();
    render();
    return;
  }

  if (target.dataset.graphExpressionAnalyze) {
    const index = Number(target.dataset.graphExpressionAnalyze);
    commitGraphExpression(index);
    updateGraph();
    openGraphExpressionAnalysis(index);
    render();
    return;
  }

  if (target.dataset.graphAnalysisClose) {
    closeGraphExpressionAnalysis();
    render();
    return;
  }

  if (target.dataset.graphSurfaceAction) {
    if (target.dataset.graphSurfaceAction === 'trace') {
      state.graphing.tracingEnabled = !state.graphing.tracingEnabled;
      render();
      return;
    }

    if (target.dataset.graphSurfaceAction === 'share') {
      const shareUrl = window.location.href;
      navigator.clipboard?.writeText?.(shareUrl).catch(() => undefined);
      return;
    }
  }

  if (target.dataset.graphSettingsToggle) {
    state.graphing.settingsOpen = !state.graphing.settingsOpen;
    state.graphing.openMenu = null;
    render();
    return;
  }

  if (target.dataset.graphSettingsReset) {
    resetGraphViewport();
    drawGraph();
    render();
    return;
  }

  if (target.dataset.graphViewToggle) {
    state.graphing.isManualAdjustment = !state.graphing.isManualAdjustment;
    if (!state.graphing.isManualAdjustment) {
      resetGraphViewport();
      drawGraph();
    }
    render();
    return;
  }

  if (target.dataset.graphSettingAngle) {
    state.graphing.angle = target.dataset.graphSettingAngle;
    updateGraph();
    render();
    return;
  }

  if (target.dataset.graphMenuToggle) {
    const nextMenu = target.dataset.graphMenuToggle;
    state.graphing.openMenu = state.graphing.openMenu === nextMenu ? null : nextMenu;
    state.graphing.settingsOpen = false;
    if (state.graphing.openMenu !== 'trig') {
      state.graphing.trigShifted = false;
      state.graphing.trigHyperbolic = false;
    }
    render();
    return;
  }

  if (target.dataset.graphMenuAction) {
    if (target.dataset.graphMenuAction === 'toggle-trig-shift') {
      state.graphing.trigShifted = !state.graphing.trigShifted;
    }
    if (target.dataset.graphMenuAction === 'toggle-trig-hyp') {
      state.graphing.trigHyperbolic = !state.graphing.trigHyperbolic;
    }
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
    render();
    return;
  }

  if (target.dataset.graphEditAction) {
    state.graphing.openMenu = null;
    state.graphing.settingsOpen = false;
    if (target.dataset.graphEditAction === 'clear') {
      clearGraphExpression();
    }
    if (target.dataset.graphEditAction === 'backspace') {
      backspaceGraphExpression();
    }
    if (target.dataset.graphEditAction === 'plot') {
      commitGraphExpression(state.graphing.activeExpressionIndex);
      updateGraph();
    }
    render();
    return;
  }

  if (target.dataset.graphInsert) {
    state.graphing.openMenu = null;
    state.graphing.settingsOpen = false;
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

  if (target.name?.startsWith('graph-viewport-')) {
    const viewportKey = target.name.replace('graph-viewport-', '');
    const parsedValue = Number(target.value);
    if (!Number.isFinite(parsedValue)) {
      render();
      return;
    }

    const nextViewport = { ...state.graphing.viewport, [viewportKey]: parsedValue };
    if (nextViewport.xMin >= nextViewport.xMax || nextViewport.yMin >= nextViewport.yMax) {
      render();
      return;
    }

    state.graphing.viewport[viewportKey] = parsedValue;
    state.graphing.isManualAdjustment = true;
    drawGraph();
    render();
    return;
  }

  if (target.name === 'graph-line-thickness') {
    state.graphing.lineThickness = Number(target.value) || 2;
    drawGraph();
    render();
    return;
  }

  if (target.name === 'graph-theme') {
    state.graphing.theme = target.value === 'match-app' ? 'match-app' : 'light';
    drawGraph();
    render();
    return;
  }

  if (target.name?.startsWith('graph-expression-line-style-')) {
    const index = Number(target.name.replace('graph-expression-line-style-', ''));
    setGraphExpressionLineStyle(index, target.value);
    drawGraph();
    render();
    return;
  }

  if (target.name?.startsWith('graph-expression-')) {
    const index = Number(target.name.replace('graph-expression-', ''));
    setGraphExpression(index, target.value);
    commitGraphExpression(index);
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
  if (state.mode === 'graphing' && event.key === 'Escape' && state.graphing.analysisExpressionIndex != null) {
    closeGraphExpressionAnalysis();
    render();
    event.preventDefault();
    return;
  }

  if (state.mode === 'graphing' && event.key === 'Escape' && (state.graphing.settingsOpen || state.graphing.openMenu)) {
    state.graphing.settingsOpen = false;
    state.graphing.openMenu = null;
    state.graphing.trigShifted = false;
    state.graphing.trigHyperbolic = false;
    render();
    event.preventDefault();
    return;
  }

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
      if (event.target instanceof HTMLInputElement && event.target.name?.startsWith('graph-expression-')) {
        const index = Number(event.target.name.replace('graph-expression-', ''));
        setGraphExpression(index, event.target.value);
        commitGraphExpression(index);
      }
      updateGraph();
      render();
    }
    if (isConverterMode(state.mode) || state.mode === 'converter') {
      if (/^[0-9]$/.test(event.key)) {
        handleConverterKeypad('digit', event.key);
      } else if (event.key === 'Backspace') {
        handleConverterKeypad('backspace');
      } else if (event.key === 'Escape') {
        handleConverterKeypad('clear');
      } else if (event.key === ',' || event.key === '.') {
        handleConverterKeypad('decimal');
      } else if (event.key === '-' && state.converter.category !== 'Currency') {
        handleConverterKeypad('toggle-sign');
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
