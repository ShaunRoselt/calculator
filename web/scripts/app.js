
const STORAGE_KEYS = {
  history: 'windows-calculator-web-history',
  memory: 'windows-calculator-web-memory',
  nav: 'windows-calculator-web-nav'
};

const MODE_META = {
  standard: { label: 'Standard', icon: '🧮', subtitle: 'Classic immediate evaluation' },
  scientific: { label: 'Scientific', icon: 'ƒ', subtitle: 'Operators, functions, and expression support' },
  programmer: { label: 'Programmer', icon: '⌨', subtitle: 'Integer math with base conversion' },
  date: { label: 'Date Calculation', icon: '📅', subtitle: 'Find durations and shift dates' },
  converter: { label: 'Unit Converter', icon: '⇄', subtitle: 'Convert units and mock currencies' },
  graphing: { label: 'Graphing', icon: '📈', subtitle: 'Plot a simple expression on a cartesian plane' }
};

const STANDARD_BUTTONS = [
  [btn('%', 'percent', '', 'function'), btn('CE', 'clear-entry', '', 'function'), btn('C', 'clear-all', '', 'function'), btn('⌫', 'backspace', '', 'function')],
  [btn('1/x', 'standard-unary', 'reciprocal', 'function'), btn('x²', 'standard-unary', 'square', 'function'), btn('√x', 'standard-unary', 'sqrt', 'function'), btn('÷', 'operator', '/', 'operator')],
  [btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('×', 'operator', '*', 'operator')],
  [btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('−', 'operator', '-', 'operator')],
  [btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('+', 'operator', '+', 'operator')],
  [btn('±', 'negate', ''), btn('0', 'digit', '0'), btn('.', 'decimal', '.'), btn('=', 'equals', '', 'equals')]
];

const SCIENTIFIC_BUTTONS = [
  [btn('2ⁿᵈ', 'noop', '', 'function'), btn('π', 'constant', 'pi', 'function'), btn('e', 'constant', 'e', 'function'), btn('(', 'paren', '(' , 'function'), btn(')', 'paren', ')', 'function')],
  [btn('x²', 'scientific-unary', 'square', 'function'), btn('x³', 'scientific-unary', 'cube', 'function'), btn('xʸ', 'operator', '^', 'operator'), btn('10ˣ', 'scientific-unary', 'pow10', 'function'), btn('÷', 'operator', '/', 'operator')],
  [btn('√x', 'scientific-unary', 'sqrt', 'function'), btn('∛x', 'scientific-unary', 'cbrt', 'function'), btn('x!', 'scientific-unary', 'factorial', 'function'), btn('mod', 'operator', 'mod', 'operator'), btn('×', 'operator', '*', 'operator')],
  [btn('sin', 'scientific-unary', 'sin', 'function'), btn('cos', 'scientific-unary', 'cos', 'function'), btn('tan', 'scientific-unary', 'tan', 'function'), btn('ln', 'scientific-unary', 'ln', 'function'), btn('−', 'operator', '-', 'operator')],
  [btn('log', 'scientific-unary', 'log', 'function'), btn('exp', 'scientific-unary', 'exp', 'function'), btn('1/x', 'scientific-unary', 'reciprocal', 'function'), btn('C', 'clear-all', '', 'function'), btn('+', 'operator', '+', 'operator')],
  [btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('CE', 'clear-entry', '', 'function'), btn('⌫', 'backspace', '', 'function')],
  [btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('±', 'negate', ''), btn('=', 'equals', '', 'equals')],
  [btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('.', 'decimal', '.'), btn('0', 'digit', '0')]
];

const PROGRAMMER_BUTTONS = [
  [btn('A', 'digit', 'A'), btn('B', 'digit', 'B'), btn('C', 'digit', 'C'), btn('D', 'digit', 'D'), btn('E', 'digit', 'E')],
  [btn('F', 'digit', 'F'), btn('AND', 'operator', 'and', 'operator'), btn('OR', 'operator', 'or', 'operator'), btn('XOR', 'operator', 'xor', 'operator'), btn('NOT', 'programmer-unary', 'not', 'function')],
  [btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('<<', 'operator', 'lsh', 'operator'), btn('>>', 'operator', 'rsh', 'operator')],
  [btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('mod', 'operator', 'mod', 'operator'), btn('÷', 'operator', '/', 'operator')],
  [btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('×', 'operator', '*', 'operator'), btn('−', 'operator', '-', 'operator')],
  [btn('±', 'negate', ''), btn('0', 'digit', '0'), btn('⌫', 'backspace', '', 'function'), btn('C', 'clear-all', '', 'function'), btn('+', 'operator', '+', 'operator')],
  [btn('CE', 'clear-entry', '', 'function'), btn('=', 'equals', '', 'equals')]
];

