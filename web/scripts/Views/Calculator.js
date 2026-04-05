import { PROGRAMMER_BUTTONS, SCIENTIFIC_BUTTONS, STANDARD_BUTTONS } from '../config.js';
import { state } from '../state.js';
import { escapeHtml, formatExpressionForDisplay } from '../utils.js';
import { formatBigInt, getProgrammerCurrentValue, isProgrammerDigitAllowed } from '../logic.js';
import { renderProgrammerBitFlipPanel } from './CalculatorProgrammerBitFlipPanel.js';
import { renderProgrammerDisplayPanel } from './CalculatorProgrammerDisplayPanel.js';
import { renderScientificAngleButtons } from './CalculatorScientificAngleButtons.js';
import { renderMemoryToolbar } from './Memory.js';
import { renderToolbarIcon } from './ViewIcons.js';

const SCIENTIFIC_SHIFTED_BUTTONS = {
  '1:0': { label: 'x³', value: 'cube' },
  '2:0': { label: '³√x', value: 'cbrt' },
  '3:0': { label: 'ʸ√x', action: 'operator', value: 'root', tone: 'operator' },
  '4:0': { label: '2ˣ', value: 'pow2' },
  '5:0': { label: 'logᵧ', action: 'operator', value: 'logbase', tone: 'operator' },
  '6:0': { label: 'eˣ', value: 'powe' }
};

const SCIENTIFIC_TRIG_LAYOUTS = {
  base: [
    { label: 'sin', value: 'sin' },
    { label: 'cos', value: 'cos' },
    { label: 'tan', value: 'tan' },
    { label: 'sec', value: 'sec' },
    { label: 'csc', value: 'csc' },
    { label: 'cot', value: 'cot' }
  ],
  shifted: [
    { label: 'sin⁻¹', value: 'asin' },
    { label: 'cos⁻¹', value: 'acos' },
    { label: 'tan⁻¹', value: 'atan' },
    { label: 'sec⁻¹', value: 'asec' },
    { label: 'csc⁻¹', value: 'acsc' },
    { label: 'cot⁻¹', value: 'acot' }
  ],
  hyp: [
    { label: 'sinh', value: 'sinh' },
    { label: 'cosh', value: 'cosh' },
    { label: 'tanh', value: 'tanh' },
    { label: 'sech', value: 'sech' },
    { label: 'csch', value: 'csch' },
    { label: 'coth', value: 'coth' }
  ],
  hypShifted: [
    { label: 'sinh⁻¹', value: 'asinh' },
    { label: 'cosh⁻¹', value: 'acosh' },
    { label: 'tanh⁻¹', value: 'atanh' },
    { label: 'sech⁻¹', value: 'asech' },
    { label: 'csch⁻¹', value: 'acsch' },
    { label: 'coth⁻¹', value: 'acoth' }
  ]
};

const SCIENTIFIC_EXTRA_FUNCTIONS = [
  { label: '|x|', value: 'abs' },
  { label: '⌊x⌋', value: 'floor' },
  { label: '⌈x⌉', value: 'ceil' },
  { label: 'rand', value: 'rand' },
  { label: 'dms', value: 'dms' },
  { label: 'deg', value: 'degrees' }
];

