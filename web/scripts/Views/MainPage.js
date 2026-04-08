import { MODE_META, NAVIGATION_GROUPS } from '../config.js';
import { appRoot } from '../dom.js';
import { drawGraph, isCalculatorMode, isSidePanelVisible, supportsHistoryPanelMode, supportsMemoryPanelMode } from '../logic.js';
import { state } from '../state.js';
import { prepareTooltipTargets } from '../tooltip.js';
import { renderCalculatorView } from './Calculator.js';
import { renderDateCalculatorView } from './DateCalculator.js';
import { renderGraphingCalculatorView } from './GraphingCalculator/GraphingCalculator.js';
import { renderHistoryList } from './HistoryList.js';
import { renderMemoryList } from './Memory.js';
import { renderSettingsView } from './Settings.js';
import { renderNavIcon, renderToolbarIcon } from './ViewIcons.js';
import { renderUnitConverterView } from './UnitConverter.js';

export function render() {
  const layoutMode = getLayoutMode();
  const sidePanelVisible = isSidePanelVisible();
  appRoot.innerHTML = `
    <div class="desktop-shell">
      <div class="app-shell layout-${layoutMode} ${state.navOpen ? 'nav-open' : ''} ${sidePanelVisible ? 'history-open' : ''}">
        <div class="window-body">
          ${state.navOpen ? `<button class="surface-scrim" data-close-surface="nav" aria-label="Close navigation"></button>` : ''}
          ${sidePanelVisible && layoutMode !== 'desktop' ? `<button class="surface-scrim panel-scrim" data-close-surface="panel" aria-label="Close side panel"></button>` : ''}
          ${renderNavigationView()}
          <main class="main">
            ${renderHeader()}
            <div class="workspace ${sidePanelVisible ? 'with-side-panel' : 'single'}">
              <section class="panel main-panel">
                ${renderMainContent()}
              </section>
              ${sidePanelVisible ? renderSidePanel() : ''}
            </div>
          </main>
        </div>
      </div>
    </div>
  `;
  prepareTooltipTargets(appRoot);
  syncConverterMenuScroll();
  drawGraph();
}

