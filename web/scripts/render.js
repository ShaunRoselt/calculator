import { MODE_META, MOCK_CURRENCY_NOTE, PROGRAMMER_BUTTONS, SCIENTIFIC_BUTTONS, STANDARD_BUTTONS, UNIT_CATEGORIES } from './config.js';
import { state } from './state.js';
import { appRoot } from './dom.js';
import { escapeHtml, formatExpressionForDisplay } from './utils.js';
import { drawGraph, getProgrammerCurrentValue, formatBigInt, getUnitsForCategory, isCalculatorMode, isProgrammerDigitAllowed, isSidePanelVisible } from './logic.js';

export function render() {
  const sidePanelVisible = isSidePanelVisible();
  appRoot.innerHTML = `
    <div class="desktop-shell">
      <div class="app-shell ${state.navOpen ? 'nav-open' : ''}">
        ${renderWindowChrome()}
        <div class="window-body">
          ${renderSidebar()}
          <main class="main">
            ${renderTopbar()}
            <div class="workspace ${sidePanelVisible ? 'with-side-panel' : 'single'}">
              <section class="panel main-panel">
                ${renderMainPanel()}
              </section>
              ${sidePanelVisible ? renderSidePanel() : ''}
            </div>
          </main>
        </div>
      </div>
    </div>
  `;
  drawGraph();
}

function renderWindowChrome() {
  return `
    <header class="window-chrome">
      <div class="window-brand">
        <img class="window-brand-icon" src="/src/Calculator/Assets/CalculatorAppList.targetsize-32_altform-unplated.png" alt="" />
        <span>Calculator</span>
      </div>
      <div class="window-controls" aria-hidden="true">
        <button class="window-control" tabindex="-1">${renderWindowControlIcon('minimize')}</button>
        <button class="window-control" tabindex="-1">${renderWindowControlIcon('maximize')}</button>
        <button class="window-control close" tabindex="-1">${renderWindowControlIcon('close')}</button>
      </div>
    </header>
  `;
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-copy">
          <h1>Calculator</h1>
          <p>Navigation</p>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${Object.entries(MODE_META).map(([mode, meta]) => `
          <button class="nav-button ${state.mode === mode ? 'active' : ''}" data-set-mode="${mode}">
            <span>${meta.icon}</span>
            <span>${meta.label}</span>
          </button>
        `).join('')}
      </nav>
    </aside>
  `;
}

function renderTopbar() {
  const meta = MODE_META[state.mode];
  return `
    <header class="topbar ${isCalculatorMode(state.mode) ? 'calculator-topbar' : ''}">
      <div class="topbar-title">
        <button class="icon-button nav-toggle" data-nav-toggle="true" aria-label="Open navigation">${renderToolbarIcon('menu')}</button>
        <div class="mode-title-group">
          <h2>${meta.label}</h2>
          ${state.mode === 'standard' ? `<span class="mode-glyph" aria-hidden="true">${renderToolbarIcon('standard')}</span>` : ''}
        </div>
      </div>
      <div class="topbar-actions">
        ${isCalculatorMode(state.mode) ? `<button class="icon-button history-toggle ${state.historyOpen ? 'active' : ''}" data-toggle-panel="history" aria-label="Toggle history">${renderToolbarIcon('history')}</button>` : ''}
      </div>
    </header>
  `;
}

function renderAngleToggle() {
  return `
    <div class="inline-toolbar">
      ${['DEG', 'RAD'].map((angle) => `
        <button class="angle-toggle ${state.scientific.angle === angle ? 'active' : ''}" data-action="set-angle" data-value="${angle}">${angle}</button>
      `).join('')}
    </div>
  `;
}

function renderBaseToolbar() {
  return `
    <div class="base-toolbar">
      ${['HEX', 'DEC', 'OCT', 'BIN'].map((base) => `
        <button class="base-button ${state.programmer.base === base ? 'active' : ''}" data-action="set-base" data-value="${base}">${base}</button>
      `).join('')}
    </div>
  `;
}

function renderMainPanel() {
  switch (state.mode) {
    case 'standard':
    case 'scientific':
    case 'programmer':
      return renderCalculatorPanel(state.mode);
    case 'date':
      return renderDatePanel();
    case 'converter':
      return renderConverterPanel();
    case 'graphing':
      return renderGraphingPanel();
    default:
      return '';
  }
}

function renderCalculatorPanel(mode) {
  const calc = state[mode];
  const buttons = mode === 'standard' ? STANDARD_BUTTONS : mode === 'scientific' ? SCIENTIFIC_BUTTONS : PROGRAMMER_BUTTONS;
  return `
    <div class="calculator-layout">
      ${mode === 'scientific' ? `<div class="calculator-toolbar">${renderAngleToggle()}</div>` : ''}
      ${mode === 'programmer' ? `<div class="calculator-toolbar">${renderBaseToolbar()}</div>` : ''}
      <div class="display-panel">
        <div class="display-expression">${formatExpressionForDisplay(calc.expression) || '&nbsp;'}</div>
        <div class="display-value">${escapeHtml(calc.display)}</div>
      </div>
      ${mode === 'programmer' ? renderProgrammerReadouts() : ''}
      <div class="memory-toolbar">
        ${renderMemoryToolbar()}
      </div>
      <div class="button-grid ${mode}">
        ${buttons.flat().map((button) => renderCalcButton(button, mode)).join('')}
      </div>
    </div>
  `;
}

function renderCalcButton(button, mode) {
  const disabled = mode === 'programmer' && button.action === 'digit' && !isProgrammerDigitAllowed(button.value, state.programmer.base);
  return `
    <button
      class="calc-button ${button.tone || ''} ${disabled ? 'disabled' : ''}"
      data-action="${button.action}"
      data-value="${button.value ?? ''}"
      ${disabled ? 'disabled' : ''}
    >${renderCalcButtonLabel(button)}</button>
  `;
}

function renderMemoryToolbar() {
  const memoryEmpty = state.memory.length === 0;
  return [
    renderMemoryButton('mc', 'MC', memoryEmpty),
    renderMemoryButton('mr', 'MR', memoryEmpty),
    renderMemoryButton('m+', 'M+'),
    renderMemoryButton('m-', 'M−'),
    renderMemoryButton('ms', 'MS'),
    `<button class="${memoryEmpty ? 'disabled' : ''}" data-toggle-panel="memory" ${memoryEmpty ? 'disabled' : ''}>M<span class="memory-caret">⌄</span></button>`
  ].join('');
}

function renderMemoryButton(op, label, disabled = false) {
  return `<button class="${disabled ? 'disabled' : ''}" data-memory-op="${op}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function renderCalcButtonLabel(button) {
  if (button.action === 'backspace') {
    return renderToolbarIcon('backspace');
  }
  return button.label;
}

