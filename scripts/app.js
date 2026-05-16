import {
  APP_SHORTCUT_DEFAULTS,
  APP_SHORTCUT_DEFINITIONS,
  CONVERTER_MODE_TO_CATEGORY,
  CURRENCY_CODE_TO_NAME,
  DEFAULT_CURRENCY_RATES,
  OFFLINE_CURRENCY_UPDATED_AT,
  DEFAULT_MODE,
  canonicalizeShortcutBinding,
  getCurrencyDetails,
  getCurrencyOptions,
  getUnitLabel,
  isConverterMode,
  isMode
} from './config.js';
import { appRoot } from './dom.js';
import {
  createProgrammerState,
  createScientificState,
  createStandardState,
  getMemoryCollection,
  hydrateState,
  persistCollections,
  persistLanguage,
  persistNav,
  persistPage,
  persistRepeatEquals,
  persistShortcuts,
  persistTheme,
  replaceHistoryCollection,
  replaceMemoryCollection,
  state
} from './state.js';
import { getCurrentLanguage, setLanguage, t } from './i18n.js';
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
  panGraph,
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
  getUnitsForCategory,
  syncConverterValues,
  toggleGraphExpressionVisibility,
  updateMemoryItem,
  updateGraph,
  zoomGraph
} from './logic.js';
import {
  applyThemeToElement,
  getResolvedAppThemeId,
  isSupportedTheme,
  normalizeGraphThemeSetting,
  preloadAllThemes
} from './themes.js';
import { getUrlPreferenceOverrides } from './urlParams.js';

const PAGE_QUERY_PARAM = 'page';
const CURRENCY_TYPEAHEAD_RESET_MS = 900;

const systemThemeMedia = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: light)')
  : null;
const urlPreferences = getUrlPreferenceOverrides();

let converterTypeaheadBuffer = '';
let converterTypeaheadTimestamp = 0;
let lastViewportWidth = window.innerWidth;
let lastViewportHeight = window.innerHeight;
let graphPanSession = null;
const calculatorUndoStack = [];
const calculatorRedoStack = [];
const MAX_CALCULATOR_HISTORY = 100;

const fullscreenBridge = typeof window.appWindow === 'object' && window.appWindow !== null
  ? window.appWindow
  : null;
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

function isEditableTarget(target) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

function getShortcutDefinition(shortcutId) {
  return APP_SHORTCUT_DEFINITIONS.find((shortcut) => shortcut.id === shortcutId) ?? null;
}

function getShortcutBinding(shortcutId) {
  return canonicalizeShortcutBinding(state.settings.shortcuts[shortcutId])
    ?? APP_SHORTCUT_DEFAULTS[shortcutId]
    ?? null;
}

function canonicalizeEventShortcutKey(key) {
  if (typeof key !== 'string' || !key || MODIFIER_KEYS.has(key)) {
    return null;
  }

  if (key === ' ') {
    return 'Space';
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key === 'Esc' ? 'Escape' : key;
}

function serializeShortcutEvent(event) {
  const key = canonicalizeEventShortcutKey(event.key);
  if (!key) {
    return null;
  }

  const modifiers = [];
  if (event.ctrlKey) {
    modifiers.push('Ctrl');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }
  if (event.metaKey && !event.ctrlKey) {
    modifiers.push('Meta');
  }

  return canonicalizeShortcutBinding([...modifiers, key].join('+'));
}

function matchesShortcut(event, binding) {
  const normalizedBinding = canonicalizeShortcutBinding(binding);
  if (!normalizedBinding) {
    return false;
  }

  const parts = normalizedBinding.split('+');
  const key = parts.at(-1);
  const modifiers = new Set(parts.slice(0, -1));
  if (canonicalizeEventShortcutKey(event.key) !== key) {
    return false;
  }

  if (modifiers.has('Ctrl')) {
    if (!(event.ctrlKey || event.metaKey)) {
      return false;
    }
  } else if (modifiers.has('Meta')) {
    if (!event.metaKey || event.ctrlKey) {
      return false;
    }
  } else if (event.ctrlKey || event.metaKey) {
    return false;
  }

  if (modifiers.has('Alt') !== event.altKey) {
    return false;
  }

  if (modifiers.has('Shift') !== event.shiftKey) {
    return false;
  }

  return true;
}

function clearShortcutCapture() {
  state.settings.activeShortcutId = null;
  state.settings.shortcutError = '';
}

function setShortcutBinding(shortcutId, binding) {
  state.settings.shortcuts[shortcutId] = binding;
  persistShortcuts();
}

function getShortcutConflict(shortcutId, binding) {
  return APP_SHORTCUT_DEFINITIONS.find((shortcut) => shortcut.id !== shortcutId && getShortcutBinding(shortcut.id) === binding) ?? null;
}

function beginShortcutCapture(shortcutId) {
  if (!getShortcutDefinition(shortcutId)) {
    return;
  }

  state.settings.activeShortcutId = state.settings.activeShortcutId === shortcutId ? null : shortcutId;
  state.settings.shortcutError = '';
  render();
}

function handleShortcutCapture(event) {
  const shortcutId = state.settings.activeShortcutId;
  if (!shortcutId) {
    return false;
  }

  if (event.key === 'Tab') {
    return false;
  }

  event.preventDefault();

  if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && event.key === 'Escape') {
    clearShortcutCapture();
    render();
    return true;
  }

  const binding = serializeShortcutEvent(event);
  if (!binding) {
    state.settings.shortcutError = t('settings.shortcuts.invalid');
    render();
    return true;
  }

  const conflictingShortcut = getShortcutConflict(shortcutId, binding);
  if (conflictingShortcut) {
    state.settings.shortcutError = t('settings.shortcuts.conflict', {
      shortcut: t(conflictingShortcut.labelKey)
    });
    render();
    return true;
  }

  setShortcutBinding(shortcutId, binding);
  clearShortcutCapture();
  render();
  return true;
}

