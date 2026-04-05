import { state } from '../state.js';
import { escapeHtml } from '../utils.js';

export function renderMemoryToolbar() {
  const memoryEmpty = state.memory.length === 0;
  return [
    renderMemoryButton('mc', 'MC', memoryEmpty),
    renderMemoryButton('mr', 'MR', memoryEmpty),
    renderMemoryButton('m+', 'M+'),
    renderMemoryButton('m-', 'M−'),
    renderMemoryButton('ms', 'MS')
  ].join('');
}

export function renderMemoryList() {
  if (!state.memory.length) {
    return `<div class="side-empty">Memory is empty.</div>`;
  }
  return `
    <div class="memory-list">
      ${state.memory.map((entry, index) => `
        <div class="memory-entry">
          <div class="memory-entry-row">
            <div>
              <div class="memory-value">${escapeHtml(entry.value)}</div>
            </div>
            <div class="inline-toolbar">
              <button class="memory-action" data-memory-recall="${index}" data-tooltip="Recall memory">MR</button>
              <button class="memory-action" data-memory-delete="${index}" data-tooltip="Delete memory">✕</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="side-footer">
      <button class="memory-clear" data-memory-clear="true">Clear memory</button>
    </div>
  `;
}

function renderMemoryButton(op, label, disabled = false) {
  return `<button class="${disabled ? 'disabled' : ''}" data-memory-op="${op}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}