function syncConverterMenuScroll() {
  requestAnimationFrame(() => {
    const selectedOption = appRoot.querySelector('.converter-select-option.selected');
    const menu = selectedOption?.closest('.converter-select-menu');
    if (!(selectedOption instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
      return;
    }

    const centeredTop = selectedOption.offsetTop - ((menu.clientHeight - selectedOption.offsetHeight) / 2);
    menu.scrollTop = Math.max(0, centeredTop);
  });
}

function renderNavigationView() {
  return `
    <aside class="sidebar" aria-label="Calculator navigation">
      <div class="sidebar-header">
        <button class="icon-button nav-drawer-toggle" data-nav-toggle="true" aria-label="Close navigation">${renderToolbarIcon('menu')}</button>
      </div>
      <nav class="sidebar-nav">
        ${NAVIGATION_GROUPS.map((group) => `
          <div class="nav-group">
            <div class="nav-group-label">${group.label}</div>
            <div class="nav-group-items">
              ${group.modes.map((mode) => {
                const meta = MODE_META[mode];
                return `
                  <button class="nav-button ${state.mode === mode ? 'active' : ''}" data-set-mode="${mode}">
                    <span class="nav-icon">${renderNavIcon(meta.icon)}</span>
                    <span class="nav-label">${meta.label}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </nav>
      <div class="nav-footer">
        <button class="nav-button ${state.mode === 'settings' ? 'active' : ''}" data-set-mode="settings">
          <span class="nav-icon">${renderNavIcon(MODE_META.settings.icon)}</span>
          <span class="nav-label">${MODE_META.settings.label}</span>
        </button>
      </div>
    </aside>
  `;
}

function renderHeader() {
  const meta = MODE_META[state.mode];
  const isGraphingCompact = state.mode === 'graphing' && window.innerWidth < 768;
  const showDesktopSidePanel = getLayoutMode() === 'desktop' && isSidePanelVisible();
  const canOpenHistoryPanel = supportsHistoryPanelMode(state.mode);
  const navButton = state.mode === 'settings'
    ? `<button class="icon-button nav-toggle" data-settings-back="true" data-tooltip="Back" aria-label="Back">${renderToolbarIcon('back')}</button>`
    : `<button class="icon-button nav-toggle" data-nav-toggle="true" aria-label="Open navigation">${renderToolbarIcon('menu')}</button>`;
  const graphingActions = isGraphingCompact
    ? `
      <div class="graph-view-toggle-group" role="group" aria-label="Graphing mobile view">
        <button class="icon-button graph-view-toggle ${state.graphing.mobileView === 'graph' ? 'active' : ''}" data-graph-view="graph" aria-label="Show graph">${renderToolbarIcon('graph-view')}</button>
        <button class="icon-button graph-view-toggle ${state.graphing.mobileView === 'editor' ? 'active' : ''}" data-graph-view="editor" aria-label="Show expressions">${renderToolbarIcon('expressions-view')}</button>
      </div>
    `
    : '';
  const historyAutomationName = state.historyOpen ? 'Close history flyout' : 'Open history flyout';
  return `
    <header class="topbar ${isCalculatorMode(state.mode) ? 'calculator-topbar' : ''}">
      <div class="topbar-title">
        ${navButton}
        <div class="mode-title-group">
          <div class="mode-caption">Calculator</div>
          <div class="mode-title-row">
            <h2>${meta.label}</h2>
          </div>
        </div>
      </div>
      <div class="topbar-actions">
        ${graphingActions}
        ${canOpenHistoryPanel && !showDesktopSidePanel ? `<button class="icon-button history-toggle ${state.historyOpen ? 'active' : ''}" data-toggle-panel="history" data-tooltip="History" aria-label="${historyAutomationName}">${renderToolbarIcon('history')}</button>` : ''}
      </div>
    </header>
  `;
}

function renderMainContent() {
  switch (state.mode) {
    case 'standard':
    case 'scientific':
    case 'programmer':
      return renderCalculatorView(state.mode);
    case 'date':
      return renderDateCalculatorView();
    case 'currency':
    case 'volume':
    case 'length':
    case 'weight':
    case 'temperature':
    case 'energy':
    case 'area':
    case 'speed':
    case 'time':
    case 'power':
    case 'data':
    case 'pressure':
    case 'angle':
    case 'converter':
      return renderUnitConverterView();
    case 'graphing':
      return renderGraphingCalculatorView();
    case 'settings':
      return renderSettingsView();
    default:
      return '';
  }
}

function renderSidePanel() {
  const overlay = getLayoutMode() !== 'desktop';
  const hasMemoryPanel = supportsMemoryPanelMode(state.mode);
  const title = hasMemoryPanel ? 'History &amp; Memory' : 'History';
  return `
    <aside class="panel side-panel ${overlay ? 'overlay' : ''}" aria-label="${hasMemoryPanel ? 'History and memory panel' : 'History panel'}">
      <div class="side-panel-header">
        <div class="side-panel-title">${title}</div>
        ${overlay ? `<button class="icon-button side-panel-close" data-close-surface="panel" aria-label="Close side panel">${renderToolbarIcon('dismiss')}</button>` : ''}
      </div>
      <div class="side-tabs">
        <button class="tab-button ${state.historyTab === 'history' ? 'active' : ''}" data-history-tab="history">History</button>
        ${hasMemoryPanel ? `<button class="tab-button ${state.historyTab === 'memory' ? 'active' : ''}" data-history-tab="memory">Memory</button>` : ''}
      </div>
      <div class="side-body">
        ${!hasMemoryPanel || state.historyTab === 'history' ? renderHistoryList() : renderMemoryList()}
      </div>
    </aside>
  `;
}

export function getLayoutMode() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width < 768) {
    return 'mobile';
  }
  if (width >= 980 || (width >= 900 && height <= 560)) {
    return 'desktop';
  }
  if (width < 1280) {
    return 'tablet';
  }
  return 'desktop';
}
