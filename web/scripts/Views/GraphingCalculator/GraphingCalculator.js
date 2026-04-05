import { state } from '../../state.js';
import { escapeHtml } from '../../utils.js';
import { renderToolbarIcon } from '../ViewIcons.js';

const GRAPHING_TOOL_GROUPS = ['Trigonometry', 'Inequalities', 'Function'];

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

  return `
    <div class="graphing-layout ${isCompact ? `mobile-view-${state.graphing.mobileView}` : 'desktop-view'}">
      <section class="graph-workspace">
        <div class="graph-surface">
          <canvas id="graph-canvas" class="graph-canvas" width="1200" height="720" aria-label="Graph canvas"></canvas>
          <div class="graph-overlay graph-surface-tools">
            <div class="graph-tool-cluster">
              <button class="graph-surface-button" aria-label="Select graph item">${renderToolbarIcon('graph-select')}</button>
              <button class="graph-surface-button" aria-label="Share graph">${renderToolbarIcon('graph-share')}</button>
              <button class="graph-surface-button" aria-label="Graph options">${renderToolbarIcon('graph-options')}</button>
            </div>
          </div>
          <div class="graph-overlay graph-zoom-controls">
            <button class="graph-surface-button" data-graph-zoom="in" aria-label="Zoom in">+</button>
            <button class="graph-surface-button" data-graph-zoom="out" aria-label="Zoom out">−</button>
            <button class="graph-surface-button" data-graph-zoom="reset" aria-label="Reset graph view">⟳</button>
          </div>
        </div>
      </section>

      <section class="graph-editor-panel">
        <div class="graph-expression-list" aria-label="Graph expressions">
          ${state.graphing.expressions.map((expression, index) => renderExpressionRow(expression, index)).join('')}
        </div>
        <div class="graph-status">${escapeHtml(state.graphing.status)}</div>
        <div class="graph-keypad-shell">
          <div class="graph-keypad-groups">
            ${GRAPHING_TOOL_GROUPS.map((group) => `<button class="graph-keypad-group" type="button">${group}<span class="graph-keypad-caret">⌄</span></button>`).join('')}
          </div>
          <div class="graph-keypad-grid">
            ${GRAPHING_KEYPAD_ROWS.flat().map((button) => renderKeypadButton(button)).join('')}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderExpressionRow(expression, index) {
  return `
    <div class="graph-expression-row ${state.graphing.activeExpressionIndex === index ? 'active' : ''} ${expression.error ? 'invalid' : ''}">
      <button class="graph-expression-badge" data-graph-select="${index}" style="--graph-expression-color: ${expression.color}" aria-label="Select expression ${index + 1}">
        <span>ƒ</span><sub>${index + 1}</sub>
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

  return `
    <button class="calc-button ${button.tone || ''}" ${actionAttribute} ${editAttribute}>${content}</button>
  `;
}
