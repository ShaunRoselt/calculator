import { state } from '../state.js';

const PROGRAMMER_BASE_OPTIONS = ['HEX', 'DEC', 'OCT', 'BIN'];
const PROGRAMMER_WORD_SIZES = ['QWORD', 'DWORD', 'WORD', 'BYTE'];

export function renderProgrammerDisplayPanel() {
  return `
    <div class="programmer-display-panel">
      <div class="programmer-mode-toggle" role="group" aria-label="Programmer input mode">
        <button class="programmer-surface-toggle ${state.programmer.isBitFlipChecked ? '' : 'active'}" data-action="toggle-bit-panel" aria-pressed="${state.programmer.isBitFlipChecked ? 'false' : 'true'}">Full keypad</button>
        <button class="programmer-surface-toggle ${state.programmer.isBitFlipChecked ? 'active' : ''}" data-action="toggle-bit-panel" aria-pressed="${state.programmer.isBitFlipChecked ? 'true' : 'false'}">Bit flip</button>
      </div>
      <div class="programmer-toolbar-row">
        <div class="base-toolbar">
          ${PROGRAMMER_BASE_OPTIONS.map((base) => `
            <button class="base-button ${state.programmer.base === base ? 'active' : ''}" data-action="set-base" data-value="${base}">${base}</button>
          `).join('')}
        </div>
        <div class="word-size-toolbar">
          ${PROGRAMMER_WORD_SIZES.map((wordSize) => `
            <button class="word-size-button ${state.programmer.wordSize === wordSize ? 'active' : ''}" data-action="set-word-size" data-value="${wordSize}">${wordSize}</button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