function handleConfiguredShortcut(event) {
  for (const shortcut of APP_SHORTCUT_DEFINITIONS) {
    if (!matchesShortcut(event, getShortcutBinding(shortcut.id))) {
      continue;
    }

    if (!shortcut.allowInEditable && isEditableTarget(event.target)) {
      return false;
    }

    event.preventDefault();

    if (shortcut.id === 'undo') {
      const restored = restorePreviousCalculatorSnapshot();
      if (restored) {
        render();
      }
      return true;
    }

    if (shortcut.id === 'redo') {
      const restored = restoreNextCalculatorSnapshot();
      if (restored) {
        render();
      }
      return true;
    }

    if (shortcut.id === 'copy') {
      void copyCalculatorValue();
      return true;
    }

    if (shortcut.id === 'paste') {
      void pasteCalculatorValue().then((pasted) => {
        if (pasted) {
          render();
        }
      });
      return true;
    }

    if (shortcut.id === 'fullscreen') {
      void applyFullscreenSetting(!state.settings.isFullscreen);
      return true;
    }
  }

  return false;
}

function setGraphCompactEditorView(view) {
  state.graphing.compactEditorView = view === 'keypad' ? 'keypad' : 'expressions';

  if (state.graphing.compactEditorView === 'expressions') {
    state.graphing.openMenu = null;
    return;
  }

  state.graphing.stylePanelExpressionIndex = null;
}

function syncGraphExpressionSelection(input) {
  if (!(input instanceof HTMLInputElement) || !input.name?.startsWith('graph-expression-')) {
    return;
  }

  const index = Number(input.name.replace('graph-expression-', ''));
  if (!Number.isInteger(index) || index < 0) {
    return;
  }

  state.graphing.activeExpressionIndex = index;
  state.graphing.activeExpressionSelectionStart = input.selectionStart ?? input.value.length;
  state.graphing.activeExpressionSelectionEnd = input.selectionEnd ?? state.graphing.activeExpressionSelectionStart;
}

function restoreGraphExpressionSelection() {
  const applySelection = () => {
    const input = document.querySelector(`input[name="graph-expression-${state.graphing.activeExpressionIndex}"]`);
    if (!(input instanceof HTMLInputElement)) {
      return false;
    }

    if (input.offsetParent === null) {
      return false;
    }

    input.focus();
    input.setSelectionRange(
      state.graphing.activeExpressionSelectionStart ?? input.value.length,
      state.graphing.activeExpressionSelectionEnd ?? input.value.length
    );
    return true;
  };

  if (applySelection()) {
    return;
  }

  requestAnimationFrame(() => {
    applySelection();
  });
}

function patchActiveGraphExpressionInput() {
  const input = document.querySelector(`input[name="graph-expression-${state.graphing.activeExpressionIndex}"]`);
  const expression = state.graphing.expressions[state.graphing.activeExpressionIndex];
  if (!(input instanceof HTMLInputElement) || !expression) {
    return false;
  }

  input.value = expression.value;
  input.focus();
  input.setSelectionRange(
    state.graphing.activeExpressionSelectionStart ?? input.value.length,
    state.graphing.activeExpressionSelectionEnd ?? input.value.length
  );
  return true;
}

function canPatchActiveGraphExpressionInput() {
  const pane = document.querySelector('.graph-expression-pane');
  return pane instanceof HTMLElement && pane.offsetParent !== null && state.graphing.openMenu === null && !state.graphing.settingsOpen;
}

function getGraphCanvas() {
  const canvas = document.getElementById('graph-canvas');
  return canvas instanceof HTMLCanvasElement ? canvas : null;
}

function setGraphCanvasPanningState(isPanning) {
  const canvas = getGraphCanvas();
  if (!canvas) {
    return;
  }

  canvas.classList.toggle('is-panning', isPanning);
}

function getGraphWorldPointFromMouseEvent(event) {
  const canvas = getGraphCanvas();
  if (!canvas) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const { xMin, xMax, yMin, yMax } = state.graphing.viewport;
  const xRatio = (event.clientX - rect.left) / rect.width;
  const yRatio = (event.clientY - rect.top) / rect.height;

  return {
    x: xMin + (xRatio * (xMax - xMin)),
    y: yMax - (yRatio * (yMax - yMin))
  };
}

function stopGraphPan() {
  if (!graphPanSession) {
    return;
  }

  graphPanSession = null;
  setGraphCanvasPanningState(false);
}