const UNIT_CATEGORIES = {
  Length: [
    unit('Meter', 'm', (v) => v, (v) => v),
    unit('Kilometer', 'km', (v) => v * 1000, (v) => v / 1000),
    unit('Centimeter', 'cm', (v) => v / 100, (v) => v * 100),
    unit('Mile', 'mi', (v) => v * 1609.344, (v) => v / 1609.344),
    unit('Foot', 'ft', (v) => v * 0.3048, (v) => v / 0.3048),
    unit('Inch', 'in', (v) => v * 0.0254, (v) => v / 0.0254)
  ],
  Mass: [
    unit('Kilogram', 'kg', (v) => v, (v) => v),
    unit('Gram', 'g', (v) => v / 1000, (v) => v * 1000),
    unit('Pound', 'lb', (v) => v * 0.45359237, (v) => v / 0.45359237),
    unit('Ounce', 'oz', (v) => v * 0.028349523125, (v) => v / 0.028349523125),
    unit('Metric Ton', 't', (v) => v * 1000, (v) => v / 1000)
  ],
  Temperature: [
    unit('Celsius', '°C', (v) => v, (v) => v),
    unit('Fahrenheit', '°F', (v) => (v - 32) * 5 / 9, (v) => (v * 9 / 5) + 32),
    unit('Kelvin', 'K', (v) => v - 273.15, (v) => v + 273.15)
  ],
  Volume: [
    unit('Liter', 'L', (v) => v, (v) => v),
    unit('Milliliter', 'mL', (v) => v / 1000, (v) => v * 1000),
    unit('US Gallon', 'gal', (v) => v * 3.785411784, (v) => v / 3.785411784),
    unit('US Pint', 'pt', (v) => v * 0.473176473, (v) => v / 0.473176473),
    unit('Cubic Meter', 'm³', (v) => v * 1000, (v) => v / 1000)
  ],
  Area: [
    unit('Square Meter', 'm²', (v) => v, (v) => v),
    unit('Square Kilometer', 'km²', (v) => v * 1_000_000, (v) => v / 1_000_000),
    unit('Square Foot', 'ft²', (v) => v * 0.09290304, (v) => v / 0.09290304),
    unit('Acre', 'ac', (v) => v * 4046.8564224, (v) => v / 4046.8564224)
  ],
  Speed: [
    unit('Meters per second', 'm/s', (v) => v, (v) => v),
    unit('Kilometers per hour', 'km/h', (v) => v / 3.6, (v) => v * 3.6),
    unit('Miles per hour', 'mph', (v) => v * 0.44704, (v) => v / 0.44704),
    unit('Knot', 'kn', (v) => v * 0.514444, (v) => v / 0.514444)
  ],
  Energy: [
    unit('Joule', 'J', (v) => v, (v) => v),
    unit('Kilojoule', 'kJ', (v) => v * 1000, (v) => v / 1000),
    unit('Calorie', 'cal', (v) => v * 4.184, (v) => v / 4.184),
    unit('Kilowatt hour', 'kWh', (v) => v * 3_600_000, (v) => v / 3_600_000)
  ],
  Data: [
    unit('Byte', 'B', (v) => v, (v) => v),
    unit('Kilobyte', 'KB', (v) => v * 1024, (v) => v / 1024),
    unit('Megabyte', 'MB', (v) => v * 1024 ** 2, (v) => v / 1024 ** 2),
    unit('Gigabyte', 'GB', (v) => v * 1024 ** 3, (v) => v / 1024 ** 3),
    unit('Bit', 'bit', (v) => v / 8, (v) => v * 8)
  ],
  Time: [
    unit('Second', 's', (v) => v, (v) => v),
    unit('Minute', 'min', (v) => v * 60, (v) => v / 60),
    unit('Hour', 'h', (v) => v * 3600, (v) => v / 3600),
    unit('Day', 'd', (v) => v * 86400, (v) => v / 86400),
    unit('Week', 'wk', (v) => v * 604800, (v) => v / 604800)
  ],
  Currency: [
    unit('US Dollar', 'USD', (v) => v, (v) => v),
    unit('Euro', 'EUR', (v) => v / 0.92, (v) => v * 0.92),
    unit('British Pound', 'GBP', (v) => v / 0.78, (v) => v * 0.78),
    unit('Japanese Yen', 'JPY', (v) => v / 151.24, (v) => v * 151.24),
    unit('Canadian Dollar', 'CAD', (v) => v / 1.35, (v) => v * 1.35)
  ]
};

const state = createInitialState();
const appRoot = document.querySelector('#app');

hydrateState();
computeDateResults();
syncConverterValues('from');
render();

document.addEventListener('click', handleClick);
document.addEventListener('change', handleChange);
document.addEventListener('input', handleInput);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    state.navOpen = true;
    persistNav();
  }
  render();
});
window.addEventListener('load', drawGraph);

function btn(label, action, value = '', tone = 'default') {
  return { label, action, value, tone };
}

function unit(name, symbol, toBase, fromBase) {
  return { name, symbol, toBase, fromBase };
}

