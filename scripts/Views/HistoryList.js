import { getHistoryCollection } from '../state.js';
import { escapeHtml } from '../utils.js';
import { renderToolbarIcon } from './ViewIcons.js';

export function renderHistoryList() {
  const history = getHistoryCollection();
  if (!history.length) {
    return `<div class="side-empty">There's no history yet.</div>`;
  }
  return `
    <div class="history-list">
      ${history.map((entry, index) => `
        <button class="history-entry" data-history-index="${index}">
          <div class="history-expression">${escapeHtml(entry.expression)}</div>
          <div class="history-result">${escapeHtml(entry.result)}</div>
        </button>
      `).join('')}
    </div>
    <div class="side-footer">
      <button class="icon-button side-clear-button" data-history-clear="true" data-tooltip="Clear all history" aria-label="Clear history">${renderToolbarIcon('delete')}</button>
    </div>
  `;
}
