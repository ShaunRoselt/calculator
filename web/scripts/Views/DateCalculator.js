import { state } from '../state.js';

export function renderDateCalculatorView() {
  const result = state.date.result;
  return `
    <div class="form-section">
      <div class="section-header">
        <div>
          <div class="subtitle">Two built-in workflows</div>
          <h3>Date calculation</h3>
        </div>
        <div class="form-toolbar">
          <button class="chip-button ${state.date.mode === 'difference' ? 'active' : ''}" data-date-mode="difference">Difference</button>
          <button class="chip-button ${state.date.mode === 'shift' ? 'active' : ''}" data-date-mode="shift">Add / subtract</button>
        </div>
      </div>
      <div class="date-grid">
        ${state.date.mode === 'difference' ? `
          <label class="label-stack">
            <span>From</span>
            <input type="date" name="date-from" value="${state.date.from}" />
          </label>
          <label class="label-stack">
            <span>To</span>
            <input type="date" name="date-to" value="${state.date.to}" />
          </label>
          <div class="stats-grid full">
            <div class="stat-card">
              <div class="meta-label">Total days</div>
              <strong>${result?.totalDays ?? 0}</strong>
            </div>
            <div class="stat-card">
              <div class="meta-label">Difference</div>
              <strong>${result?.summary ?? '0 days'}</strong>
            </div>
            <div class="stat-card">
              <div class="meta-label">Direction</div>
              <strong>${result?.direction ?? 'Same day'}</strong>
            </div>
          </div>
        ` : `
          <label class="label-stack full">
            <span>Starting date</span>
            <input type="date" name="date-baseDate" value="${state.date.baseDate}" />
          </label>
          <label class="label-stack">
            <span>Years</span>
            <input type="number" step="1" name="date-years" value="${state.date.years}" />
          </label>
          <label class="label-stack">
            <span>Months</span>
            <input type="number" step="1" name="date-months" value="${state.date.months}" />
          </label>
          <label class="label-stack">
            <span>Days</span>
            <input type="number" step="1" name="date-days" value="${state.date.days}" />
          </label>
          <label class="label-stack">
            <span>Operation</span>
            <select name="date-operation">
              <option value="add" ${state.date.operation === 'add' ? 'selected' : ''}>Add</option>
              <option value="subtract" ${state.date.operation === 'subtract' ? 'selected' : ''}>Subtract</option>
            </select>
          </label>
          <div class="result-card full">
            <div class="meta-label">Resulting date</div>
            <strong>${result?.summary ?? '--'}</strong>
          </div>
        `}
      </div>
    </div>
  `;
}
