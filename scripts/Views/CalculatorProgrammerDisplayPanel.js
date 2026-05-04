import { state } from '../state.js';
import { t } from '../i18n.js';
import { formatBigInt, getProgrammerCurrentValue } from '../logic.js';
import { escapeHtml, formatExpressionForDisplay } from '../utils.js';
import { renderToolbarIcon } from './ViewIcons.js';

const PROGRAMMER_BASE_OPTIONS = ['HEX', 'DEC', 'OCT', 'BIN'];

export function renderProgrammerDisplayPanel({ displaySizeClass = '', expressionSizeClass = '', showMemoryToggle = true } = {}) {
  const value = getProgrammerCurrentValue();
  const displayStateClass = state.programmer.error ? 'display-error' : '';
  const reads = {
    HEX: formatBigInt(value, 'HEX'),
    DEC: formatBigInt(value, 'DEC'),
    OCT: formatBigInt(value, 'OCT'),
    BIN: formatBigInt(value, 'BIN')
  };

  return `
    <div class="programmer-display-panel">
      <div class="programmer-expression display-expression ${expressionSizeClass}">${formatExpressionForDisplay(state.programmer.expression) || '&nbsp;'}</div>
      <div class="programmer-hero">
        <div class="programmer-readouts" aria-label="${t('programmer.baseReadouts')}">
          ${PROGRAMMER_BASE_OPTIONS.map((base) => `
            <button class="programmer-readout ${state.programmer.base === base ? 'active' : ''}" data-action="set-base" data-value="${base}" aria-pressed="${state.programmer.base === base ? 'true' : 'false'}" ${state.programmer.error ? 'disabled' : ''}>
              <span class="programmer-readout-base">${base}</span>
              <span class="programmer-readout-value">${escapeHtml(reads[base])}</span>
            </button>
          `).join('')}
        </div>
        <div class="programmer-display-column">
          <div class="programmer-display-value display-value ${displaySizeClass} ${displayStateClass}">${escapeHtml(state.programmer.display)}</div>
        </div>
      </div>
      <div class="programmer-meta-row">
        <div class="programmer-view-toggles" role="group" aria-label="${t('programmer.surfaceMode')}">
          <button class="programmer-icon-toggle ${state.programmer.isBitFlipChecked ? '' : 'active'}" data-action="set-programmer-view" data-value="keypad" data-tooltip="${t('programmer.fullKeypad')}" aria-label="${t('programmer.showKeypad')}">${renderToolbarIcon('programmer-keypad')}</button>
          <button class="programmer-icon-toggle ${state.programmer.isBitFlipChecked ? 'active' : ''}" data-action="set-programmer-view" data-value="bitflip" data-tooltip="${t('programmer.bitTogglingKeypad')}" aria-label="${t('programmer.showBitView')}">${renderToolbarIcon('programmer-bitflip')}</button>
        </div>
        <button class="programmer-word-size-button" data-action="cycle-word-size" aria-label="${t('programmer.wordSize')}" ${state.programmer.error ? 'disabled' : ''}>${state.programmer.wordSize}</button>
        <div class="programmer-memory-actions">
          <button class="programmer-memory-button" data-memory-op="ms" data-tooltip="${t('memory.tooltips.store')}">MS</button>
          ${showMemoryToggle ? `<button class="programmer-memory-button programmer-memory-toggle" data-toggle-panel="memory" data-tooltip="${t('memory.title')}">M<span class="memory-caret ui-caret" aria-hidden="true"></span></button>` : ''}
        </div>
      </div>
      <div class="programmer-operator-groups">
        <button class="programmer-group-button" type="button">${renderToolbarIcon('bitwise')}<span>${t('programmer.bitwise')}</span><span class="programmer-group-caret ui-caret" aria-hidden="true"></span></button>
        <button class="programmer-group-button" type="button">${renderToolbarIcon('bitshift')}<span>${t('programmer.bitShift')}</span><span class="programmer-group-caret ui-caret" aria-hidden="true"></span></button>
      </div>
    </div>
  `;
}