function renderProgrammerReadouts() {
  const value = getProgrammerCurrentValue();
  const reads = {
    HEX: formatBigInt(value, 'HEX'),
    DEC: formatBigInt(value, 'DEC'),
    OCT: formatBigInt(value, 'OCT'),
    BIN: formatBigInt(value, 'BIN')
  };
  return `
    <div class="programmer-readouts">
      ${Object.entries(reads).map(([base, output]) => `
        <div class="readout-card">
          <div class="meta-label">${base}</div>
          <strong>${escapeHtml(output)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSidePanel() {
  return `
    <aside class="panel side-panel">
      <div class="side-tabs">
        <button class="tab-button ${state.historyTab === 'history' ? 'active' : ''}" data-toggle-panel="history">History</button>
        <button class="tab-button ${state.historyTab === 'memory' ? 'active' : ''}" data-toggle-panel="memory">Memory</button>
      </div>
      <div class="side-body">
        ${state.historyTab === 'history' ? renderHistoryList() : renderMemoryList()}
      </div>
    </aside>
  `;
}

function renderHistoryList() {
  if (!state.history.length) {
    return `<div class="side-empty">There's no history yet.</div>`;
  }
  return `
    <div class="history-list">
      ${state.history.map((entry, index) => `
        <button class="history-entry" data-history-index="${index}">
          <div class="history-expression">${escapeHtml(entry.modeLabel)} · ${escapeHtml(entry.expression)}</div>
          <div class="history-result">${escapeHtml(entry.result)}</div>
        </button>
      `).join('')}
    </div>
    <div class="side-footer">
      <button class="history-clear" data-history-clear="true">Clear history</button>
    </div>
  `;
}

function renderMemoryList() {
  if (!state.memory.length) {
    return `<div class="side-empty">Memory is empty.</div>`;
  }
  return `
    <div class="memory-list">
      ${state.memory.map((entry, index) => `
        <div class="memory-entry">
          <div class="memory-entry-row">
            <div>
              <div class="memory-label">Stored value</div>
              <div class="memory-value">${escapeHtml(entry.value)}</div>
            </div>
            <div class="inline-toolbar">
              <button class="memory-action" data-memory-recall="${index}">MR</button>
              <button class="memory-action" data-memory-delete="${index}">✕</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="side-footer">
      <button class="memory-clear" data-memory-clear="true">Clear memory</button>
    </div>
  `;
}

function renderDatePanel() {
  const result = state.date.result;
  return `
    <div class="form-section">
      <div class="section-header">
        <div>
          <div class="subtitle">Two built-in workflows</div>
          <h3>Date calculation</h3>
        </div>
        <div class="form-toolbar">
          <button class="chip-button ${state.date.mode === 'difference' ? 'active' : ''}" data-date-mode="difference">Difference</button>
          <button class="chip-button ${state.date.mode === 'shift' ? 'active' : ''}" data-date-mode="shift">Add / subtract</button>
        </div>
      </div>
      <div class="date-grid">
        ${state.date.mode === 'difference' ? `
          <label class="label-stack">
            <span>From</span>
            <input type="date" name="date-from" value="${state.date.from}" />
          </label>
          <label class="label-stack">
            <span>To</span>
            <input type="date" name="date-to" value="${state.date.to}" />
          </label>
          <div class="stats-grid full">
            <div class="stat-card">
              <div class="meta-label">Total days</div>
              <strong>${result?.totalDays ?? 0}</strong>
            </div>
            <div class="stat-card">
              <div class="meta-label">Difference</div>
              <strong>${result?.summary ?? '0 days'}</strong>
            </div>
            <div class="stat-card">
              <div class="meta-label">Direction</div>
              <strong>${result?.direction ?? 'Same day'}</strong>
            </div>
          </div>
        ` : `
          <label class="label-stack full">
            <span>Starting date</span>
            <input type="date" name="date-baseDate" value="${state.date.baseDate}" />
          </label>
          <label class="label-stack">
            <span>Years</span>
            <input type="number" step="1" name="date-years" value="${state.date.years}" />
          </label>
          <label class="label-stack">
            <span>Months</span>
            <input type="number" step="1" name="date-months" value="${state.date.months}" />
          </label>
          <label class="label-stack">
            <span>Days</span>
            <input type="number" step="1" name="date-days" value="${state.date.days}" />
          </label>
          <label class="label-stack">
            <span>Operation</span>
            <select name="date-operation">
              <option value="add" ${state.date.operation === 'add' ? 'selected' : ''}>Add</option>
              <option value="subtract" ${state.date.operation === 'subtract' ? 'selected' : ''}>Subtract</option>
            </select>
          </label>
          <div class="result-card full">
            <div class="meta-label">Resulting date</div>
            <strong>${result?.summary ?? '--'}</strong>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderConverterPanel() {
  const units = getUnitsForCategory(state.converter.category);
  return `
    <div class="form-section">
      <div class="section-header">
        <div>
          <div class="subtitle">Built-in converter collections</div>
          <h3>Unit converter</h3>
        </div>
      </div>
      ${state.converter.category === 'Currency' ? `<div class="currency-banner">${MOCK_CURRENCY_NOTE}</div>` : ''}
      <div class="converter-grid">
        <label class="label-stack full">
          <span>Category</span>
          <select name="converter-category">
            ${Object.keys(UNIT_CATEGORIES).map((category) => `<option value="${category}" ${state.converter.category === category ? 'selected' : ''}>${category}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>From</span>
          <select name="converter-fromUnit">
            ${units.map((unitOption) => `<option value="${unitOption.name}" ${state.converter.fromUnit === unitOption.name ? 'selected' : ''}>${unitOption.name}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>To</span>
          <select name="converter-toUnit">
            ${units.map((unitOption) => `<option value="${unitOption.name}" ${state.converter.toUnit === unitOption.name ? 'selected' : ''}>${unitOption.name}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>Input value</span>
          <input type="number" name="converter-fromValue" value="${state.converter.fromValue}" step="any" />
        </label>
        <div class="label-stack">
          <span>Converted value</span>
          <div class="value-output converter-output">${escapeHtml(state.converter.toValue || '0')}</div>
        </div>
        <div class="full converter-swap">
          <button class="aux-button" data-converter-swap="true">Swap units</button>
        </div>
      </div>
    </div>
  `;
}

function renderGraphingPanel() {
  return `
    <div class="form-section">
      <div class="section-header">
        <div>
          <div class="subtitle">A lightweight graphing companion</div>
          <h3>Graphing calculator</h3>
        </div>
      </div>
      <div class="info-banner">Use x in your expression, for example <strong>sin(x)</strong>, <strong>x^2</strong>, or <strong>sqrt(abs(x))</strong>.</div>
      <div class="graph-form">
        <input type="text" name="graph-expression" value="${escapeHtml(state.graphing.expression)}" />
        <button class="graph-button" data-graph-plot="true">Plot</button>
      </div>
      <p class="helper-text">${escapeHtml(state.graphing.status)}</p>
      <canvas id="graph-canvas" class="graph-canvas" width="1200" height="640" aria-label="Graph canvas"></canvas>
    </div>
  `;
}

function renderWindowControlIcon(kind) {
  if (kind === 'minimize') {
    return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5h8" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="1.1"/></svg>';
  }
  if (kind === 'maximize') {
    return '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.25" y="2.25" width="7.5" height="7.5" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
  }
  return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 2.2l7.6 7.6M9.8 2.2l-7.6 7.6" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="1.1"/></svg>';
}

function renderToolbarIcon(kind) {
  if (kind === 'menu') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.75h16M4 12h16M4 17.25h16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';
  }
  if (kind === 'history') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.75 8.5A8.5 8.5 0 1 1 12 20.5a8.47 8.47 0 0 1-6.01-2.49M4.75 4.75V9.5h4.75M12 7v5l3 1.75" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg>';
  }
  if (kind === 'standard') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.5A2 2 0 0 1 6.5 4.5h7a2 2 0 0 1 2 2v7m-11 6 6.5-6.5M11 19.5H4.5V13m7.5-8.5h7.5v7.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/></svg>';
  }
  if (kind === 'backspace') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8L4 12l6-5Zm2.5 3 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.55"/></svg>';
  }
  return '';
}
