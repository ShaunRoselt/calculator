import { getMemoryCollection } from '../state.js';
import { escapeHtml } from '../utils.js';
import { renderToolbarIcon } from './ViewIcons.js';

export function renderMemoryToolbar() {
  const memoryEmpty = getMemoryCollection().length === 0;
  return [
    renderMemoryButton('mc', 'MC', memoryEmpty),
    renderMemoryButton('mr', 'MR', memoryEmpty),
    renderMemoryButton('m+', 'M+'),
    renderMemoryButton('m-', 'M−'),
    renderMemoryButton('ms', 'MS')
  ].join('');
}

export function renderMemoryList() {
  const memory = getMemoryCollection();
  if (!memory.length) {
    return `<div class="side-empty">There's nothing saved in memory.</div>`;
  }
  return `
    <div class="memory-list">
      ${memory.map((entry, index) => `
        <div class="memory-entry">
          <div class="memory-entry-row">
            <button class="memory-surface" data-memory-recall="${index}" aria-label="Recall memory ${escapeHtml(entry.value)}">
              <div class="memory-value">${escapeHtml(entry.value)}</div>
            </button>
            <div class="inline-toolbar">
              <button class="memory-action" data-memory-clear-item="${index}" data-tooltip="Clear memory item">MC</button>
              <button class="memory-action" data-memory-add="${index}" data-tooltip="Add current value to memory item">M+</button>
              <button class="memory-action" data-memory-subtract="${index}" data-tooltip="Subtract current value from memory item">M-</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="side-footer">
      <button class="icon-button side-clear-button" data-memory-clear="true" data-tooltip="Clear all memory" aria-label="Clear memory">${renderToolbarIcon('delete')}</button>
    </div>
  `;
}

function renderMemoryButton(op, label, disabled = false) {
  const tooltip = getMemoryTooltip(op);
  return `<button class="${disabled ? 'disabled' : ''}" data-memory-op="${op}" ${tooltip ? `data-tooltip="${tooltip}"` : ''} ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function getMemoryTooltip(op) {
  switch (op) {
    case 'mc':
      return 'Clear all memory (Ctrl+L)';
    case 'mr':
      return 'Memory recall (Ctrl+R)';
    case 'm+':
      return 'Memory add (Ctrl+P)';
    case 'm-':
      return 'Memory subtract (Ctrl+Q)';
    case 'ms':
      return 'Memory store (Ctrl+M)';
    default:
      return '';
  }
}
