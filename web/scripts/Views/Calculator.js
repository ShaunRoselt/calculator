import { PROGRAMMER_BUTTONS, SCIENTIFIC_BUTTONS, STANDARD_BUTTONS } from '../config.js';
import { state } from '../state.js';
import { escapeHtml, formatExpressionForDisplay } from '../utils.js';
import { formatBigInt, getProgrammerCurrentValue, isProgrammerDigitAllowed } from '../logic.js';
import { renderMemoryToolbar } from './Memory.js';
import { renderToolbarIcon } from './ViewIcons.js';

const SCIENTIFIC_ANGLE_OPTIONS = ['DEG', 'RAD', 'GRAD'];
const PROGRAMMER_BASE_OPTIONS = ['HEX', 'DEC', 'OCT', 'BIN'];

export function renderCalculatorView(mode) {
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
      <div class="memory-toolbar" aria-label="Memory controls">
        ${renderMemoryToolbar()}
      </div>
      <div class="button-grid ${mode}">
        ${buttons.flat().map((button) => renderCalcButton(button, mode)).join('')}
      </div>
    </div>
  `;
}

function renderAngleToggle() {
  return `
    <div class="inline-toolbar">
      ${SCIENTIFIC_ANGLE_OPTIONS.map((angle) => `
        <button class="angle-toggle ${state.scientific.angle === angle ? 'active' : ''}" data-action="set-angle" data-value="${angle}">${angle}</button>
      `).join('')}
    </div>
  `;
}

function renderBaseToolbar() {
  return `
    <div class="base-toolbar">
      ${PROGRAMMER_BASE_OPTIONS.map((base) => `
        <button class="base-button ${state.programmer.base === base ? 'active' : ''}" data-action="set-base" data-value="${base}">${base}</button>
      `).join('')}
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