function createInitialState() {
  const today = toDateInputValue(new Date());
  return {
    mode: 'standard',
    navOpen: window.innerWidth > 900,
    historyTab: 'history',
    history: [],
    memory: [],
    standard: createStandardState(),
    scientific: createScientificState(),
    programmer: createProgrammerState(),
    date: {
      mode: 'difference',
      from: today,
      to: today,
      baseDate: today,
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
    graphing: {
      expression: 'sin(x)',
      status: 'Plotting y = sin(x)'
    }
  };
}

function createStandardState() {
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

function createScientificState() {
  return {
    display: '0',
    expression: '',
    angle: 'DEG',
    error: false,
    justEvaluated: false
  };
}

function createProgrammerState() {
  return {
    display: '0',
    expression: '',
    accumulator: null,
    operator: null,
    waitingForOperand: false,
    error: false,
    base: 'DEC',
    justEvaluated: false
  };
}

function hydrateState() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
    const memory = JSON.parse(localStorage.getItem(STORAGE_KEYS.memory) || '[]');
    const nav = JSON.parse(localStorage.getItem(STORAGE_KEYS.nav) || 'null');
    if (Array.isArray(history)) {
      state.history = history.slice(0, 60);
    }
    if (Array.isArray(memory)) {
      state.memory = memory.slice(0, 20);
    }
    if (typeof nav === 'boolean' && window.innerWidth <= 900) {
      state.navOpen = nav;
    }
  } catch {
    // ignore broken local storage
  }
}

function persistCollections() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history.slice(0, 60)));
  localStorage.setItem(STORAGE_KEYS.memory, JSON.stringify(state.memory.slice(0, 20)));
}

function persistNav() {
  localStorage.setItem(STORAGE_KEYS.nav, JSON.stringify(state.navOpen));
}

function render() {
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
      ${state.converter.category === 'Currency' ? `<div class="currency-banner">Currency rates are mocked for this standalone web build, matching the repo's developer-mode approach.</div>` : ''}
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

  if (target.dataset.setMode) {
    state.mode = target.dataset.setMode;
    if (window.innerWidth <= 900) {
      state.navOpen = false;
      persistNav();
    }
    render();
    return;
  }

  if (target.dataset.historyTab) {
    state.historyTab = target.dataset.historyTab;
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
    render();
    return;
  }

  if (target.dataset.memoryRecall) {
    recallMemory(Number(target.dataset.memoryRecall));
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
    syncConverterValues(key === 'fromValue' ? 'from' : 'from');
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

function handleAction(action, value) {
  switch (state.mode) {
    case 'standard':
      handleStandardAction(action, value);
      break;
    case 'scientific':
      handleScientificAction(action, value);
      break;
    case 'programmer':
      handleProgrammerAction(action, value);
      break;
    default:
      break;
  }
}

function handleStandardAction(action, value) {
  const calc = state.standard;
  if (action === 'clear-all') {
    state.standard = createStandardState();
    return;
  }

  if (calc.error && !['clear-entry', 'clear-all'].includes(action)) {
    state.standard = createStandardState();
  }

  switch (action) {
    case 'digit':
      inputStandardDigit(value);
      break;
    case 'decimal':
      inputStandardDecimal();
      break;
    case 'operator':
      queueStandardOperator(value);
      break;
    case 'equals':
      evaluateStandardEquals();
      break;
    case 'negate':
      negateStandard();
      break;
    case 'percent':
      applyStandardPercent();
      break;
    case 'standard-unary':
      applyStandardUnary(value);
      break;
    case 'backspace':
      backspaceStandard();
      break;
    case 'clear-entry':
      clearEntryStandard();
      break;
    default:
      break;
  }
}

function inputStandardDigit(digit) {
  const calc = state.standard;
  if (calc.waitingForOperand || calc.justEvaluated) {
    calc.display = digit;
    calc.waitingForOperand = false;
    calc.justEvaluated = false;
    return;
  }
  calc.display = calc.display === '0' ? digit : `${calc.display}${digit}`;
}

function inputStandardDecimal() {
  const calc = state.standard;
  if (calc.waitingForOperand || calc.justEvaluated) {
    calc.display = '0.';
    calc.waitingForOperand = false;
    calc.justEvaluated = false;
    return;
  }
  if (!calc.display.includes('.')) {
    calc.display += '.';
  }
}

function queueStandardOperator(operator) {
  const calc = state.standard;
  const inputValue = parseDisplayNumber(calc.display);
  if (calc.operator && !calc.waitingForOperand) {
    const result = computeStandardBinary(calc.accumulator ?? 0, inputValue, calc.operator);
    if (result == null) {
      return;
    }
    calc.accumulator = result;
    calc.display = formatNumber(result);
  } else {
    calc.accumulator = inputValue;
  }
  calc.operator = operator;
  calc.expression = `${formatNumber(calc.accumulator)} ${operatorLabel(operator)}`;
  calc.waitingForOperand = true;
  calc.justEvaluated = false;
}

function evaluateStandardEquals() {
  const calc = state.standard;
  if (!calc.operator || calc.accumulator == null) {
    return;
  }
  const operand = calc.waitingForOperand ? (calc.lastOperand ?? parseDisplayNumber(calc.display)) : parseDisplayNumber(calc.display);
  const result = computeStandardBinary(calc.accumulator, operand, calc.operator);
  if (result == null) {
    return;
  }
  pushHistory(`${formatNumber(calc.accumulator)} ${operatorLabel(calc.operator)} ${formatNumber(operand)}`, formatNumber(result), 'standard');
  calc.display = formatNumber(result);
  calc.expression = `${formatNumber(calc.accumulator)} ${operatorLabel(calc.operator)} ${formatNumber(operand)}`;
  calc.accumulator = result;
  calc.lastOperand = operand;
  calc.operator = null;
  calc.waitingForOperand = true;
  calc.justEvaluated = true;
}

function negateStandard() {
  const calc = state.standard;
  if (calc.display === '0') {
    return;
  }
  calc.display = calc.display.startsWith('-') ? calc.display.slice(1) : `-${calc.display}`;
}

function applyStandardPercent() {
  const calc = state.standard;
  if (calc.accumulator == null) {
    return;
  }
  const current = parseDisplayNumber(calc.display);
  calc.display = formatNumber((calc.accumulator * current) / 100);
}

function applyStandardUnary(action) {
  const calc = state.standard;
  const current = parseDisplayNumber(calc.display);
  let result;
  let expression;
  if (action === 'reciprocal') {
    if (current === 0) {
      setStandardError('Cannot divide by zero');
      return;
    }
    result = 1 / current;
    expression = `1/(${formatNumber(current)})`;
  } else if (action === 'square') {
    result = current ** 2;
    expression = `sqr(${formatNumber(current)})`;
  } else if (action === 'sqrt') {
    if (current < 0) {
      setStandardError('Invalid input');
      return;
    }
    result = Math.sqrt(current);
    expression = `√(${formatNumber(current)})`;
  }
  calc.display = formatNumber(result);
  calc.expression = expression;
  calc.justEvaluated = true;
  pushHistory(expression, calc.display, 'standard');
}

function backspaceStandard() {
  const calc = state.standard;
  if (calc.waitingForOperand || calc.justEvaluated) {
    return;
  }
  calc.display = calc.display.length > 1 ? calc.display.slice(0, -1) : '0';
  if (calc.display === '-' || calc.display === '-0') {
    calc.display = '0';
  }
}

function clearEntryStandard() {
  state.standard.display = '0';
  state.standard.waitingForOperand = false;
}

function setStandardError(message) {
  state.standard.display = message;
  state.standard.error = true;
  state.standard.operator = null;
  state.standard.accumulator = null;
  state.standard.waitingForOperand = false;
}

function computeStandardBinary(left, right, operator) {
  if (operator === '/' && right === 0) {
    setStandardError('Cannot divide by zero');
    return null;
  }
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    default: return right;
  }
}

function handleScientificAction(action, value) {
  const calc = state.scientific;
  if (action === 'clear-all') {
    state.scientific = createScientificState();
    return;
  }

  if (action === 'set-angle') {
    calc.angle = value;
    return;
  }

  if (calc.error && !['clear-all', 'clear-entry'].includes(action)) {
    state.scientific = createScientificState();
  }

  switch (action) {
    case 'digit':
      appendScientificDigit(value);
      break;
    case 'decimal':
      appendScientificDecimal();
      break;
    case 'operator':
      appendScientificOperator(value);
      break;
    case 'paren':
      appendScientificParen(value);
      break;
    case 'constant':
      appendScientificConstant(value);
      break;
    case 'scientific-unary':
      applyScientificUnary(value);
      break;
    case 'negate':
      applyScientificUnary('negate');
      break;
    case 'backspace':
      scientificBackspace();
      break;
    case 'clear-entry':
      state.scientific = createScientificState();
      break;
    case 'equals':
      evaluateScientificEquals();
      break;
    default:
      break;
  }
}

function appendScientificDigit(digit) {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    calc.justEvaluated = false;
  }
  if (needsImplicitMultiply(calc.expression)) {
    calc.expression += ' * ';
  }
  calc.expression += digit;
  calc.display = scientificDisplayFromExpression(calc.expression);
}

