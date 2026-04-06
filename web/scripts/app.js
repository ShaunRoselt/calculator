import { CONVERTER_MODE_TO_CATEGORY, CURRENCY_CODE_TO_NAME, CURRENCY_DETAILS, CURRENCY_OPTIONS, DEFAULT_CURRENCY_RATES, DEFAULT_MODE, isConverterMode, isMode } from './config.js';
import {
  getMemoryCollection,
  hydrateState,
  persistCollections,
  persistNav,
  persistTheme,
  replaceHistoryCollection,
  replaceMemoryCollection,
  state
} from './state.js';
import { installTooltipHandling } from './tooltip.js';
import { getLayoutMode, render } from './Views/MainPage.js';
import {
  backspaceGraphExpression,
  commitConverterHistory,
  commitDateHistory,
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
  supportsHistoryPanelMode,
  supportsMemoryPanelMode,
  syncConverterValues,
  toggleGraphExpressionVisibility,
  updateMemoryItem,
  updateGraph,
  zoomGraph
} from './logic.js';

const PAGE_QUERY_PARAM = 'page';
const CURRENCY_TYPEAHEAD_RESET_MS = 900;

let currencyTypeaheadBuffer = '';
let currencyTypeaheadTimestamp = 0;

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
    state.converter.currencyKeyboardField = 'from';
  }

  state.mode = resolvedMode;
  state.navOpen = false;
  state.historyOpen = supportsHistoryPanelMode(state.mode) ? state.historyOpen : false;
  if (!supportsMemoryPanelMode(state.mode) && state.historyTab === 'memory') {
    state.historyTab = 'history';
  }
  persistNav();
  syncUrlWithMode(state.mode, { replaceHistory });

  if (renderView) {
    render();
  }

  if (resolvedMode === 'currency') {
    void updateCurrencyRates();
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

  if (source && state.mode === 'currency' && state.converter.openCurrencyMenu && !source.closest('.currency-select-wrap')) {
    state.converter.openCurrencyMenu = null;
    shouldRender = true;
  }

  if (source && state.mode === 'date' && state.date.openModeMenu && !source.closest('.date-native-select-wrap')) {
    state.date.openModeMenu = false;
    shouldRender = true;
  }

  if (source && state.mode === 'date' && state.date.openPicker && !source.closest('.date-native-picker-shell')) {
    state.date.openPicker = null;
    shouldRender = true;
  }

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
    if (nextTab === 'memory' && !supportsMemoryPanelMode(state.mode)) {
      return;
    }
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
    if (target.dataset.historyTab === 'memory' && !supportsMemoryPanelMode(state.mode)) {
      return;
    }
    state.historyTab = target.dataset.historyTab;
    state.historyOpen = true;
    render();
    return;
  }

  if (target.dataset.historyClear) {
    replaceHistoryCollection([]);
    persistCollections();
    render();
    return;
  }

  if (target.dataset.memoryClear) {
    replaceMemoryCollection([]);
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

  if (target.dataset.memoryClearItem) {
    updateMemoryItem(Number(target.dataset.memoryClearItem), 'clear');
    render();
    return;
  }

  if (target.dataset.memoryAdd) {
    updateMemoryItem(Number(target.dataset.memoryAdd), 'add');
    render();
    return;
  }

  if (target.dataset.memorySubtract) {
    updateMemoryItem(Number(target.dataset.memorySubtract), 'subtract');
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
    commitDateHistory();
    render();
    return;
  }

  if (target.dataset.dateModeToggle) {
    state.date.openModeMenu = !state.date.openModeMenu;
    if (state.date.openModeMenu) {
      state.date.openPicker = null;
    }
    render();
    return;
  }

  if (target.dataset.dateModeSelect) {
    state.date.mode = target.dataset.dateModeSelect;
    state.date.openModeMenu = false;
    state.date.openPicker = null;
    computeDateResults();
    commitDateHistory();
    render();
    return;
  }

  if (target.dataset.datePickerToggle) {
    const nextKey = target.dataset.datePickerToggle;
    if (state.date.openPicker === nextKey) {
      state.date.openPicker = null;
    } else {
      state.date.openPicker = nextKey;
      state.date.openModeMenu = false;
      const selectedValue = state.date[nextKey];
      state.date.pickerMonth = String(selectedValue).slice(0, 7);
    }
    render();
    return;
  }

  if (target.dataset.datePickerNav) {
    const [year, month] = state.date.pickerMonth.split('-').map(Number);
    const nextVisible = new Date(Date.UTC(year, month - 1 + Number(target.dataset.datePickerNav), 1));
    state.date.pickerMonth = `${nextVisible.getUTCFullYear()}-${String(nextVisible.getUTCMonth() + 1).padStart(2, '0')}`;
    render();
    return;
  }

  if (target.dataset.datePick && target.dataset.datePickTarget) {
    state.date[target.dataset.datePickTarget] = target.dataset.datePick;
    state.date.pickerMonth = target.dataset.datePick.slice(0, 7);
    state.date.openPicker = null;
    computeDateResults();
    commitDateHistory();
    render();
    return;
  }

  if (target.dataset.converterSwap) {
    [state.converter.fromUnit, state.converter.toUnit] = [state.converter.toUnit, state.converter.fromUnit];
    [state.converter.fromValue, state.converter.toValue] = [state.converter.toValue || state.converter.fromValue, state.converter.fromValue];
    syncConverterValues(state.converter.lastEdited || 'from');
    commitConverterHistory();
    render();
    return;
  }

  if (target.dataset.converterActiveField) {
    setConverterActiveField(target.dataset.converterActiveField);
    if (state.mode === 'currency') {
      state.converter.currencyKeyboardField = target.dataset.converterActiveField;
    }
    render();
    return;
  }

  if (target.dataset.currencyMenuToggle) {
    const field = target.dataset.currencyMenuToggle;
    state.converter.openCurrencyMenu = state.converter.openCurrencyMenu === field ? null : field;
    state.converter.currencyKeyboardField = field;
    setConverterActiveField(field);
    render();
    return;
  }

  if (target.dataset.currencyUnitSelect) {
    const field = target.dataset.currencyUnitSelect;
    const value = target.dataset.currencyValue;
    if (!field || !value) {
      return;
    }
    state.converter[field === 'from' ? 'fromUnit' : 'toUnit'] = value;
    state.converter.openCurrencyMenu = null;
    state.converter.currencyKeyboardField = field;
    setConverterActiveField(field);
    syncConverterValues(field);
    commitConverterHistory();
    render();
    return;
  }

  if (target.dataset.currencyUpdateRates) {
    void updateCurrencyRates();
    return;
  }

  if (target.dataset.converterAction) {
    handleConverterKeypad(target.dataset.converterAction, target.dataset.value || '');
    commitConverterHistory();
    render();
    return;
  }

  if (target.dataset.currencyAction) {
    handleCurrencyKeypad(target.dataset.currencyAction, target.dataset.value || '');
    commitConverterHistory();
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

async function updateCurrencyRates() {
  if (state.converter.isUpdatingRates) {
    return;
  }

  state.converter.isUpdatingRates = true;
  state.converter.currencyUpdateMessage = 'Fetching the latest USD reference rates...';
  render();

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.result !== 'success' || !payload?.rates || typeof payload.rates !== 'object') {
      throw new Error('Currency service returned an unexpected payload.');
    }

    state.converter.currencyRates = normalizeCurrencyRates(payload.rates);
    state.converter.currencyUpdatedAt = formatCurrencyTimestamp(payload.time_last_update_utc);
    state.converter.currencyUpdateMessage = 'Live rates loaded from ExchangeRate-API.';
  } catch {
    state.converter.currencyRates = buildFallbackCurrencyRates();
    state.converter.currencyUpdatedAt = formatCurrencyTimestamp(new Date().toISOString());
    state.converter.currencyUpdateMessage = 'Live update unavailable. Refreshed demo rates locally.';
  } finally {
    state.converter.isUpdatingRates = false;
    syncConverterValues(state.converter.lastEdited || 'from');
    render();
  }
}