function handleGraphMouseMove(event) {
  if (!graphPanSession || state.mode !== 'graphing') {
    return;
  }

  const canvas = getGraphCanvas();
  if (!canvas) {
    stopGraphPan();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const deltaX = event.clientX - graphPanSession.lastClientX;
  const deltaY = event.clientY - graphPanSession.lastClientY;
  if (deltaX === 0 && deltaY === 0) {
    return;
  }

  graphPanSession.lastClientX = event.clientX;
  graphPanSession.lastClientY = event.clientY;

  const { xMin, xMax, yMin, yMax } = state.graphing.viewport;
  const worldDeltaX = -(deltaX / rect.width) * (xMax - xMin);
  const worldDeltaY = (deltaY / rect.height) * (yMax - yMin);
  panGraph(worldDeltaX, worldDeltaY);
  drawGraph();
  event.preventDefault();
}

function handleGraphWheel(event) {
  if (state.mode !== 'graphing') {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest('#graph-canvas')) {
    return;
  }

  if (event.deltaY === 0) {
    return;
  }

  const anchor = getGraphWorldPointFromMouseEvent(event);
  zoomGraph(event.deltaY < 0 ? 'in' : 'out', anchor);
  drawGraph();
  event.preventDefault();
}

function handleMouseDown(event) {
  if (state.mode !== 'graphing') {
    return;
  }

  const graphCanvas = event.target instanceof Element ? event.target.closest('#graph-canvas') : null;
  if (graphCanvas instanceof HTMLCanvasElement && event.button === 0) {
    graphPanSession = {
      lastClientX: event.clientX,
      lastClientY: event.clientY
    };
    setGraphCanvasPanningState(true);
    event.preventDefault();
    return;
  }

  const target = event.target instanceof Element
    ? event.target.closest('button[data-graph-insert], button[data-graph-edit-action]')
    : null;
  if (!target) {
    return;
  }

  event.preventDefault();
}

hydrateState();
applyUrlPreferences();
applyRuntimeAttributes();
applyUrlMode({ replaceHistory: true, renderView: false });
applyTheme();
initFullscreenState();
computeDateResults();
syncConverterValues('from');
render();
installTooltipHandling();
void preloadRemainingThemes();

document.addEventListener('click', handleClick);
document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleGraphMouseMove);
document.addEventListener('mouseup', stopGraphPan);
document.addEventListener('change', handleChange);
document.addEventListener('input', handleInput);
document.addEventListener('focusin', handleFocusIn);
document.addEventListener('keydown', handleKeydown);
document.addEventListener('wheel', handleGraphWheel, { passive: false });
document.addEventListener('selectionchange', () => {
  syncGraphExpressionSelection(document.activeElement);
});
window.addEventListener('resize', handleResize);
window.addEventListener('load', () => drawGraph());
window.addEventListener('popstate', handlePopState);
window.addEventListener('blur', stopGraphPan);
systemThemeMedia?.addEventListener?.('change', () => {
  if (state.settings.theme === 'system') {
    applyTheme();
    render();
  }
});

async function preloadRemainingThemes() {
  try {
    await preloadAllThemes();
    if (shouldRefreshForThemeCatalog()) {
      render();
    }
  } catch (error) {
    console.warn('Unable to preload the full theme catalog.', error);
  }
}

function shouldRefreshForThemeCatalog() {
  return state.mode === 'settings' || (state.mode === 'graphing' && state.graphing.settingsOpen);
}

function getSystemTheme() {
  return systemThemeMedia?.matches === true ? 'light' : 'dark';
}

function applyUrlPreferences() {
  if (urlPreferences.theme === 'system' || isSupportedTheme(urlPreferences.theme)) {
    state.settings.theme = urlPreferences.theme;
  }

  state.settings.language = getCurrentLanguage();
}

function clearUrlPreferenceOverride(paramName) {
  if (typeof paramName !== 'string' || !paramName) {
    return;
  }

  const nextUrl = new URL(window.location.href);
  if (!nextUrl.searchParams.has(paramName)) {
    return;
  }

  nextUrl.searchParams.delete(paramName);
  window.history.replaceState(window.history.state, '', nextUrl);
}

function applyRuntimeAttributes() {
  document.body.dataset.readonly = urlPreferences.readOnly ? 'true' : 'false';
  document.body.dataset.readonlyFrame = urlPreferences.readOnly && window.self !== window.top ? 'true' : 'false';

  appRoot.inert = urlPreferences.readOnly;
}

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
    state.converter.openConverterMenu = null;
    state.converter.converterKeyboardField = 'from';
  }

  if (resolvedMode !== 'settings') {
    state.settings.openMenu = null;
  }

  state.mode = resolvedMode;
  persistPage(state.mode);
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
  const normalizedThemeSetting = state.settings.theme === 'system' || isSupportedTheme(state.settings.theme)
    ? state.settings.theme
    : 'system';

  if (normalizedThemeSetting !== state.settings.theme) {
    state.settings.theme = normalizedThemeSetting;
    persistTheme();
  }

  const effectiveTheme = getResolvedAppThemeId(normalizedThemeSetting, getSystemTheme());
  const appliedTheme = applyThemeToElement(document.documentElement, effectiveTheme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', appliedTheme.metaColor ?? '#1f2025');
  document.querySelector('#app-favicon')?.setAttribute('href', appliedTheme.logoPath ?? 'assets/logo-dark.svg');
}

function applyThemeSetting(theme) {
  state.settings.theme = theme === 'system' || isSupportedTheme(theme)
    ? theme
    : 'system';
  persistTheme();

  // A manual settings change should stop any stale URL override from winning on refresh.
  clearUrlPreferenceOverride('theme');
  applyTheme();
  render();
}

async function applyLanguageChange(language) {
  state.settings.language = language;
  persistLanguage();

  // Language set from settings should persist via storage rather than a one-off URL override.
  clearUrlPreferenceOverride('language');
  await setLanguage(language);
  computeDateResults();
  render();
}