function appendScientificDecimal() {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    calc.justEvaluated = false;
  }
  const token = lastScientificToken(calc.expression);
  if (token.includes('.')) {
    return;
  }
  if (needsImplicitMultiply(calc.expression)) {
    calc.expression += ' * ';
  }
  calc.expression += /\d$/.test(calc.expression) ? '.' : '0.';
  calc.display = scientificDisplayFromExpression(calc.expression);
}

function appendScientificOperator(operator) {
  const calc = state.scientific;
  calc.justEvaluated = false;
  const trimmed = calc.expression.trim();
  if (!trimmed && operator === '-') {
    calc.expression = '-';
    calc.display = '-';
    return;
  }
  if (!trimmed || /[+\-*/^(]$/.test(trimmed) || /mod$/.test(trimmed)) {
    return;
  }
  calc.expression = `${trimmed} ${operator} `;
}

function appendScientificParen(paren) {
  const calc = state.scientific;
  if (calc.justEvaluated && paren === '(') {
    calc.expression = '';
    calc.justEvaluated = false;
  }
  if (paren === '(') {
    if (needsImplicitMultiply(calc.expression)) {
      calc.expression += ' * ';
    }
    calc.expression += '(';
  } else if (canCloseScientificParen(calc.expression)) {
    calc.expression += ')';
  }
}

function appendScientificConstant(name) {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    calc.justEvaluated = false;
  }
  if (needsImplicitMultiply(calc.expression)) {
    calc.expression += ' * ';
  }
  calc.expression += name;
  calc.display = name === 'pi' ? formatNumber(Math.PI) : formatNumber(Math.E);
}