function normalizeCurrencyRates(rates) {
  const normalizedRates = { ...DEFAULT_CURRENCY_RATES };

  for (const [code, rawRate] of Object.entries(rates)) {
    const name = CURRENCY_CODE_TO_NAME[code];
    const numericRate = Number(rawRate);
    if (!name || !Number.isFinite(numericRate) || numericRate <= 0) {
      continue;
    }
    normalizedRates[name] = numericRate;
  }

  return normalizedRates;
}

function buildFallbackCurrencyRates() {
  const fallbackRates = { ...DEFAULT_CURRENCY_RATES };
  const minuteSeed = Math.floor(Date.now() / 60000);
  let index = 0;

  for (const [name, rate] of Object.entries(fallbackRates)) {
    if (name === 'US Dollar') {
      continue;
    }

    const offset = ((minuteSeed + index * 17) % 23) - 11;
    const driftMultiplier = 1 + (offset / 5000);
    fallbackRates[name] = Number((rate * driftMultiplier).toPrecision(10));
    index += 1;
  }

  return fallbackRates;
}

function formatCurrencyTimestamp(value) {
  const parsedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return state.converter.currencyUpdatedAt;
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const hours = String(parsedDate.getHours()).padStart(2, '0');
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
  const seconds = String(parsedDate.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.name?.startsWith('date-')) {
    const key = target.name.replace('date-', '');
    state.date[key] = target.type === 'number' ? Number(target.value || 0) : target.value;
    if (key === 'mode') {
      state.date.openModeMenu = false;
      state.date.openPicker = null;
    }
    computeDateResults();
    commitDateHistory();
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
    commitConverterHistory();
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
    commitConverterHistory();
    render();
    return;
  }

  if (target.name === 'converter-toValue') {
    state.converter.toValue = target.value;
    syncConverterValues('to');
    commitConverterHistory();
    render();
  }
}

