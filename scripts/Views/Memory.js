import { getMemoryCollection } from '../state.js';
import { t } from '../i18n.js';
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
    return `<div class="side-empty">${t('memory.empty')}</div>`;
  }
  return `
    <div class="memory-list">
      ${memory.map((entry, index) => `
        <div class="memory-entry">
          <div class="memory-entry-row">
            <button class="memory-surface" data-memory-recall="${index}" aria-label="${escapeHtml(t('memory.recallValue', { value: entry.value }))}">
              <div class="memory-value">${escapeHtml(entry.value)}</div>
            </button>
            <div class="inline-toolbar">
              <button class="memory-action" data-memory-clear-item="${index}" data-tooltip="${t('memory.clearItem')}">MC</button>
              <button class="memory-action" data-memory-add="${index}" data-tooltip="${t('memory.addCurrentValue')}">M+</button>
              <button class="memory-action" data-memory-subtract="${index}" data-tooltip="${t('memory.subtractCurrentValue')}">M-</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="side-footer">
      <button class="icon-button side-clear-button" data-memory-clear="true" data-tooltip="${t('memory.clearAll')}" aria-label="${t('memory.clear')}">${renderToolbarIcon('delete')}</button>
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
      return t('memory.tooltips.clearAll');
    case 'mr':
      return t('memory.tooltips.recall');
    case 'm+':
      return t('memory.tooltips.add');
    case 'm-':
      return t('memory.tooltips.subtract');
    case 'ms':
      return t('memory.tooltips.store');
    default:
      return '';
  }
}