function applyScientificUnary(action) {
  const calc = state.scientific;
  const current = parseDisplayNumber(calc.display === '-' ? '0' : calc.display);
  let result;
  try {
    result = scientificUnary(action, current, calc.angle);
  } catch (error) {
    calc.display = error.message || 'Invalid input';
    calc.error = true;
    return;
  }
  const expression = unaryExpressionLabel(action, current);
  calc.expression = expression;
  calc.display = formatNumber(result);
  calc.justEvaluated = true;
  pushHistory(expression, calc.display, 'scientific');
}

function scientificBackspace() {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    calc.display = '0';
    calc.justEvaluated = false;
    return;
  }
  calc.expression = calc.expression.trimEnd();
  if (calc.expression.endsWith('mod')) {
    calc.expression = calc.expression.slice(0, -3);
  } else {
    calc.expression = calc.expression.slice(0, -1);
  }
  calc.expression = calc.expression.replace(/\s+$/, '');
  calc.display = scientificDisplayFromExpression(calc.expression) || '0';
}

function evaluateScientificEquals() {
  const calc = state.scientific;
  const expression = calc.expression.trim() || calc.display;
  try {
    const result = evaluateScientificExpression(expression, { angle: calc.angle });
    calc.display = formatNumber(result);
    calc.expression = expression;
    calc.justEvaluated = true;
    pushHistory(expression, calc.display, 'scientific');
  } catch (error) {
    calc.display = error.message || 'Invalid input';
    calc.error = true;
  }
}

function handleProgrammerAction(action, value) {
  const calc = state.programmer;
  if (action === 'clear-all') {
    state.programmer = createProgrammerState();
    return;
  }
  if (action === 'set-base') {
    setProgrammerBase(value);
    return;
  }
  if (calc.error && !['clear-all', 'clear-entry'].includes(action)) {
    state.programmer = createProgrammerState();
  }
  switch (action) {
    case 'digit':
      inputProgrammerDigit(value);
      break;
    case 'operator':
      queueProgrammerOperator(value);
      break;
    case 'programmer-unary':
      applyProgrammerUnary(value);
      break;
    case 'negate':
      negateProgrammer();
      break;
    case 'backspace':
      backspaceProgrammer();
      break;
    case 'clear-entry':
      state.programmer.display = '0';
      state.programmer.waitingForOperand = false;
      break;
    case 'equals':
      evaluateProgrammerEquals();
      break;
    default:
      break;
  }
}

function inputProgrammerDigit(digit) {
  const calc = state.programmer;
  if (!isProgrammerDigitAllowed(digit, calc.base)) {
    return;
  }
  if (calc.waitingForOperand || calc.justEvaluated) {
    calc.display = digit;
    calc.waitingForOperand = false;
    calc.justEvaluated = false;
    return;
  }
  calc.display = calc.display === '0' ? digit : `${calc.display}${digit}`;
}

function queueProgrammerOperator(operator) {
  const calc = state.programmer;
  const inputValue = getProgrammerCurrentValue();
  if (calc.operator && !calc.waitingForOperand) {
    const result = computeProgrammerBinary(calc.accumulator ?? 0n, inputValue, calc.operator);
    if (result == null) {
      return;
    }
    calc.accumulator = result;
    calc.display = formatBigInt(result, calc.base);
  } else {
    calc.accumulator = inputValue;
  }
  calc.operator = operator;
  calc.expression = `${formatBigInt(calc.accumulator, calc.base)} ${operatorLabel(operator)}`;
  calc.waitingForOperand = true;
  calc.justEvaluated = false;
}

function applyProgrammerUnary(action) {
  if (action !== 'not') {
    return;
  }
  const calc = state.programmer;
  const value = getProgrammerCurrentValue();
  const result = ~value;
  calc.display = formatBigInt(result, calc.base);
  calc.expression = `NOT ${formatBigInt(value, calc.base)}`;
  calc.justEvaluated = true;
  pushHistory(calc.expression, calc.display, 'programmer');
}

function negateProgrammer() {
  const calc = state.programmer;
  const value = getProgrammerCurrentValue();
  calc.display = formatBigInt(-value, calc.base);
}

function backspaceProgrammer() {
  const calc = state.programmer;
  if (calc.waitingForOperand || calc.justEvaluated) {
    return;
  }
  calc.display = calc.display.length > 1 ? calc.display.slice(0, -1) : '0';
  if (calc.display === '-') {
    calc.display = '0';
  }
}

function evaluateProgrammerEquals() {
  const calc = state.programmer;
  if (!calc.operator || calc.accumulator == null) {
    return;
  }
  const right = getProgrammerCurrentValue();
  const result = computeProgrammerBinary(calc.accumulator, right, calc.operator);
  if (result == null) {
    return;
  }
  pushHistory(`${formatBigInt(calc.accumulator, calc.base)} ${operatorLabel(calc.operator)} ${formatBigInt(right, calc.base)}`, formatBigInt(result, calc.base), 'programmer');
  calc.display = formatBigInt(result, calc.base);
  calc.expression = `${formatBigInt(calc.accumulator, calc.base)} ${operatorLabel(calc.operator)} ${formatBigInt(right, calc.base)}`;
  calc.accumulator = result;
  calc.operator = null;
  calc.waitingForOperand = true;
  calc.justEvaluated = true;
}

