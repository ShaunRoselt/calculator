import { state } from '../state.js';
import { escapeHtml, toDateInputValue } from '../utils.js';
import { renderToolbarIcon } from './ViewIcons.js';

const DATE_PICKER_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function renderDateCalculatorView() {
  const result = state.date.result;
  return `
    <div class="date-native-view">
      <div class="date-native-select-field">
        <span class="date-native-select-wrap">
          <button type="button" class="date-native-select-button ${state.date.openModeMenu ? 'active' : ''}" data-date-mode-toggle="true" aria-haspopup="listbox" aria-expanded="${state.date.openModeMenu ? 'true' : 'false'}" aria-label="Calculation mode">
            <span>${escapeHtml(getDateModeLabel(state.date.mode))}</span>
          </button>
          <span class="date-native-select-caret ui-caret" aria-hidden="true"></span>
          ${state.date.openModeMenu ? renderDateModeMenu() : ''}
        </span>
      </div>
      <div class="date-native-body">
        ${state.date.mode === 'difference' ? renderDateDifference(result) : renderDateShift(result)}
      </div>
    </div>
  `;
}

function renderDateDifference(result) {
  return `
    ${renderDateField('From', 'from', state.date.from)}
    ${renderDateField('To', 'to', state.date.to)}
    <div class="date-native-result-block">
      <div class="date-native-result-label">Difference</div>
      <div class="date-native-result-primary">${escapeHtml(result?.summary ?? 'Same dates')}</div>
      ${result?.detail ? `<div class="date-native-result-secondary">${escapeHtml(result.detail)}</div>` : ''}
    </div>
  `;
}

function renderDateModeMenu() {
  return `
    <div class="date-native-mode-menu" role="listbox" aria-label="Calculation mode options">
      ${renderDateModeOption('difference', 'Difference between dates')}
      ${renderDateModeOption('shift', 'Add or subtract days')}
    </div>
  `;
}

function renderDateModeOption(value, label) {
  const selected = state.date.mode === value;
  return `
    <button type="button" class="date-native-mode-option ${selected ? 'selected' : ''}" data-date-mode-select="${value}" role="option" aria-selected="${selected ? 'true' : 'false'}">${label}</button>
  `;
}

function renderDateShift(result) {
  return `
    ${renderDateField('From', 'baseDate', state.date.baseDate)}
    <div class="date-native-radio-row" role="radiogroup" aria-label="Date operation">
      ${renderDateOperation('add', 'Add')}
      ${renderDateOperation('subtract', 'Subtract')}
    </div>
    <div class="date-native-offset-grid">
      ${renderOffsetField('Years', 'years', state.date.years)}
      ${renderOffsetField('Months', 'months', state.date.months)}
      ${renderOffsetField('Days', 'days', state.date.days)}
    </div>
    <div class="date-native-result-block">
      <div class="date-native-result-label">Date</div>
      <div class="date-native-result-primary date-native-result-date">${escapeHtml(result?.summary ?? '')}</div>
    </div>
  `;
}

function renderDateField(label, key, value) {
  const pickerOpen = state.date.openPicker === key;
  return `
    <div class="date-native-field">
      <span class="date-native-field-label">${label}</span>
      <span class="date-native-picker-shell">
        <button type="button" class="date-native-picker-trigger ${pickerOpen ? 'active' : ''}" data-date-picker-toggle="${key}" aria-expanded="${pickerOpen ? 'true' : 'false'}" aria-label="${label}">
          <span class="date-native-picker-value">${escapeHtml(formatShortDate(value))}</span>
          <span class="date-native-picker-icon" aria-hidden="true">${renderToolbarIcon('date-picker')}</span>
        </button>
        ${pickerOpen ? renderDatePicker(key, value) : ''}
      </span>
    </div>
  `;
}

function renderDateOperation(value, label) {
  const checked = state.date.operation === value;
  return `
    <label class="date-native-radio ${checked ? 'active' : ''}">
      <input type="radio" name="date-operation" value="${value}" ${checked ? 'checked' : ''} />
      <span class="date-native-radio-indicator" aria-hidden="true"></span>
      <span>${label}</span>
    </label>
  `;
}

function renderOffsetField(label, key, selectedValue) {
  return `
    <label class="date-native-offset-field">
      <span class="date-native-field-label">${label}</span>
      <span class="date-native-select-wrap date-native-offset-select-wrap">
        <select name="date-${key}" class="date-native-select" aria-label="${label}">
          ${Array.from({ length: 1000 }, (_, index) => `<option value="${index}" ${Number(selectedValue) === index ? 'selected' : ''}>${index}</option>`).join('')}
        </select>
        <span class="date-native-select-caret ui-caret" aria-hidden="true"></span>
      </span>
    </label>
  `;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00Z`));
}

function getDateModeLabel(mode) {
  return mode === 'shift' ? 'Add or subtract days' : 'Difference between dates';
}

function renderDatePicker(key, selectedValue) {
  const visibleMonth = getVisibleMonthDate(selectedValue);
  const cells = getDatePickerCells(visibleMonth, selectedValue);
  return `
    <div class="date-native-calendar" role="dialog" aria-label="Choose date">
      <div class="date-native-calendar-header">
        <div class="date-native-calendar-month">${escapeHtml(formatCalendarMonth(visibleMonth))}</div>
        <div class="date-native-calendar-nav">
          <button type="button" class="date-native-calendar-nav-button" data-date-picker-nav="-1" data-date-picker-target="${key}" aria-label="Previous month">‹</button>
          <button type="button" class="date-native-calendar-nav-button" data-date-picker-nav="1" data-date-picker-target="${key}" aria-label="Next month">›</button>
        </div>
      </div>
      <div class="date-native-calendar-weekdays">
        ${DATE_PICKER_WEEKDAYS.map((day) => `<span>${day}</span>`).join('')}
      </div>
      <div class="date-native-calendar-grid">
        ${cells.map((cell) => `
          <button
            type="button"
            class="date-native-calendar-day ${cell.outside ? 'outside' : ''} ${cell.today ? 'today' : ''} ${cell.selected ? 'selected' : ''}"
            data-date-pick="${cell.value}"
            data-date-pick-target="${key}"
            aria-pressed="${cell.selected ? 'true' : 'false'}"
          >${cell.day}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function getVisibleMonthDate(selectedValue) {
  const source = state.date.pickerMonth || selectedValue.slice(0, 7);
  const [year, month] = source.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, 1));
}

function formatCalendarMonth(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(value);
}

function getDatePickerCells(visibleMonth, selectedValue) {
  const monthStartDay = visibleMonth.getUTCDay();
  const gridStart = new Date(visibleMonth);
  gridStart.setUTCDate(1 - monthStartDay);
  const today = toDateInputValue(new Date());
  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setUTCDate(gridStart.getUTCDate() + index);
    const value = toDateInputValue(cellDate);
    return {
      value,
      day: cellDate.getUTCDate(),
      outside: cellDate.getUTCMonth() !== visibleMonth.getUTCMonth(),
      selected: value === selectedValue,
      today: value === today
    };
  });
}
