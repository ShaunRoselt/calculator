import { CURRENCY_DETAILS, MOCK_CURRENCY_NOTE, MOCK_CURRENCY_UPDATED_AT, MODE_META, UNIT_CATEGORIES, isConverterMode } from '../config.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils.js';
import { getConverterDisplayValue, getUnitsForCategory } from '../logic.js';

const CURRENCY_KEYPAD = [
  [null, { label: 'CE', action: 'clear' }, { icon: 'backspace', action: 'backspace' }],
  [{ label: '7', action: 'digit', value: '7' }, { label: '8', action: 'digit', value: '8' }, { label: '9', action: 'digit', value: '9' }],
  [{ label: '4', action: 'digit', value: '4' }, { label: '5', action: 'digit', value: '5' }, { label: '6', action: 'digit', value: '6' }],
  [{ label: '1', action: 'digit', value: '1' }, { label: '2', action: 'digit', value: '2' }, { label: '3', action: 'digit', value: '3' }],
  [null, { label: '0', action: 'digit', value: '0' }, { label: ',', action: 'decimal' }]
];

const GENERIC_CONVERTER_KEYPAD = [
  [null, { label: 'CE', action: 'clear' }, { icon: 'backspace', action: 'backspace' }],
  [{ label: '7', action: 'digit', value: '7' }, { label: '8', action: 'digit', value: '8' }, { label: '9', action: 'digit', value: '9' }],
  [{ label: '4', action: 'digit', value: '4' }, { label: '5', action: 'digit', value: '5' }, { label: '6', action: 'digit', value: '6' }],
  [{ label: '1', action: 'digit', value: '1' }, { label: '2', action: 'digit', value: '2' }, { label: '3', action: 'digit', value: '3' }],
  [{ label: '+/-', action: 'toggle-sign' }, { label: '0', action: 'digit', value: '0' }, { label: ',', action: 'decimal' }]
];