function computeProgrammerBinary(left, right, operator) {
  try {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/':
        if (right === 0n) {
          setProgrammerError('Cannot divide by zero');
          return null;
        }
        return left / right;
      case 'mod':
        if (right === 0n) {
          setProgrammerError('Cannot modulo by zero');
          return null;
        }
        return left % right;
      case 'and': return left & right;
      case 'or': return left | right;
      case 'xor': return left ^ right;
      case 'lsh': return left << Number(right);
      case 'rsh': return left >> Number(right);
      default: return right;
    }
  } catch {
    setProgrammerError('Invalid programmer operation');
    return null;
  }
}

function setProgrammerBase(base) {
  const value = getProgrammerCurrentValue();
  state.programmer.base = base;
  state.programmer.display = formatBigInt(value, base);
}

function setProgrammerError(message) {
  state.programmer.display = message;
  state.programmer.error = true;
  state.programmer.accumulator = null;
  state.programmer.operator = null;
}

function handleMemoryOperation(operation) {
  const current = getCurrentDisplayNumericValue();
  if (current == null) {
    return;
  }
  if (operation === 'mc') {
    state.memory = [];
  } else if (operation === 'mr') {
    recallMemory(0);
    return;
  } else if (operation === 'ms') {
    state.memory.unshift({ value: formatStoredMemoryValue(current) });
  } else if (operation === 'm+' || operation === 'm-') {
    const existing = Number(state.memory[0]?.value || 0);
    const next = operation === 'm+' ? existing + Number(current) : existing - Number(current);
    state.memory[0] = { value: formatNumber(next) };
  }
  state.memory = state.memory.slice(0, 20);
  persistCollections();
}

function recallMemory(index) {
  const item = state.memory[index];
  if (!item) {
    return;
  }
  if (state.mode === 'programmer') {
    const value = BigInt(Math.trunc(Number(item.value)));
    state.programmer.display = formatBigInt(value, state.programmer.base);
    state.programmer.waitingForOperand = false;
  } else if (state.mode === 'scientific') {
    state.scientific.display = item.value;
    state.scientific.expression = item.value;
    state.scientific.justEvaluated = true;
  } else {
    state.standard.display = item.value;
    state.standard.waitingForOperand = false;
  }
}

function recallHistory(index) {
  const entry = state.history[index];
  if (!entry) {
    return;
  }
  if (state.mode === 'programmer') {
    const parsed = parseBigIntFlexible(entry.result);
    state.programmer.display = formatBigInt(parsed, state.programmer.base);
  } else if (state.mode === 'scientific') {
    state.scientific.expression = entry.expression;
    state.scientific.display = entry.result;
    state.scientific.justEvaluated = true;
  } else {
    state.standard.display = entry.result;
    state.standard.expression = entry.expression;
    state.standard.justEvaluated = true;
  }
}

function pushHistory(expression, result, mode) {
  state.history.unshift({ expression, result, mode, modeLabel: MODE_META[mode].label });
  state.history = state.history.slice(0, 60);
  persistCollections();
}

