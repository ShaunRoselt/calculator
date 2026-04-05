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
