import { state } from '../../state.js';
import { escapeHtml } from '../../utils.js';
import { renderToolbarIcon } from '../ViewIcons.js';

const GRAPHING_TOOL_GROUPS = [
  { key: 'trig', label: 'Trigonometry', icon: 'graphing-trig' },
  { key: 'inequality', label: 'Inequalities', icon: 'graphing-inequality' },
  { key: 'function', label: 'Function', icon: 'scientific-function' }
];

const GRAPHING_TRIG_LAYOUTS = {
  base: [
    { label: 'sin', insert: 'sin(' },
    { label: 'cos', insert: 'cos(' },
    { label: 'tan', insert: 'tan(' },
    { label: 'sec', insert: 'sec(' },
    { label: 'csc', insert: 'csc(' },
    { label: 'cot', insert: 'cot(' }
  ],
  shifted: [
    { label: 'sin⁻¹', insert: 'asin(' },
    { label: 'cos⁻¹', insert: 'acos(' },
    { label: 'tan⁻¹', insert: 'atan(' },
    { label: 'sec⁻¹', insert: 'asec(' },
    { label: 'csc⁻¹', insert: 'acsc(' },
    { label: 'cot⁻¹', insert: 'acot(' }
  ],
  hyp: [
    { label: 'sinh', insert: 'sinh(' },
    { label: 'cosh', insert: 'cosh(' },
    { label: 'tanh', insert: 'tanh(' },
    { label: 'sech', insert: 'sech(' },
    { label: 'csch', insert: 'csch(' },
    { label: 'coth', insert: 'coth(' }
  ],
  hypShifted: [
    { label: 'sinh⁻¹', insert: 'asinh(' },
    { label: 'cosh⁻¹', insert: 'acosh(' },
    { label: 'tanh⁻¹', insert: 'atanh(' },
    { label: 'sech⁻¹', insert: 'asech(' },
    { label: 'csch⁻¹', insert: 'acsch(' },
    { label: 'coth⁻¹', insert: 'acoth(' }
  ]
};

const GRAPHING_INEQUALITY_OPTIONS = [
  { label: '<', insert: '<' },
  { label: '≤', insert: '<=' },
  { label: '=', insert: '=' },
  { label: '≥', insert: '>=' },
  { label: '>', insert: '>' }
];

const GRAPHING_FUNCTION_OPTIONS = [
  { label: '|x|', insert: 'abs(' },
  { label: '⌊x⌋', insert: 'floor(' },
  { label: '⌈x⌉', insert: 'ceil(' }
];

const GRAPHING_KEYPAD_ROWS = [
  [
    { label: '2ⁿᵈ', tone: 'function' },
    { label: 'π', insert: 'pi', tone: 'function' },
    { label: 'e', insert: 'e', tone: 'function' },
    { label: 'C', editAction: 'clear', tone: 'function' },
    { icon: 'backspace', editAction: 'backspace', tone: 'function' }
  ],
  [
    { label: 'x²', insert: '^2', tone: 'function' },
    { label: '⅟x', insert: '1/(', tone: 'function' },
    { label: '|x|', insert: 'abs(', tone: 'function' },
    { label: 'x', insert: 'x', tone: 'function' },
    { label: 'y', insert: 'y', tone: 'function' }
  ],
  [
    { label: '²√x', insert: 'sqrt(', tone: 'function' },
    { label: '(', insert: '(', tone: 'function' },
    { label: ')', insert: ')', tone: 'function' },
    { label: '=', insert: '=', tone: 'function' },
    { label: '÷', insert: '/', tone: 'operator' }
  ],
  [
    { label: 'xʸ', insert: '^', tone: 'function' },
    { label: '7', insert: '7', tone: 'digit' },
    { label: '8', insert: '8', tone: 'digit' },
    { label: '9', insert: '9', tone: 'digit' },
    { label: '×', insert: '*', tone: 'operator' }
  ],
  [
    { label: '10ˣ', insert: '10^', tone: 'function' },
    { label: '4', insert: '4', tone: 'digit' },
    { label: '5', insert: '5', tone: 'digit' },
    { label: '6', insert: '6', tone: 'digit' },
    { label: '−', insert: '-', tone: 'operator' }
  ],
  [
    { label: 'log', insert: 'log(', tone: 'function' },
    { label: '1', insert: '1', tone: 'digit' },
    { label: '2', insert: '2', tone: 'digit' },
    { label: '3', insert: '3', tone: 'digit' },
    { label: '+', insert: '+', tone: 'operator' }
  ],
  [
    { label: 'ln', insert: 'ln(', tone: 'function' },
    { label: '↔', insert: 'x', tone: 'function' },
    { label: '0', insert: '0', tone: 'digit' },
    { label: ',', insert: ',', tone: 'digit' },
    { label: '↵', editAction: 'plot', tone: 'equals' }
  ]
];