export function renderUnitConverterView() {
  const units = getUnitsForCategory(state.converter.category);
  const dedicatedCategoryMode = isConverterMode(state.mode);
  const title = dedicatedCategoryMode ? MODE_META[state.mode]?.label ?? state.converter.category : 'Unit converter';
  if (state.converter.category === 'Currency') {
    return renderCurrencyView(units, title);
  }
  if (dedicatedCategoryMode) {
    return renderNativeConverterView(units, title);
  }
  return `
    <div class="form-section">
      <div class="section-header">
        <div>
          <div class="subtitle">${dedicatedCategoryMode ? 'Converter' : 'Built-in converter collections'}</div>
          <h3>${escapeHtml(title)}</h3>
        </div>
      </div>
      <div class="converter-grid">
        <label class="label-stack full ${dedicatedCategoryMode ? 'converter-category-hidden' : ''}">
          <span>Category</span>
          <select name="converter-category">
            ${Object.keys(UNIT_CATEGORIES).map((category) => `<option value="${category}" ${state.converter.category === category ? 'selected' : ''}>${category}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>From</span>
          <select name="converter-fromUnit">
            ${units.map((unitOption) => `<option value="${unitOption.name}" ${state.converter.fromUnit === unitOption.name ? 'selected' : ''}>${unitOption.name}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>To</span>
          <select name="converter-toUnit">
            ${units.map((unitOption) => `<option value="${unitOption.name}" ${state.converter.toUnit === unitOption.name ? 'selected' : ''}>${unitOption.name}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>Input value</span>
          <input type="number" name="converter-fromValue" value="${state.converter.fromValue}" step="any" />
        </label>
        <div class="label-stack">
          <span>Converted value</span>
          <div class="value-output converter-output">${escapeHtml(state.converter.toValue || '0')} ${escapeHtml(units.find((unitOption) => unitOption.name === state.converter.toUnit)?.symbol || '')}</div>
        </div>
        <div class="full converter-swap">
          <button class="aux-button" data-converter-swap="true">Swap units</button>
        </div>
      </div>
    </div>
  `;
}

function renderNativeConverterView(units, title) {
  const fromUnit = units.find((item) => item.name === state.converter.fromUnit) || units[0];
  const toUnit = units.find((item) => item.name === state.converter.toUnit) || units[1] || units[0];
  const aboutEqual = renderConverterReferenceLine(units);

  return `
    <div class="converter-native-layout" data-converter-title="${escapeHtml(title)}">
      <section class="converter-native-panel">
        <div class="converter-native-values">
          ${renderConverterField('from', fromUnit, getConverterDisplayValue('from'))}
          ${renderConverterField('to', toUnit, getConverterDisplayValue('to'))}
        </div>
        <div class="converter-native-meta ${aboutEqual ? '' : 'empty'}">
          ${aboutEqual ? `<div class="converter-native-meta-label">About equal to</div><div class="converter-native-meta-value">${escapeHtml(aboutEqual)}</div>` : ''}
        </div>
      </section>
      <section class="converter-native-keypad" aria-label="Converter keypad">
        ${GENERIC_CONVERTER_KEYPAD.flat().map((button) => renderConverterKey(button)).join('')}
      </section>
    </div>
  `;
}

function renderCurrencyView(units, title) {
  const fromMeta = CURRENCY_DETAILS[state.converter.fromUnit] || { label: state.converter.fromUnit, symbol: '$', code: 'USD' };
  const toMeta = CURRENCY_DETAILS[state.converter.toUnit] || { label: state.converter.toUnit, symbol: '¤', code: 'CUR' };
  const fromDisplay = getConverterDisplayValue('from');
  const toDisplay = getConverterDisplayValue('to');
  const rateLine = renderCurrencyRateLine(units, fromMeta, toMeta);

  return `
    <div class="currency-layout">
      <section class="currency-panel">
        <div class="currency-values">
          ${renderCurrencyField('from', fromMeta, fromDisplay)}
          ${renderCurrencyField('to', toMeta, toDisplay)}
        </div>
        <div class="currency-meta">
          <div class="currency-meta-line">${rateLine}</div>
          <div class="currency-meta-line">Updated ${MOCK_CURRENCY_UPDATED_AT}</div>
          <button class="currency-update-button" type="button" title="${escapeHtml(MOCK_CURRENCY_NOTE)}">Update rates</button>
        </div>
      </section>
      <section class="currency-keypad" aria-label="Currency keypad">
        ${CURRENCY_KEYPAD.flat().map((button) => renderCurrencyKey(button)).join('')}
      </section>
    </div>
  `;
}

function renderConverterField(field, unit, value) {
  return `
    <div class="converter-native-field ${state.converter.lastEdited === field ? 'active' : ''}">
      <button class="converter-native-field-activate" data-converter-active-field="${field}">
        <div class="converter-native-value-row">
          <span class="converter-native-amount">${escapeHtml(value || '0')}</span>
        </div>
      </button>
      <label class="converter-native-select-wrap">
        <select name="converter-${field === 'from' ? 'fromUnit' : 'toUnit'}" data-converter-field="${field}">
          ${getUnitsForCategory(state.converter.category).map((unitOption) => `<option value="${unitOption.name}" ${unitOption.name === unit.name ? 'selected' : ''}>${unitOption.name}</option>`).join('')}
        </select>
      </label>
    </div>
  `;
}

function renderConverterReferenceLine(units) {
  const from = units.find((item) => item.name === state.converter.fromUnit) || units[0];
  const to = units.find((item) => item.name === state.converter.toUnit) || units[1] || units[0];
  const alternate = units.find((item) => item.name !== from.name && item.name !== to.name);
  const numeric = Number(String(state.converter.fromValue || '0').replace(/,/g, '.'));
  if (!alternate || !Number.isFinite(numeric)) {
    return '';
  }
  const converted = alternate.fromBase(from.toBase(numeric));
  const formatted = getFormattedConverterMetaValue(converted);
  return `${formatted} ${alternate.symbol}`.trim();
}

function getFormattedConverterMetaValue(value) {
  const stringValue = String(value);
  if (!Number.isFinite(value)) {
    return stringValue;
  }
  const numeric = Number(value);
  if (Number.isInteger(numeric)) {
    return numeric.toString();
  }
  if (Math.abs(numeric) >= 1) {
    return String(Number(numeric.toFixed(2))).replace('.', ',');
  }
  return String(Number(numeric.toFixed(4))).replace('.', ',');
}

function renderCurrencyField(field, meta, value) {
  return `
    <div class="currency-field ${state.converter.lastEdited === field ? 'active' : ''}">
      <button class="currency-field-activate" data-converter-active-field="${field}">
      <div class="currency-value-row">
        <span class="currency-symbol">${escapeHtml(meta.symbol)}</span>
        <span class="currency-amount">${escapeHtml(value || '0')}</span>
      </div>
      </button>
      <label class="currency-select-wrap">
        <select name="converter-${field === 'from' ? 'fromUnit' : 'toUnit'}" data-converter-field="${field}">
          ${Object.entries(CURRENCY_DETAILS).map(([unitName, detail]) => `<option value="${unitName}" ${unitName === (field === 'from' ? state.converter.fromUnit : state.converter.toUnit) ? 'selected' : ''}>${detail.label}</option>`).join('')}
        </select>
      </label>
    </div>
  `;
}

function renderCurrencyRateLine(units, fromMeta, toMeta) {
  const from = units.find((item) => item.name === state.converter.fromUnit) || units[0];
  const to = units.find((item) => item.name === state.converter.toUnit) || units[1] || units[0];
  const converted = to.fromBase(from.toBase(1));
  return `1 ${fromMeta.code} = ${String(converted.toFixed(4)).replace('.', ',')} ${toMeta.code}`;
}

function renderCurrencyKey(button) {
  if (!button) {
    return '<div class="currency-keypad-spacer" aria-hidden="true"></div>';
  }
  return renderConverterKey(button, 'currency-key', 'data-currency-action');
}

function renderConverterKey(button, extraClass = 'converter-native-key', actionAttribute = 'data-converter-action') {
  if (!button) {
    return '<div class="currency-keypad-spacer" aria-hidden="true"></div>';
  }
  const content = button.icon === 'backspace' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8L4 12l6-5Zm2.5 3 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.55"/></svg>' : escapeHtml(button.label);
  const valueAttr = button.value ? `data-value="${button.value}"` : '';
  return `<button class="calc-button digit ${extraClass}" ${actionAttribute}="${button.action}" ${valueAttr}>${content}</button>`;
}
