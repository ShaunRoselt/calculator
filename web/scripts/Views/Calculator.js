import { PROGRAMMER_BUTTONS, SCIENTIFIC_BUTTONS, STANDARD_BUTTONS } from '../config.js';
import { state } from '../state.js';
import { escapeHtml, formatExpressionForDisplay } from '../utils.js';
import { formatBigInt, getProgrammerCurrentValue, isProgrammerDigitAllowed } from '../logic.js';
import { renderProgrammerBitFlipPanel } from './CalculatorProgrammerBitFlipPanel.js';
import { renderProgrammerDisplayPanel } from './CalculatorProgrammerDisplayPanel.js';
import { renderScientificAngleButtons } from './CalculatorScientificAngleButtons.js';
import { renderMemoryToolbar } from './Memory.js';
import { renderToolbarIcon } from './ViewIcons.js';

export function renderCalculatorView(mode) {
  const calc = state[mode];
  const buttons = mode === 'standard' ? STANDARD_BUTTONS : mode === 'scientific' ? SCIENTIFIC_BUTTONS : PROGRAMMER_BUTTONS;
  const displaySizeClass = getDisplaySizeClass(calc.display, mode);
  const expressionSizeClass = getExpressionSizeClass(calc.expression);
  return `
    <div class="calculator-layout ${mode}">
      ${mode === 'scientific' ? `<div class="calculator-toolbar">${renderScientificAngleButtons()}</div>` : ''}
      ${mode === 'programmer' ? `<div class="calculator-toolbar">${renderProgrammerDisplayPanel()}</div>` : ''}
      <div class="display-panel">
        <div class="display-expression ${expressionSizeClass}">${formatExpressionForDisplay(calc.expression) || '&nbsp;'}</div>
        <div class="display-value ${displaySizeClass}">${escapeHtml(calc.display)}</div>
      </div>
      ${mode === 'programmer' ? `${renderProgrammerReadouts()}${state.programmer.isBitFlipChecked ? renderProgrammerBitFlipPanel() : ''}` : ''}
      <div class="memory-toolbar" aria-label="Memory controls">
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
      class="calc-button ${button.tone || ''} ${(button.tone || 'digit') === 'default' ? 'digit' : ''} ${disabled ? 'disabled' : ''}"
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