function getCurrentDisplayNumericValue() {
  if (state.mode === 'programmer') {
    return Number(getProgrammerCurrentValue());
  }
  if (state.mode === 'scientific') {
    const parsed = Number(state.scientific.display);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(state.standard.display);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatStoredMemoryValue(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return formatNumber(Number(value));
}

function isCalculatorMode(mode) {
  return ['standard', 'scientific', 'programmer'].includes(mode);
}

function isSidePanelVisible() {
  return isCalculatorMode(state.mode);
}

function operatorLabel(operator) {
  return {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
    '^': '^',
    mod: 'mod',
    and: 'AND',
    or: 'OR',
    xor: 'XOR',
    lsh: '<<',
    rsh: '>>'
  }[operator] ?? operator;
}

function parseDisplayNumber(value) {
  return Number(String(value).replace(/,/g, ''));
}

function scientificUnary(action, value, angle) {
  const radians = angle === 'DEG' ? (value * Math.PI) / 180 : value;
  switch (action) {
    case 'square': return value ** 2;
    case 'cube': return value ** 3;
    case 'pow10': return 10 ** value;
    case 'sqrt':
      if (value < 0) throw new Error('Invalid input');
      return Math.sqrt(value);
    case 'cbrt': return Math.cbrt(value);
    case 'factorial':
      if (value < 0 || !Number.isInteger(value)) throw new Error('Invalid input');
      return factorial(value);
    case 'sin': return Math.sin(radians);
    case 'cos': return Math.cos(radians);
    case 'tan': return Math.tan(radians);
    case 'ln':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log(value);
    case 'log':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log10(value);
    case 'exp': return Math.exp(value);
    case 'reciprocal':
      if (value === 0) throw new Error('Cannot divide by zero');
      return 1 / value;
    case 'negate': return -value;
    default: return value;
  }
}

function unaryExpressionLabel(action, value) {
  const formatted = formatNumber(value);
  return {
    square: `sqr(${formatted})`,
    cube: `cube(${formatted})`,
    pow10: `10^(${formatted})`,
    sqrt: `√(${formatted})`,
    cbrt: `∛(${formatted})`,
    factorial: `fact(${formatted})`,
    sin: `sin(${formatted})`,
    cos: `cos(${formatted})`,
    tan: `tan(${formatted})`,
    ln: `ln(${formatted})`,
    log: `log(${formatted})`,
    exp: `exp(${formatted})`,
    reciprocal: `1/(${formatted})`,
    negate: `negate(${formatted})`
  }[action] ?? formatted;
}

function scientificDisplayFromExpression(expression) {
  const token = lastScientificToken(expression);
  if (!token) {
    return '0';
  }
  if (token === 'pi') return formatNumber(Math.PI);
  if (token === 'e') return formatNumber(Math.E);
  return token;
}

function lastScientificToken(expression) {
  const matches = expression.match(/(pi|e|-?\d*\.?\d+)$/);
  return matches?.[0] ?? '';
}

function needsImplicitMultiply(expression) {
  const trimmed = expression.trim();
  return !!trimmed && /([\d)e]|pi)$/.test(trimmed);
}

function canCloseScientificParen(expression) {
  const opens = (expression.match(/\(/g) || []).length;
  const closes = (expression.match(/\)/g) || []).length;
  return opens > closes && !/[+\-*/^(\s]$/.test(expression.trim());
}

function evaluateScientificExpression(expression, context = {}) {
  const tokens = tokenize(expression);
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(expected) {
    const token = tokens[index];
    if (expected && token?.value !== expected) {
      throw new Error('Invalid input');
    }
    index += 1;
    return token;
  }

  function parseExpression() {
    let value = parseTerm();
    while (peek() && ['+', '-'].includes(peek().value)) {
      const operator = consume().value;
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parsePower();
    while (peek() && ['*', '/', 'mod'].includes(peek().value)) {
      const operator = consume().value;
      const right = parsePower();
      if ((operator === '/' || operator === 'mod') && right === 0) {
        throw new Error('Cannot divide by zero');
      }
      if (operator === '*') value *= right;
      if (operator === '/') value /= right;
      if (operator === 'mod') value %= right;
    }
    return value;
  }

  function parsePower() {
    let value = parseUnary();
    while (peek() && peek().value === '^') {
      consume('^');
      const exponent = parseUnary();
      value = value ** exponent;
    }
    return value;
  }

  function parseUnary() {
    if (peek()?.value === '+') {
      consume('+');
      return parseUnary();
    }
    if (peek()?.value === '-') {
      consume('-');
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) {
      throw new Error('Invalid input');
    }
    if (token.type === 'number') {
      consume();
      return Number(token.value);
    }
    if (token.type === 'identifier') {
      consume();
      if (token.value === 'pi') return Math.PI;
      if (token.value === 'e') return Math.E;
      if (token.value === 'x') return context.x ?? 0;
      if (peek()?.value === '(') {
        consume('(');
        const argument = parseExpression();
        consume(')');
        return scientificFunction(token.value, argument, context.angle || 'RAD');
      }
      throw new Error('Invalid input');
    }
    if (token.value === '(') {
      consume('(');
      const value = parseExpression();
      consume(')');
      return value;
    }
    throw new Error('Invalid input');
  }

  const result = parseExpression();
  if (index < tokens.length) {
    throw new Error('Invalid input');
  }
  if (!Number.isFinite(result)) {
    throw new Error('Overflow');
  }
  return result;
}

function tokenize(expression) {
  const tokens = [];
  const normalized = expression.replace(/\s+/g, ' ').trim();
  let i = 0;
  while (i < normalized.length) {
    const char = normalized[i];
    if (char === ' ') {
      i += 1;
      continue;
    }
    if ('()+-*/^'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i += 1;
      continue;
    }
    if (/\d|\./.test(char)) {
      let number = char;
      i += 1;
      while (i < normalized.length && /[\d.]/.test(normalized[i])) {
        number += normalized[i];
        i += 1;
      }
      tokens.push({ type: 'number', value: number });
      continue;
    }
    if (/[A-Za-z]/.test(char)) {
      let identifier = char;
      i += 1;
      while (i < normalized.length && /[A-Za-z]/.test(normalized[i])) {
        identifier += normalized[i];
        i += 1;
      }
      tokens.push({ type: 'identifier', value: identifier.toLowerCase() });
      continue;
    }
    throw new Error('Invalid input');
  }
  return tokens;
}

function scientificFunction(name, value, angle) {
  const radians = angle === 'DEG' ? (value * Math.PI) / 180 : value;
  switch (name) {
    case 'sin': return Math.sin(radians);
    case 'cos': return Math.cos(radians);
    case 'tan': return Math.tan(radians);
    case 'sqrt':
      if (value < 0) throw new Error('Invalid input');
      return Math.sqrt(value);
    case 'abs': return Math.abs(value);
    case 'log':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log10(value);
    case 'ln':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log(value);
    case 'exp': return Math.exp(value);
    default: throw new Error('Invalid input');
  }
}

function factorial(value) {
  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
}

function isProgrammerDigitAllowed(digit, base) {
  const allowed = {
    BIN: ['0', '1'],
    OCT: ['0', '1', '2', '3', '4', '5', '6', '7'],
    DEC: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    HEX: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
  };
  return allowed[base].includes(digit.toUpperCase());
}

function getProgrammerCurrentValue() {
  try {
    return parseBigIntFromBase(state.programmer.display, state.programmer.base);
  } catch {
    return 0n;
  }
}

function parseBigIntFromBase(display, base) {
  const bases = { BIN: 2, OCT: 8, DEC: 10, HEX: 16 };
  const radix = bases[base];
  const value = display.trim().toUpperCase();
  const sign = value.startsWith('-') ? -1n : 1n;
  const digits = value.replace(/^-/, '') || '0';
  let result = 0n;
  for (const digit of digits) {
    const numeric = BigInt(parseInt(digit, radix));
    if (Number.isNaN(Number(numeric))) {
      throw new Error('Invalid digit');
    }
    result = result * BigInt(radix) + numeric;
  }
  return result * sign;
}

function parseBigIntFlexible(value) {
  const trimmed = String(value).trim();
  if (/^-?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }
  return BigInt(Math.trunc(Number(trimmed)) || 0);
}

function formatBigInt(value, base) {
  const sign = value < 0n ? '-' : '';
  const raw = (value < 0n ? -value : value).toString({ BIN: 2, OCT: 8, DEC: 10, HEX: 16 }[base]);
  return `${sign}${base === 'HEX' ? raw.toUpperCase() : raw}`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return 'Overflow';
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  const normalized = Number(value.toPrecision(12)).toString();
  return normalized.includes('e') ? value.toString() : normalized;
}

function formatExpressionForDisplay(expression) {
  return escapeHtml(String(expression || '')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷'));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function getDateParts(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function computeDateResults() {
  if (state.date.mode === 'difference') {
    const from = getDateParts(state.date.from);
    const to = getDateParts(state.date.to);
    const forward = to >= from;
    const start = forward ? from : to;
    const end = forward ? to : from;
    let years = end.getUTCFullYear() - start.getUTCFullYear();
    let months = end.getUTCMonth() - start.getUTCMonth();
    let days = end.getUTCDate() - start.getUTCDate();
    if (days < 0) {
      const prevMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
      days += prevMonth.getUTCDate();
      months -= 1;
    }
    if (months < 0) {
      months += 12;
      years -= 1;
    }
    const totalDays = Math.round((end - start) / 86400000);
    state.date.result = {
      totalDays,
      summary: `${years} years, ${months} months, ${days} days`,
      direction: totalDays === 0 ? 'Same day' : forward ? 'Forward' : 'Backward'
    };
  } else {
    const base = getDateParts(state.date.baseDate);
    const factor = state.date.operation === 'add' ? 1 : -1;
    const result = new Date(base);
    result.setUTCFullYear(result.getUTCFullYear() + Number(state.date.years || 0) * factor);
    result.setUTCMonth(result.getUTCMonth() + Number(state.date.months || 0) * factor);
    result.setUTCDate(result.getUTCDate() + Number(state.date.days || 0) * factor);
    state.date.result = {
      summary: result.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    };
  }
}

function getUnitsForCategory(category) {
  return UNIT_CATEGORIES[category] || UNIT_CATEGORIES.Length;
}

function resetConverterUnits() {
  const units = getUnitsForCategory(state.converter.category);
  state.converter.fromUnit = units[0].name;
  state.converter.toUnit = units[Math.min(1, units.length - 1)].name;
  state.converter.fromValue = '1';
}

function syncConverterValues(source) {
  const units = getUnitsForCategory(state.converter.category);
  const from = units.find((item) => item.name === state.converter.fromUnit) || units[0];
  const to = units.find((item) => item.name === state.converter.toUnit) || units[1] || units[0];
  const numeric = Number(state.converter.fromValue || 0);
  if (!Number.isFinite(numeric)) {
    state.converter.toValue = 'Invalid input';
    return;
  }
  const baseValue = from.toBase(numeric);
  state.converter.toValue = `${formatNumber(to.fromBase(baseValue))} ${to.symbol}`;
}

function updateGraph() {
  try {
    evaluateScientificExpression(state.graphing.expression, { x: 1, angle: state.scientific.angle });
    state.graphing.status = `Plotting y = ${state.graphing.expression}`;
  } catch (error) {
    state.graphing.status = error.message || 'Invalid graph expression';
  }
  drawGraph();
}

function drawGraph() {
  const canvas = document.getElementById('graph-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#12151a';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += width / 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += height / 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.strokeStyle = '#4cc2ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  for (let px = 0; px <= width; px += 2) {
    const x = ((px / width) * 20) - 10;
    let y;
    try {
      y = evaluateScientificExpression(state.graphing.expression || '0', { x, angle: state.scientific.angle });
    } catch {
      state.graphing.status = 'Invalid graph expression';
      break;
    }
    const py = height / 2 - y * (height / 20);
    if (!Number.isFinite(py)) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
}