export function renderCalculatorView(mode) {
  const calc = state[mode];
  const buttons = mode === 'standard' ? STANDARD_BUTTONS : mode === 'scientific' ? getScientificButtons(calc) : PROGRAMMER_BUTTONS;
  const displaySizeClass = getDisplaySizeClass(calc.display, mode);
  const expressionSizeClass = getExpressionSizeClass(calc.expression);
  if (mode === 'programmer') {
    return `
      <div class="calculator-layout programmer">
        <div class="programmer-shell">
          ${renderProgrammerDisplayPanel()}
          ${state.programmer.isBitFlipChecked ? renderProgrammerBitFlipPanel() : ''}
          <div class="button-grid programmer">
            ${buttons.flat().map((button) => renderCalcButton(button, mode)).join('')}
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="calculator-layout ${mode}">
      ${mode === 'scientific' ? `<div class="calculator-toolbar">${renderScientificAngleButtons()}</div>` : ''}
      <div class="display-panel">
        <div class="display-expression ${expressionSizeClass}">${formatExpressionForDisplay(calc.expression) || '&nbsp;'}</div>
        <div class="display-value ${displaySizeClass}">${escapeHtml(calc.display)}</div>
      </div>
      <div class="memory-toolbar" aria-label="Memory controls">
        ${renderMemoryToolbar()}
      </div>
      ${mode === 'scientific' ? renderScientificOperatorPickers() : ''}
      <div class="button-grid ${mode}">
        ${buttons.flat().map((button) => renderCalcButton(button, mode)).join('')}
      </div>
    </div>
  `;
}

function getScientificButtons(calc) {
  const hasEntry = calc.error || calc.expression.trim() || calc.display !== '0';
  return SCIENTIFIC_BUTTONS.map((row, rowIndex) => row.map((button, columnIndex) => {
    if (rowIndex === 0 && columnIndex === 0) {
      return {
        ...button,
        action: 'toggle-shift',
        active: calc.isShifted
      };
    }
    if (rowIndex === 0 && columnIndex === 3) {
      return hasEntry
        ? { ...button, label: 'CE', action: 'clear-entry' }
        : { ...button, label: 'C', action: 'clear-all' };
    }
    if (calc.isShifted) {
      const shifted = SCIENTIFIC_SHIFTED_BUTTONS[`${rowIndex}:${columnIndex}`];
      if (shifted) {
        return {
          ...button,
          ...shifted,
          action: shifted.action ?? button.action
        };
      }
    }
    return button;
  }));
}

function renderScientificOperatorPickers() {
  const openMenu = state.scientific.openMenu;
  return `
    <div class="scientific-operator-strip">
      <div class="scientific-operator-buttons">
        ${renderScientificOperatorButton('trig', 'Trigonometry', openMenu === 'trig')}
        ${renderScientificOperatorButton('function', 'Function', openMenu === 'function')}
      </div>
      ${openMenu ? renderScientificOperatorMenu(openMenu) : ''}
    </div>
  `;
}

function renderScientificOperatorButton(value, label, active) {
  return `
    <button
      class="scientific-operator-button ${active ? 'active' : ''}"
      data-action="toggle-scientific-menu"
      data-value="${value}"
      aria-expanded="${active ? 'true' : 'false'}"
    >
      <span>${label}</span>
      <span class="scientific-operator-caret" aria-hidden="true">⌄</span>
    </button>
  `;
}

function renderScientificOperatorMenu(menu) {
  if (menu === 'trig') {
    return renderScientificTrigMenu();
  }
  return `
    <div class="scientific-operator-menu scientific-operator-menu-function" role="group" aria-label="Scientific functions">
      ${SCIENTIFIC_EXTRA_FUNCTIONS.map((option) => `
        <button class="scientific-menu-item" data-action="scientific-unary" data-value="${option.value}">${option.label}</button>
      `).join('')}
    </div>
  `;
}

function renderScientificTrigMenu() {
  const calc = state.scientific;
  const trigKey = calc.isHyperbolic ? (calc.isShifted ? 'hypShifted' : 'hyp') : (calc.isShifted ? 'shifted' : 'base');
  const options = SCIENTIFIC_TRIG_LAYOUTS[trigKey];
  return `
    <div class="scientific-operator-menu scientific-operator-menu-trig" role="group" aria-label="Trigonometric functions">
      <button class="scientific-menu-toggle ${calc.isShifted ? 'active' : ''}" data-action="toggle-shift" aria-pressed="${calc.isShifted ? 'true' : 'false'}">2ⁿᵈ</button>
      ${options.slice(0, 3).map((option) => `
        <button class="scientific-menu-item" data-action="scientific-unary" data-value="${option.value}">${option.label}</button>
      `).join('')}
      <button class="scientific-menu-toggle ${calc.isHyperbolic ? 'active' : ''}" data-action="toggle-scientific-hyp" aria-pressed="${calc.isHyperbolic ? 'true' : 'false'}">hyp</button>
      ${options.slice(3).map((option) => `
        <button class="scientific-menu-item" data-action="scientific-unary" data-value="${option.value}">${option.label}</button>
      `).join('')}
    </div>
  `;
}

function renderCalcButton(button, mode) {
  const disabled = mode === 'programmer' && button.action === 'digit' && !isProgrammerDigitAllowed(button.value, state.programmer.base);
  return `
    <button
      class="calc-button ${button.tone || ''} ${(button.tone || 'digit') === 'default' ? 'digit' : ''} ${button.active ? 'active' : ''} ${disabled ? 'disabled' : ''}"
      data-action="${button.action}"
      data-value="${button.value ?? ''}"
      ${disabled ? 'disabled' : ''}
    >${renderCalcButtonLabel(button)}</button>
  `;
}

function renderCalcButtonLabel(button) {
  if (button.action === 'backspace') {
    return renderToolbarIcon('backspace');
  }
  return button.label;
}

function getDisplaySizeClass(display, mode) {
  const normalizedLength = String(display).replace(/\s+/g, '').length;
  const compactThreshold = mode === 'programmer' ? 10 : 12;
  const denseThreshold = mode === 'programmer' ? 16 : 15;
  const ultraDenseThreshold = mode === 'programmer' ? 28 : 22;

  if (normalizedLength >= ultraDenseThreshold) {
    return 'ultra-dense';
  }
  if (normalizedLength >= denseThreshold) {
    return 'dense';
  }
  if (normalizedLength >= compactThreshold) {
    return 'compact';
  }
  return '';
}

function getExpressionSizeClass(expression) {
  const length = String(expression || '').length;
  if (length >= 48) {
    return 'dense';
  }
  if (length >= 28) {
    return 'compact';
  }
  return '';
}
