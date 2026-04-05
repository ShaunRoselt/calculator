import { MODE_META, MOCK_CURRENCY_NOTE, PROGRAMMER_BUTTONS, SCIENTIFIC_BUTTONS, STANDARD_BUTTONS, UNIT_CATEGORIES } from './config.js';
import { state } from './state.js';
import { appRoot } from './dom.js';
import { escapeHtml, formatExpressionForDisplay } from './utils.js';
import { drawGraph, getProgrammerCurrentValue, formatBigInt, getUnitsForCategory, isProgrammerDigitAllowed, isSidePanelVisible } from './logic.js';

export function render() {
  appRoot.innerHTML = `
    <div class="app-shell ${state.navOpen ? 'nav-open' : ''}">
      ${renderSidebar()}
      <main class="main">
        ${renderTopbar()}
        <div class="workspace ${isSidePanelVisible() ? '' : 'single'}">
          <section class="panel main-panel">
            ${renderMainPanel()}
          </section>
          ${isSidePanelVisible() ? renderSidePanel() : ''}
        </div>
      </main>
    </div>
  `;
  drawGraph();
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-main">
          <div class="brand-icon">＋</div>
          <div class="brand-copy">
            <h1>Windows Calculator</h1>
            <p>Standalone web edition</p>
          </div>
        </div>
        <button class="nav-toggle" data-nav-toggle="true" aria-label="Toggle navigation">☰</button>
      </div>
      <div class="sidebar-section-title">Modes</div>
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
    <header class="topbar">
      <div class="topbar-title">
        <div class="subtitle">${meta.subtitle}</div>
        <h2>${meta.label}</h2>
      </div>
      <div class="topbar-actions">
        ${state.mode === 'scientific' ? renderAngleToggle() : ''}
        ${state.mode === 'programmer' ? renderBaseToolbar() : ''}
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
      <div class="mode-banner">Faithful Windows-inspired layout with keyboard shortcuts, history, memory, and responsive states.</div>
      <div class="display-panel">
        <div class="memory-toolbar">
          ${['mc', 'mr', 'm+', 'm-', 'ms'].map((op) => `<button data-memory-op="${op}">${op.toUpperCase()}</button>`).join('')}
        </div>
        <div class="display-expression">${formatExpressionForDisplay(calc.expression) || '&nbsp;'}</div>
        <div class="display-value">${escapeHtml(calc.display)}</div>
      </div>
      ${mode === 'programmer' ? renderProgrammerReadouts() : ''}
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
    >${button.label}</button>
  `;
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
        <button class="tab-button ${state.historyTab === 'history' ? 'active' : ''}" data-history-tab="history">History</button>
        <button class="tab-button ${state.historyTab === 'memory' ? 'active' : ''}" data-history-tab="memory">Memory</button>
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