async function applyFullscreenSetting(enabled) {
  const nextValue = await setFullscreenState(enabled);
  updateFullscreenState(nextValue);
  render();
}

function applyRepeatEqualsSetting(enabled) {
  state.settings.repeatEquals = enabled;
  persistRepeatEquals();
  render();
}

function createCalculatorSnapshot() {
  return structuredClone({
    mode: state.mode,
    collections: state.collections,
    standard: state.standard,
    scientific: state.scientific,
    programmer: state.programmer
  });
}

function restoreCalculatorSnapshot(snapshot) {
  state.mode = snapshot.mode;
  state.collections = structuredClone(snapshot.collections);
  state.standard = structuredClone(snapshot.standard);
  state.scientific = structuredClone(snapshot.scientific);
  state.programmer = structuredClone(snapshot.programmer);
  persistCollections();
}

function calculatorSnapshotsMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function commitCalculatorSnapshot(previousSnapshot) {
  if (!previousSnapshot) {
    return false;
  }

  const nextSnapshot = createCalculatorSnapshot();
  if (calculatorSnapshotsMatch(previousSnapshot, nextSnapshot)) {
    return false;
  }

  calculatorUndoStack.push(previousSnapshot);
  if (calculatorUndoStack.length > MAX_CALCULATOR_HISTORY) {
    calculatorUndoStack.shift();
  }
  calculatorRedoStack.length = 0;
  return true;
}

function performTrackedCalculatorAction(action, value = '') {
  if (!isCalculatorMode(state.mode)) {
    return false;
  }

  const snapshot = createCalculatorSnapshot();
  handleAction(action, value);
  return commitCalculatorSnapshot(snapshot);
}

function restorePreviousCalculatorSnapshot() {
  const previousSnapshot = calculatorUndoStack.pop();
  if (!previousSnapshot) {
    return false;
  }

  calculatorRedoStack.push(createCalculatorSnapshot());
  restoreCalculatorSnapshot(previousSnapshot);
  return true;
}

function restoreNextCalculatorSnapshot() {
  const nextSnapshot = calculatorRedoStack.pop();
  if (!nextSnapshot) {
    return false;
  }

  calculatorUndoStack.push(createCalculatorSnapshot());
  restoreCalculatorSnapshot(nextSnapshot);
  return true;
}