export function renderGraphingCalculatorView() {
  const isCompact = window.innerWidth < 768;
  const activeExpression = state.graphing.expressions[state.graphing.activeExpressionIndex] ?? state.graphing.expressions[0];
  const graphThemeClass = state.graphing.theme === 'match-app' ? 'graph-theme-match-app' : 'graph-theme-light';

  return `
    <div class="graphing-layout ${graphThemeClass} ${isCompact ? `mobile-view-${state.graphing.mobileView}` : 'desktop-view'}">
      <section class="graph-workspace">
        <div class="graph-surface">
          <canvas id="graph-canvas" class="graph-canvas" width="1200" height="720" aria-label="Graph canvas"></canvas>
          ${state.graphing.settingsOpen ? renderGraphSettingsPanel() : ''}
          <div class="graph-overlay graph-surface-tools">
            <div class="graph-tool-cluster">
              <button class="graph-surface-button ${state.graphing.tracingEnabled ? 'active' : ''}" data-graph-surface-action="trace" data-tooltip="${state.graphing.tracingEnabled ? 'Stop tracing' : 'Start tracing'}" aria-label="${state.graphing.tracingEnabled ? 'Stop tracing' : 'Start tracing'}">${renderToolbarIcon('graph-select')}</button>
              <button class="graph-surface-button" data-graph-surface-action="share" data-tooltip="Share" aria-label="Share">${renderToolbarIcon('graph-share')}</button>
              <button class="graph-surface-button ${state.graphing.settingsOpen ? 'active' : ''}" data-graph-settings-toggle="true" data-tooltip="Graph options" aria-label="Graph options">${renderToolbarIcon('graph-options')}</button>
            </div>
          </div>
          <div class="graph-overlay graph-zoom-controls">
            <button class="graph-surface-button" data-graph-zoom="in" data-tooltip="Zoom in (Ctrl + plus)" aria-label="Zoom in">+</button>
            <button class="graph-surface-button" data-graph-zoom="out" data-tooltip="Zoom out (Ctrl + minus)" aria-label="Zoom out">−</button>
            <button class="graph-surface-button ${state.graphing.isManualAdjustment ? 'active' : ''}" data-graph-view-toggle="true" data-tooltip="Refresh view automatically (Ctrl + 0)" aria-label="Graph view" aria-pressed="${state.graphing.isManualAdjustment ? 'true' : 'false'}">${renderToolbarIcon(state.graphing.isManualAdjustment ? 'graph-manual-view' : 'graph-auto-view')}</button>
          </div>
        </div>
      </section>

      <section class="graph-editor-panel">
        <div class="graph-expression-list" aria-label="Graph expressions">
          ${renderExpressionRow(activeExpression, state.graphing.activeExpressionIndex)}
        </div>
        <div class="graph-editor-stage" aria-hidden="true"></div>
        <div class="graph-keypad-shell">
          ${renderGraphingMenu()}
          <div class="graph-keypad-groups">
            ${GRAPHING_TOOL_GROUPS.map((group) => renderGraphingGroupButton(group)).join('')}
          </div>
          <div class="graph-keypad-grid">
            ${GRAPHING_KEYPAD_ROWS.flat().map((button) => renderKeypadButton(button)).join('')}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderGraphSettingsPanel() {
  const viewport = state.graphing.viewport;
  return `
    <section class="graph-settings-panel" role="dialog" aria-label="Graph options">
      <div class="graph-settings-header">
        <h3>Graph options</h3>
      </div>
      <div class="graph-settings-section-heading">
        <span>Window</span>
        <button class="graph-settings-link" type="button" data-graph-settings-reset="true">Reset view</button>
      </div>
      <div class="graph-settings-grid">
        ${renderGraphSettingsField('X-Min', 'graph-viewport-xMin', viewport.xMin)}
        ${renderGraphSettingsField('X-Max', 'graph-viewport-xMax', viewport.xMax)}
        ${renderGraphSettingsField('Y-Min', 'graph-viewport-yMin', viewport.yMin)}
        ${renderGraphSettingsField('Y-Max', 'graph-viewport-yMax', viewport.yMax)}
      </div>
      <div class="graph-settings-section-heading standalone">
        <span>Units</span>
      </div>
      <div class="graph-settings-choice-row" role="group" aria-label="Units">
        ${renderGraphSettingsChoice('Radians', 'RAD', state.graphing.angle === 'RAD')}
        ${renderGraphSettingsChoice('Degrees', 'DEG', state.graphing.angle === 'DEG')}
        ${renderGraphSettingsChoice('Gradians', 'GRAD', state.graphing.angle === 'GRAD')}
      </div>
      <label class="graph-settings-select-label">
        <span>Line thickness</span>
        <select class="graph-settings-select" name="graph-line-thickness">
          ${[1, 2, 3, 4].map((value) => `<option value="${value}" ${Number(state.graphing.lineThickness) === value ? 'selected' : ''}>${value.toFixed(1)}</option>`).join('')}
        </select>
      </label>
      <fieldset class="graph-settings-theme-group">
        <legend>Graph theme</legend>
        <label class="graph-settings-radio-option">
          <input type="radio" name="graph-theme" value="light" ${state.graphing.theme === 'light' ? 'checked' : ''} />
          <span>Always light</span>
        </label>
        <label class="graph-settings-radio-option">
          <input type="radio" name="graph-theme" value="match-app" ${state.graphing.theme === 'match-app' ? 'checked' : ''} />
          <span>Match app theme</span>
        </label>
      </fieldset>
    </section>
  `;
}

function renderGraphSettingsField(label, name, value) {
  return `
    <label class="graph-settings-field">
      <span>${label}</span>
      <input type="number" step="any" name="${name}" value="${escapeHtml(formatGraphSettingValue(value))}" />
    </label>
  `;
}

function renderGraphSettingsChoice(label, value, active) {
  return `<button class="graph-settings-choice ${active ? 'active' : ''}" type="button" data-graph-setting-angle="${value}" aria-pressed="${active ? 'true' : 'false'}">${label}</button>`;
}

function formatGraphSettingValue(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return Number(value.toFixed(4)).toString();
}

function renderGraphingGroupButton(group) {
  const isActive = state.graphing.openMenu === group.key;
  return `
    <button class="graph-keypad-group ${isActive ? 'active' : ''}" type="button" data-graph-menu-toggle="${group.key}" aria-expanded="${isActive ? 'true' : 'false'}">
      <span class="graph-keypad-group-icon" aria-hidden="true">${renderToolbarIcon(group.icon)}</span>
      <span>${group.label}</span>
      <span class="graph-keypad-caret">⌄</span>
    </button>
  `;
}

function renderGraphingMenu() {
  if (!state.graphing.openMenu) {
    return '';
  }

  if (state.graphing.openMenu === 'trig') {
    return renderGraphingTrigMenu();
  }

  if (state.graphing.openMenu === 'inequality') {
    return `
      <div class="graphing-operator-menu graphing-operator-menu-inequality" role="group" aria-label="Inequalities">
        ${GRAPHING_INEQUALITY_OPTIONS.map((option) => `<button class="graphing-menu-item" data-graph-insert="${escapeHtml(option.insert)}">${option.label}</button>`).join('')}
      </div>
    `;
  }

  return `
    <div class="graphing-operator-menu graphing-operator-menu-function" role="group" aria-label="Functions">
      ${GRAPHING_FUNCTION_OPTIONS.map((option) => `<button class="graphing-menu-item" data-graph-insert="${escapeHtml(option.insert)}">${option.label}</button>`).join('')}
    </div>
  `;
}

function renderGraphingTrigMenu() {
  const key = state.graphing.trigHyperbolic
    ? (state.graphing.trigShifted ? 'hypShifted' : 'hyp')
    : (state.graphing.trigShifted ? 'shifted' : 'base');
  const options = GRAPHING_TRIG_LAYOUTS[key];

  return `
    <div class="graphing-operator-menu graphing-operator-menu-trig" role="group" aria-label="Trigonometry">
      <button class="graphing-menu-toggle ${state.graphing.trigShifted ? 'active' : ''}" data-graph-menu-action="toggle-trig-shift" aria-pressed="${state.graphing.trigShifted ? 'true' : 'false'}">2ⁿᵈ</button>
      ${options.slice(0, 3).map((option) => `<button class="graphing-menu-item" data-graph-insert="${escapeHtml(option.insert)}">${option.label}</button>`).join('')}
      <button class="graphing-menu-toggle ${state.graphing.trigHyperbolic ? 'active' : ''}" data-graph-menu-action="toggle-trig-hyp" aria-pressed="${state.graphing.trigHyperbolic ? 'true' : 'false'}">hyp</button>
      ${options.slice(3).map((option) => `<button class="graphing-menu-item" data-graph-insert="${escapeHtml(option.insert)}">${option.label}</button>`).join('')}
    </div>
  `;
}

function renderExpressionRow(expression, index) {
  return `
    <div class="graph-expression-row ${state.graphing.activeExpressionIndex === index ? 'active' : ''} ${expression.error ? 'invalid' : ''}">
      <button class="graph-expression-badge" data-graph-select="${index}" aria-label="Select expression ${index + 1}">
        <span>ƒ</span>
      </button>
      <input
        class="graph-expression-input"
        type="text"
        name="graph-expression-${index}"
        value="${escapeHtml(expression.value)}"
        placeholder="Enter an expression"
        aria-label="Expression ${index + 1}"
      />
    </div>
  `;
}

function renderKeypadButton(button) {
  const content = button.icon ? renderToolbarIcon(button.icon) : escapeHtml(button.label);
  const actionAttribute = button.insert ? `data-graph-insert="${escapeHtml(button.insert)}"` : '';
  const editAttribute = button.editAction ? `data-graph-edit-action="${button.editAction}"` : '';
  const tooltip = button.icon === 'backspace' ? 'Backspace' : '';

  return `
    <button class="calc-button ${button.tone || ''}" ${actionAttribute} ${editAttribute} ${tooltip ? `data-tooltip="${tooltip}"` : ''}>${content}</button>
  `;
}
