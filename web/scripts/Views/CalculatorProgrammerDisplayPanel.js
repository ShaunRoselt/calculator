import { state } from '../state.js';
import { formatBigInt, getProgrammerCurrentValue } from '../logic.js';
import { renderToolbarIcon } from './ViewIcons.js';

const PROGRAMMER_BASE_OPTIONS = ['HEX', 'DEC', 'OCT', 'BIN'];

export function renderProgrammerDisplayPanel() {
  const value = getProgrammerCurrentValue();
  const reads = {
    HEX: formatBigInt(value, 'HEX'),
    DEC: formatBigInt(value, 'DEC'),
    OCT: formatBigInt(value, 'OCT'),
    BIN: formatBigInt(value, 'BIN')
  };

  return `
    <div class="programmer-display-panel">
      <div class="programmer-hero">
        <div class="programmer-readouts" aria-label="Programmer base readouts">
          ${PROGRAMMER_BASE_OPTIONS.map((base) => `
            <button class="programmer-readout ${state.programmer.base === base ? 'active' : ''}" data-action="set-base" data-value="${base}">
              <span class="programmer-readout-base">${base}</span>
              <span class="programmer-readout-value">${reads[base]}</span>
            </button>
          `).join('')}
        </div>
        <div class="programmer-display-value">${state.programmer.display}</div>
      </div>
      <div class="programmer-control-row">
        <div class="programmer-view-toggles" role="group" aria-label="Programmer surface mode">
          <button class="programmer-icon-toggle ${state.programmer.isBitFlipChecked ? '' : 'active'}" data-action="set-programmer-view" data-value="keypad" data-tooltip="Full keypad" aria-label="Show keypad">${renderToolbarIcon('programmer-keypad')}</button>
          <button class="programmer-icon-toggle ${state.programmer.isBitFlipChecked ? 'active' : ''}" data-action="set-programmer-view" data-value="bitflip" data-tooltip="Bit toggling keypad" aria-label="Show bit view">${renderToolbarIcon('programmer-bitflip')}</button>
        </div>
        <div class="programmer-word-size" data-action="cycle-word-size" aria-label="Word size">${state.programmer.wordSize}</div>
        <div class="programmer-memory-actions">
          <button class="programmer-memory-button" data-memory-op="store" data-tooltip="Memory store (Ctrl+M)">MS</button>
          <button class="programmer-memory-button" data-toggle-panel="memory" data-tooltip="Memory">M⌄</button>
        </div>
      </div>
      <div class="programmer-operator-groups">
        <button class="programmer-group-button" type="button">${renderToolbarIcon('bitwise')}<span>Bitwise</span><span class="programmer-group-caret">⌄</span></button>
        <button class="programmer-group-button" type="button">${renderToolbarIcon('bitshift')}<span>Bit shift</span><span class="programmer-group-caret">⌄</span></button>
      </div>
    </div>
  `;
}