function normalizePastedDecimal(text) {
  const trimmed = String(text || '').trim().replace(/\s+/g, '');
  if (!trimmed || !/^[+\-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(trimmed)) {
    return null;
  }

  const normalized = trimmed.replace(',', '.');
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return normalized;
}

function normalizePastedProgrammerValue(text) {
  const trimmed = String(text || '').trim().replace(/\s+/g, '').toUpperCase();
  if (!trimmed) {
    return null;
  }

  const sign = trimmed.startsWith('-') ? '-' : '';
  const digits = sign ? trimmed.slice(1) : trimmed;
  if (!digits) {
    return null;
  }

  const patterns = {
    BIN: /^[01]+$/,
    OCT: /^[0-7]+$/,
    DEC: /^\d+$/,
    HEX: /^[0-9A-F]+$/
  };
  const validator = patterns[state.programmer.base] ?? patterns.DEC;
  return validator.test(digits) ? `${sign}${digits}` : null;
}

function applyPastedCalculatorText(text) {
  if (!isCalculatorMode(state.mode)) {
    return false;
  }

  const snapshot = createCalculatorSnapshot();

  if (state.mode === 'programmer') {
    const normalized = normalizePastedProgrammerValue(text);
    if (!normalized) {
      return false;
    }
    state.programmer = createProgrammerState();
    state.programmer.display = normalized;
    return commitCalculatorSnapshot(snapshot);
  }

  const normalized = normalizePastedDecimal(text);
  if (!normalized) {
    return false;
  }

  if (state.mode === 'scientific') {
    state.scientific = createScientificState();
    state.scientific.display = normalized;
    state.scientific.expression = normalized;
    state.scientific.justEvaluated = true;
    return commitCalculatorSnapshot(snapshot);
  }

  state.standard = createStandardState();
  state.standard.display = normalized;
  return commitCalculatorSnapshot(snapshot);
}

function getCopyableCalculatorValue() {
  if (!isCalculatorMode(state.mode)) {
    return '';
  }

  if (state.mode === 'scientific') {
    return state.scientific.display;
  }
  if (state.mode === 'programmer') {
    return state.programmer.display;
  }
  return state.standard.display;
}

async function copyCalculatorValue() {
  const text = getCopyableCalculatorValue();
  if (!text) {
    return false;
  }

  await navigator.clipboard?.writeText?.(text);
  return true;
}

async function pasteCalculatorValue() {
  const text = await navigator.clipboard?.readText?.();
  return applyPastedCalculatorText(text);
}

function updateFullscreenState(enabled) {
  state.settings.isFullscreen = Boolean(enabled);
}

async function setFullscreenState(enabled) {
  if (typeof fullscreenBridge?.setFullscreen === 'function') {
    return Boolean(await fullscreenBridge.setFullscreen(Boolean(enabled)));
  }

  if (enabled) {
    await document.documentElement.requestFullscreen?.();
  } else if (document.fullscreenElement) {
    await document.exitFullscreen?.();
  }

  return Boolean(document.fullscreenElement);
}

function initFullscreenState() {
  if (typeof fullscreenBridge?.onFullscreenChanged === 'function') {
    fullscreenBridge.onFullscreenChanged((enabled) => {
      updateFullscreenState(enabled);
      if (state.mode === 'settings') {
        render();
      }
    });
  } else {
    document.addEventListener('fullscreenchange', () => {
      updateFullscreenState(Boolean(document.fullscreenElement));
      if (state.mode === 'settings') {
        render();
      }
    });
  }

  if (typeof fullscreenBridge?.getFullscreen === 'function') {
    void fullscreenBridge.getFullscreen().then((enabled) => {
      updateFullscreenState(enabled);
      if (state.mode === 'settings') {
        render();
      }
    });
    return;
  }

  updateFullscreenState(Boolean(document.fullscreenElement));
}

function handleResize() {
  const nextViewportWidth = window.innerWidth;
  const nextViewportHeight = window.innerHeight;
  const widthChanged = Math.abs(nextViewportWidth - lastViewportWidth) > 2;
  const heightChanged = Math.abs(nextViewportHeight - lastViewportHeight) > 2;

  lastViewportWidth = nextViewportWidth;
  lastViewportHeight = nextViewportHeight;

  if (!widthChanged && heightChanged && isTextEntryElement(document.activeElement)) {
    return;
  }

  render();
}

function isTextEntryElement(element) {
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  if (!(element instanceof HTMLInputElement)) {
    return element instanceof HTMLElement && element.isContentEditable;
  }

  return ![
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit'
  ].includes(element.type);
}

function handlePopState() {
  applyUrlMode({ replaceHistory: true });
}

function handleClick(event) {
  if (urlPreferences.readOnly) {
    return;
  }

  const source = event.target instanceof Element ? event.target : null;
  let shouldRender = false;

  if (source && isConverterMode(state.mode) && state.converter.openConverterMenu && !source.closest('.converter-select-wrap')) {
    clearConverterMenuSearch(state.converter.openConverterMenu);
    state.converter.openConverterMenu = null;
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

  if (source && state.mode === 'settings' && state.settings.openMenu && !source.closest('.settings-select-menu-wrap')) {
    state.settings.openMenu = null;
    shouldRender = true;
  }

  if (source && state.mode === 'graphing') {
    if (state.graphing.settingsOpen && !source.closest('.graph-settings-panel, [data-graph-settings-toggle]')) {
      state.graphing.settingsOpen = false;
      state.graphing.settingsMenu = null;
      shouldRender = true;
    }
    if (state.graphing.settingsMenu && !source.closest('.graph-settings-select-wrap')) {
      state.graphing.settingsMenu = null;
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

  const target = source?.closest('button, a[data-set-mode]');
  if (!target) {
    if (shouldRender) {
      render();
    }
    return;
  }

  if (target.dataset.settingsShortcutCapture) {
    beginShortcutCapture(target.dataset.settingsShortcutCapture);
    return;
  }

  if (target.dataset.settingsShortcutReset) {
    const shortcutId = target.dataset.settingsShortcutReset;
    if (APP_SHORTCUT_DEFAULTS[shortcutId]) {
      setShortcutBinding(shortcutId, APP_SHORTCUT_DEFAULTS[shortcutId]);
      if (state.settings.activeShortcutId === shortcutId) {
        clearShortcutCapture();
      }
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
    if (target instanceof HTMLAnchorElement) {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        if (shouldRender) {
          render();
        }
        return;
      }

      event.preventDefault();
    }

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

  if (target.dataset.settingsMenuToggle) {
    const nextMenu = target.dataset.settingsMenuToggle;
    const isOpening = state.settings.openMenu !== nextMenu;
    state.settings.openMenu = isOpening ? nextMenu : null;
    render();
    if (isOpening) {
      requestAnimationFrame(() => {
        const searchInput = document.querySelector(`[data-settings-menu-search="${nextMenu}"]`);
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
        }
      });
    }
    return;
  }

  if (target.dataset.settingsMenuSelect) {
    const menu = target.dataset.settingsMenuSelect;
    const value = target.dataset.settingsMenuValue ?? '';
    state.settings.openMenu = null;

    if (menu === 'theme') {
      applyThemeSetting(value);
      return;
    }

    if (menu === 'language') {
      void applyLanguageChange(value);
      return;
    }
  }

  if (target.dataset.settingsToggle) {
    if (target.dataset.settingsToggle === 'repeatEquals') {
      applyRepeatEqualsSetting(!state.settings.repeatEquals);
      return;
    }

    if (target.dataset.settingsToggle === 'fullscreen') {
      void applyFullscreenSetting(!state.settings.isFullscreen);
      return;
    }
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
    if (isConverterMode(state.mode)) {
      state.converter.converterKeyboardField = target.dataset.converterActiveField;
    }
    render();
    return;
  }

  if (target.dataset.converterMenuToggle) {
    const field = target.dataset.converterMenuToggle;
    const isOpening = state.converter.openConverterMenu !== field;
    clearConverterMenuSearch();
    state.converter.openConverterMenu = isOpening ? field : null;
    state.converter.converterKeyboardField = field;
    setConverterActiveField(field);
    render();
    if (isOpening) {
      focusConverterMenuSearch(field);
    }
    return;
  }

  if (target.dataset.converterOptionSelect) {
    const field = target.dataset.converterOptionSelect;
    const value = target.dataset.converterOptionValue;
    if (!field || !value) {
      return;
    }
    applyConverterSelection(field, value);
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
    setGraphCompactEditorView('expressions');
    selectGraphExpression(Number(target.dataset.graphSelect));
    render();
    return;
  }

  if (target.dataset.graphExpressionVisibility) {
    setGraphCompactEditorView('expressions');
    toggleGraphExpressionVisibility(Number(target.dataset.graphExpressionVisibility));
    drawGraph();
    render();
    return;
  }

  if (target.dataset.graphExpressionRemove) {
    setGraphCompactEditorView('expressions');
    removeGraphExpression(Number(target.dataset.graphExpressionRemove));
    updateGraph();
    render();
    return;
  }

  if (target.dataset.graphExpressionStyle) {
    const index = Number(target.dataset.graphExpressionStyle);
    setGraphCompactEditorView('expressions');
    state.graphing.stylePanelExpressionIndex = state.graphing.stylePanelExpressionIndex === index ? null : index;
    render();
    return;
  }

  if (target.dataset.graphExpressionColor) {
    setGraphCompactEditorView('expressions');
    setGraphExpressionColor(Number(target.dataset.graphExpressionColor), target.dataset.colorValue || '');
    drawGraph();
    render();
    return;
  }

  if (target.dataset.graphExpressionAnalyze) {
    const index = Number(target.dataset.graphExpressionAnalyze);
    setGraphCompactEditorView('expressions');
    commitGraphExpression(index);
    updateGraph();
    openGraphExpressionAnalysis(index);
    render();
    return;
  }

  if (target.dataset.graphAnalysisClose) {
    setGraphCompactEditorView('expressions');
    closeGraphExpressionAnalysis();
    render();
    return;
  }

  if (target.dataset.graphCompactView) {
    setGraphCompactEditorView(target.dataset.graphCompactView);
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
    state.graphing.settingsMenu = null;
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

  if (target.dataset.graphSettingsMenuToggle) {
    const menu = target.dataset.graphSettingsMenuToggle;
    state.graphing.settingsMenu = state.graphing.settingsMenu === menu ? null : menu;
    render();
    return;
  }

  if (target.dataset.graphSettingsMenuSelect) {
    const menu = target.dataset.graphSettingsMenuSelect;
    const value = target.dataset.graphSettingsMenuValue;
    if (!menu || !value) {
      return;
    }

    state.graphing.settingsMenu = null;

    if (menu === 'line-thickness') {
      state.graphing.lineThickness = Number(value) || 2;
      drawGraph();
      render();
      return;
    }

    if (menu === 'theme') {
      state.graphing.theme = normalizeGraphThemeSetting(value);
      drawGraph();
      render();
      return;
    }
  }

  if (target.dataset.graphMenuToggle) {
    const nextMenu = target.dataset.graphMenuToggle;
    setGraphCompactEditorView('keypad');
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
    setGraphCompactEditorView('keypad');
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
    setGraphCompactEditorView('keypad');
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
      render();
      return;
    }
    if (canPatchActiveGraphExpressionInput() && patchActiveGraphExpressionInput()) {
      drawGraph();
    } else {
      render();
      restoreGraphExpressionSelection();
    }
    return;
  }

  if (target.dataset.graphInsert) {
    setGraphCompactEditorView('keypad');
    state.graphing.openMenu = null;
    state.graphing.settingsOpen = false;
    insertGraphToken(target.dataset.graphInsert);
    if (canPatchActiveGraphExpressionInput() && patchActiveGraphExpressionInput()) {
      drawGraph();
    } else {
      updateGraph();
      render();
      restoreGraphExpressionSelection();
    }
    return;
  }

  if (target.dataset.action && target.dataset.action !== 'noop') {
    performTrackedCalculatorAction(target.dataset.action, target.dataset.value || '');
    render();
  }
}

async function updateCurrencyRates() {
  if (state.converter.isUpdatingRates) {
    return;
  }

  state.converter.isUpdatingRates = true;
  state.converter.currencyUpdateMessageKey = 'converter.currency.status.fetching';
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
    state.converter.currencyUpdateMessageKey = 'converter.currency.status.liveRatesLoaded';
  } catch {
    state.converter.currencyRates = buildFallbackCurrencyRates();
    state.converter.currencyUpdatedAt = OFFLINE_CURRENCY_UPDATED_AT;
    state.converter.currencyUpdateMessageKey = 'converter.currency.status.liveUpdateUnavailable';
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
  return { ...DEFAULT_CURRENCY_RATES };
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
  if (urlPreferences.readOnly) {
    return;
  }

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
    applyThemeSetting(target.value);
    return;
  }

  if (target.name === 'settings-language') {
    void applyLanguageChange(target.value);
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
    state.graphing.theme = normalizeGraphThemeSetting(target.value);
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
  if (urlPreferences.readOnly) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.dataset.settingsMenuSearch) {
    const menu = target.closest('.settings-select-menu');
    if (!(menu instanceof HTMLElement)) {
      return;
    }

    const query = target.value.trim().toLowerCase();
    const options = [...menu.querySelectorAll('[data-settings-menu-option]')];
    let visibleOptions = 0;

    for (const option of options) {
      if (!(option instanceof HTMLElement)) {
        continue;
      }

      const searchText = option.dataset.settingsMenuText ?? option.textContent ?? '';
      const matches = query === '' || searchText.includes(query);
      option.hidden = !matches;
      if (matches) {
        visibleOptions += 1;
      }
    }

    const emptyState = menu.querySelector('[data-settings-menu-empty]');
    if (emptyState instanceof HTMLElement) {
      emptyState.hidden = visibleOptions > 0;
    }
    return;
  }

  if (target.dataset.converterMenuSearch) {
    const field = target.dataset.converterMenuSearch;
    if (field === 'from' || field === 'to') {
      setConverterMenuSearchValue(field, target.value);
      state.converter.converterKeyboardField = field;
      render();
      focusConverterMenuSearch(field);
    }
    return;
  }

  if (target.name?.startsWith('graph-expression-')) {
    const index = Number(target.name.replace('graph-expression-', ''));
    setGraphExpression(index, target.value);
    syncGraphExpressionSelection(target);
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
  if (urlPreferences.readOnly) {
    return;
  }

  const target = event.target;
  if (target instanceof HTMLInputElement) {
    if (target.dataset.converterMenuSearch === 'from' || target.dataset.converterMenuSearch === 'to') {
      state.converter.converterKeyboardField = target.dataset.converterMenuSearch;
      return;
    }

    if (target.name?.startsWith('graph-expression-')) {
      selectGraphExpression(Number(target.name.replace('graph-expression-', '')));
      syncGraphExpressionSelection(target);
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

  const currencyToggle = target.closest('[data-converter-menu-toggle]');
  if (currencyToggle instanceof HTMLElement) {
    const field = currencyToggle.dataset.converterMenuToggle;
    if (field === 'from' || field === 'to') {
      state.converter.converterKeyboardField = field;
    }
    return;
  }

  const currencyOption = target.closest('[data-converter-option-select]');
  if (currencyOption instanceof HTMLElement) {
    const field = currencyOption.dataset.converterOptionSelect;
    if (field === 'from' || field === 'to') {
      state.converter.converterKeyboardField = field;
    }
  }
}

function handleKeydown(event) {
  if (urlPreferences.readOnly) {
    return;
  }

  if (handleShortcutCapture(event)) {
    return;
  }

  if (handleConfiguredShortcut(event)) {
    return;
  }

  if (handleConverterDropdownKeydown(event)) {
    return;
  }

  if (isConverterMode(state.mode) && event.key === 'Escape' && state.converter.openConverterMenu) {
    clearConverterMenuSearch(state.converter.openConverterMenu);
    state.converter.openConverterMenu = null;
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

  if (state.mode === 'settings' && event.key === 'Escape' && state.settings.openMenu) {
    state.settings.openMenu = null;
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

  if (state.mode === 'graphing' && event.key === 'Escape' && (state.graphing.settingsOpen || state.graphing.settingsMenu || state.graphing.openMenu)) {
    state.graphing.settingsOpen = false;
    state.graphing.settingsMenu = null;
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
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      return;
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
    performTrackedCalculatorAction('digit', key);
  } else if (state.mode === 'programmer' && /^[a-fA-F]$/.test(key)) {
    performTrackedCalculatorAction('digit', key.toUpperCase());
  } else if (key === '.') {
    performTrackedCalculatorAction('decimal', '.');
  } else if (key === 'Backspace') {
    performTrackedCalculatorAction('backspace', '');
  } else if (key === 'Escape') {
    performTrackedCalculatorAction('clear-all', '');
  } else if (key === 'Enter' || key === '=') {
    performTrackedCalculatorAction('equals', '');
  } else if (['+', '-', '*', '/'].includes(key)) {
    performTrackedCalculatorAction('operator', key);
  } else {
    return;
  }

  event.preventDefault();
  render();
}

function handleConverterDropdownKeydown(event) {
  if (!isConverterMode(state.mode) || event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  const isMenuSearchInput = event.target instanceof HTMLInputElement
    && (event.target.dataset.converterMenuSearch === 'from' || event.target.dataset.converterMenuSearch === 'to');
  const isDropdownTarget = isConverterDropdownTarget(event.target);
  if (!isDropdownTarget && !state.converter.openConverterMenu) {
    return false;
  }

  const field = getConverterKeyboardField(event.target);
  if (!field) {
    return false;
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    moveConverterSelection(field, event.key === 'ArrowDown' ? 1 : -1);
    event.preventDefault();
    render();
    if (isMenuSearchInput) {
      focusConverterMenuSearch(field);
    }
    return true;
  }

  if (isMenuSearchInput) {
    return false;
  }

  if (event.key === 'Home' || event.key === 'End') {
    const options = getConverterDropdownOptions(field);
    if (!options.length) {
      return false;
    }
    const targetIndex = event.key === 'Home' ? 0 : options.length - 1;
    selectConverterByIndex(field, targetIndex, true);
    event.preventDefault();
    render();
    return true;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    const isOpening = state.converter.openConverterMenu !== field;
    clearConverterMenuSearch();
    state.converter.openConverterMenu = isOpening ? field : null;
    state.converter.converterKeyboardField = field;
    event.preventDefault();
    render();
    if (isOpening) {
      focusConverterMenuSearch(field);
    }
    return true;
  }

  if (event.key.length === 1 && /[\p{L}\p{N}]/u.test(event.key)) {
    const match = findConverterTypeaheadMatch(field, event.key);
    if (!match) {
      return false;
    }

    applyConverterSelection(field, match.value, true);
    event.preventDefault();
    render();
    return true;
  }

  return false;
}

function getConverterKeyboardField(target) {
  const element = target instanceof HTMLElement ? target : null;
  const toggle = element?.closest('[data-converter-menu-toggle]');
  if (toggle instanceof HTMLElement) {
    const field = toggle.dataset.converterMenuToggle;
    if (field === 'from' || field === 'to') {
      return field;
    }
  }

  const searchInput = element?.closest('[data-converter-menu-search]');
  if (searchInput instanceof HTMLElement) {
    const field = searchInput.dataset.converterMenuSearch;
    if (field === 'from' || field === 'to') {
      return field;
    }
  }

  const option = element?.closest('[data-converter-option-select]');
  if (option instanceof HTMLElement) {
    const field = option.dataset.converterOptionSelect;
    if (field === 'from' || field === 'to') {
      return field;
    }
  }

  if (state.converter.openConverterMenu === 'from' || state.converter.openConverterMenu === 'to') {
    return state.converter.openConverterMenu;
  }

  return state.converter.converterKeyboardField === 'to' ? 'to' : 'from';
}

function isConverterDropdownTarget(target) {
  const element = target instanceof HTMLElement ? target : null;
  return Boolean(element?.closest('.converter-select-wrap'));
}

function moveConverterSelection(field, direction) {
  const options = getConverterDropdownOptions(field);
  if (!options.length) {
    return;
  }

  const values = options.map((option) => option.value);
  const currentValue = field === 'from' ? state.converter.fromUnit : state.converter.toUnit;
  const currentIndex = Math.max(0, values.indexOf(currentValue));
  const nextIndex = (currentIndex + direction + values.length) % values.length;
  selectConverterByIndex(field, nextIndex, true);
}

function selectConverterByIndex(field, index, keepMenuOpen) {
  const values = getConverterDropdownOptions(field).map((option) => option.value);
  if (!values.length) {
    return;
  }
  const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
  applyConverterSelection(field, values[clampedIndex], keepMenuOpen);
}

function applyConverterSelection(field, value, keepMenuOpen = false) {
  state.converter[field === 'from' ? 'fromUnit' : 'toUnit'] = value;
  state.converter.openConverterMenu = keepMenuOpen ? field : null;
  if (!keepMenuOpen) {
    clearConverterMenuSearch(field);
  }
  state.converter.converterKeyboardField = field;
  setConverterActiveField(field);
  syncConverterValues(field);
  commitConverterHistory();
}

function findConverterTypeaheadMatch(field, key) {
  const now = Date.now();
  if (now - converterTypeaheadTimestamp > CURRENCY_TYPEAHEAD_RESET_MS) {
    converterTypeaheadBuffer = '';
  }

  converterTypeaheadTimestamp = now;
  converterTypeaheadBuffer += key.toLowerCase();

  const options = getConverterDropdownOptions(field);
  const currentValue = field === 'from' ? state.converter.fromUnit : state.converter.toUnit;
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === currentValue));
  const orderedOptions = [...options.slice(currentIndex + 1), ...options.slice(0, currentIndex + 1)];

  return orderedOptions.find((option) => {
    const searchTerms = [option.value, option.label, option.code, option.symbol, option.meta]
      .filter(Boolean)
      .map((term) => term.toLowerCase());

    return searchTerms.some((term) => term.startsWith(converterTypeaheadBuffer))
      || searchTerms.some((term) => term.includes(converterTypeaheadBuffer));
  }) ?? null;
}

function getConverterDropdownOptions(field) {
  const options = state.converter.category === 'Currency'
    ? getCurrencyOptions().map((currency) => {
      const details = getCurrencyDetails(currency.name);
      return {
        value: currency.name,
        label: details.label,
        code: details.code,
        symbol: details.symbol,
        meta: getCurrencyOptionMeta(details)
      };
    })
    : getUnitsForCategory(state.converter.category).map((unit) => ({
      value: unit.name,
      label: getUnitLabel(unit.name),
      code: unit.symbol
    }));

  const searchQuery = getConverterMenuSearchValue(field).trim().toLowerCase();
  if (!searchQuery) {
    return options;
  }

  return options.filter((option) => [option.value, option.label, option.code, option.symbol, option.meta]
    .filter(Boolean)
    .some((term) => String(term).toLowerCase().includes(searchQuery)));
}

function getCurrencyOptionMeta(details) {
  const code = String(details.code || '').trim().toUpperCase();
  const symbol = String(details.symbol || '').trim();
  return symbol && symbol !== code ? `${code} · ${symbol}` : code;
}

function getConverterMenuSearchValue(field) {
  const searchState = getConverterMenuSearchState();
  return searchState[field === 'to' ? 'to' : 'from'] ?? '';
}

function setConverterMenuSearchValue(field, value) {
  const searchState = getConverterMenuSearchState();
  searchState[field === 'to' ? 'to' : 'from'] = value;
}

function clearConverterMenuSearch(field = null) {
  const searchState = getConverterMenuSearchState();
  if (field === 'from' || field === 'to') {
    searchState[field] = '';
    return;
  }

  searchState.from = '';
  searchState.to = '';
}

function getConverterMenuSearchState() {
  if (!state.converter.converterMenuSearch || typeof state.converter.converterMenuSearch !== 'object') {
    state.converter.converterMenuSearch = { from: '', to: '' };
  }

  return state.converter.converterMenuSearch;
}

function focusConverterMenuSearch(field) {
  requestAnimationFrame(() => {
    const input = document.querySelector(`[data-converter-menu-search="${field}"]`);
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const cursorPosition = input.value.length;
    input.focus();
    input.setSelectionRange(cursorPosition, cursorPosition);
  });
}
