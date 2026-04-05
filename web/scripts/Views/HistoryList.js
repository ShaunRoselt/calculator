import { state } from '../state.js';
import { escapeHtml } from '../utils.js';

export function renderHistoryList() {
  if (!state.history.length) {
    return `<div class="side-empty">There's no history yet.</div>`;
  }
  return `
    <div class="history-list">
      ${state.history.map((entry, index) => `
        <button class="history-entry" data-history-index="${index}">
          <div class="history-expression">${escapeHtml(entry.modeLabel)} · ${escapeHtml(entry.expression)}</div>
          <div class="history-result">${escapeHtml(entry.result)}</div>
        </button>
      `).join('')}
    </div>
    <div class="side-footer">
      <button class="history-clear" data-history-clear="true">Clear history</button>
    </div>
  `;
}