function handleFocusIn(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement) {
    if (target.name?.startsWith('graph-expression-')) {
      selectGraphExpression(Number(target.name.replace('graph-expression-', '')));
      return;
    }

    if (target.dataset.converterField) {
      setConverterActiveField(target.dataset.converterField);
    }
    return;
  }

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const currencyToggle = target.closest('[data-currency-menu-toggle]');
  if (currencyToggle instanceof HTMLElement) {
    const field = currencyToggle.dataset.currencyMenuToggle;
    if (field === 'from' || field === 'to') {
      state.converter.currencyKeyboardField = field;
    }
    return;
  }

  const currencyOption = target.closest('[data-currency-unit-select]');
  if (currencyOption instanceof HTMLElement) {
    const field = currencyOption.dataset.currencyUnitSelect;
    if (field === 'from' || field === 'to') {
      state.converter.currencyKeyboardField = field;
    }
  }
}

function handleKeydown(event) {
  if (handleCurrencyDropdownKeydown(event)) {
    return;
  }

  if (state.mode === 'currency' && event.key === 'Escape' && state.converter.openCurrencyMenu) {
    state.converter.openCurrencyMenu = null;
    render();
    event.preventDefault();
    return;
  }

  if (state.mode === 'date' && event.key === 'Escape' && state.date.openModeMenu) {
    state.date.openModeMenu = false;
    render();
    event.preventDefault();
    return;
  }

  if (state.mode === 'date' && event.key === 'Escape' && state.date.openPicker) {
    state.date.openPicker = null;
    render();
    event.preventDefault();
    return;
  }

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
      commitConverterHistory();
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

function handleCurrencyDropdownKeydown(event) {
  if (state.mode !== 'currency' || event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  const isDropdownTarget = isCurrencyDropdownTarget(event.target);
  if (!isDropdownTarget && !state.converter.openCurrencyMenu) {
    return false;
  }

  const field = getCurrencyKeyboardField(event.target);
  if (!field) {
    return false;
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    moveCurrencySelection(field, event.key === 'ArrowDown' ? 1 : -1);
    event.preventDefault();
    render();
    return true;
  }

  if (event.key === 'Home' || event.key === 'End') {
    const targetIndex = event.key === 'Home' ? 0 : CURRENCY_OPTIONS.length - 1;
    selectCurrencyByIndex(field, targetIndex, true);
    event.preventDefault();
    render();
    return true;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    state.converter.openCurrencyMenu = state.converter.openCurrencyMenu === field ? null : field;
    state.converter.currencyKeyboardField = field;
    event.preventDefault();
    render();
    return true;
  }

  if (event.key.length === 1 && /[\p{L}\p{N}]/u.test(event.key)) {
    const match = findCurrencyTypeaheadMatch(field, event.key);
    if (!match) {
      return false;
    }

    applyCurrencySelection(field, match.name, true);
    event.preventDefault();
    render();
    return true;
  }

  return false;
}

function getCurrencyKeyboardField(target) {
  const element = target instanceof HTMLElement ? target : null;
  const toggle = element?.closest('[data-currency-menu-toggle]');
  if (toggle instanceof HTMLElement) {
    const field = toggle.dataset.currencyMenuToggle;
    if (field === 'from' || field === 'to') {
      return field;
    }
  }

  const option = element?.closest('[data-currency-unit-select]');
  if (option instanceof HTMLElement) {
    const field = option.dataset.currencyUnitSelect;
    if (field === 'from' || field === 'to') {
      return field;
    }
  }

  if (state.converter.openCurrencyMenu === 'from' || state.converter.openCurrencyMenu === 'to') {
    return state.converter.openCurrencyMenu;
  }

  return state.converter.currencyKeyboardField === 'to' ? 'to' : 'from';
}

function isCurrencyDropdownTarget(target) {
  const element = target instanceof HTMLElement ? target : null;
  return Boolean(element?.closest('.currency-select-wrap'));
}

function moveCurrencySelection(field, direction) {
  const values = CURRENCY_OPTIONS.map((currency) => currency.name);
  const currentValue = field === 'from' ? state.converter.fromUnit : state.converter.toUnit;
  const currentIndex = Math.max(0, values.indexOf(currentValue));
  const nextIndex = (currentIndex + direction + values.length) % values.length;
  selectCurrencyByIndex(field, nextIndex, true);
}

function selectCurrencyByIndex(field, index, keepMenuOpen) {
  const values = CURRENCY_OPTIONS.map((currency) => currency.name);
  const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
  applyCurrencySelection(field, values[clampedIndex], keepMenuOpen);
}

function applyCurrencySelection(field, value, keepMenuOpen = false) {
  state.converter[field === 'from' ? 'fromUnit' : 'toUnit'] = value;
  state.converter.openCurrencyMenu = keepMenuOpen ? field : null;
  state.converter.currencyKeyboardField = field;
  setConverterActiveField(field);
  syncConverterValues(field);
  commitConverterHistory();
}

function findCurrencyTypeaheadMatch(field, key) {
  const now = Date.now();
  if (now - currencyTypeaheadTimestamp > CURRENCY_TYPEAHEAD_RESET_MS) {
    currencyTypeaheadBuffer = '';
  }

  currencyTypeaheadTimestamp = now;
  currencyTypeaheadBuffer += key.toLowerCase();

  const currentValue = field === 'from' ? state.converter.fromUnit : state.converter.toUnit;
  const currentIndex = Math.max(0, CURRENCY_OPTIONS.findIndex((currency) => currency.name === currentValue));
  const orderedOptions = [...CURRENCY_OPTIONS.slice(currentIndex + 1), ...CURRENCY_OPTIONS.slice(0, currentIndex + 1)];

  return orderedOptions.find((currency) => {
    const details = CURRENCY_DETAILS[currency.name] || { label: currency.name, code: '' };
    const searchTerms = [currency.name, details.label, details.code]
      .filter(Boolean)
      .map((term) => term.toLowerCase());

    return searchTerms.some((term) => term.startsWith(currencyTypeaheadBuffer))
      || searchTerms.some((term) => term.includes(currencyTypeaheadBuffer));
  }) ?? null;
}
