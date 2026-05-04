import { CURRENCY_OPTIONS, UNIT_CATEGORIES, getCategoryLabel, getCurrencyDetails, getCurrencyOptions, getModeMeta, getUnitLabel, isConverterMode } from '../config.js';
import { t } from '../i18n.js';
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

const CONVERTER_SHORT_HEIGHT_BREAKPOINT = 520;
const CONVERTER_SIDE_KEYPAD_MIN_WIDTH = 380;

export function renderUnitConverterView() {
  const units = getUnitsForCategory(state.converter.category);
  const dedicatedCategoryMode = isConverterMode(state.mode);
  const title = dedicatedCategoryMode ? (getModeMeta(state.mode)?.label ?? state.converter.category) : t('converter.unitConverter');
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
          <div class="subtitle">${dedicatedCategoryMode ? t('converter.title') : t('converter.builtInCollections')}</div>
          <h3>${escapeHtml(title)}</h3>
        </div>
      </div>
      <div class="converter-grid">
        <label class="label-stack full ${dedicatedCategoryMode ? 'converter-category-hidden' : ''}">
          <span>${t('converter.category')}</span>
          <select name="converter-category">
            ${Object.keys(UNIT_CATEGORIES).map((category) => `<option value="${category}" ${state.converter.category === category ? 'selected' : ''}>${escapeHtml(getCategoryLabel(category))}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>${t('converter.from')}</span>
          <select name="converter-fromUnit">
            ${units.map((unitOption) => `<option value="${unitOption.name}" ${state.converter.fromUnit === unitOption.name ? 'selected' : ''}>${escapeHtml(getUnitLabel(unitOption.name))}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>${t('converter.to')}</span>
          <select name="converter-toUnit">
            ${units.map((unitOption) => `<option value="${unitOption.name}" ${state.converter.toUnit === unitOption.name ? 'selected' : ''}>${escapeHtml(getUnitLabel(unitOption.name))}</option>`).join('')}
          </select>
        </label>
        <label class="label-stack">
          <span>${t('converter.inputValue')}</span>
          <input type="number" name="converter-fromValue" value="${state.converter.fromValue}" step="any" />
        </label>
        <div class="label-stack">
          <span>${t('converter.convertedValue')}</span>
          <div class="value-output converter-output">${escapeHtml(state.converter.toValue || '0')} ${escapeHtml(units.find((unitOption) => unitOption.name === state.converter.toUnit)?.symbol || '')}</div>
        </div>
        <div class="full converter-swap">
          <button class="aux-button" data-converter-swap="true">${t('converter.swapUnits')}</button>
        </div>
      </div>
    </div>
  `;
}

function renderNativeConverterView(units, title) {
  const fromUnit = units.find((item) => item.name === state.converter.fromUnit) || units[0];
  const toUnit = units.find((item) => item.name === state.converter.toUnit) || units[1] || units[0];
  const aboutEqual = renderConverterReferenceLine(units);
  const layoutClasses = getConverterLayoutClasses('converter-native-layout');

  return `
    <div class="${layoutClasses}" data-converter-title="${escapeHtml(title)}">
      <section class="converter-native-panel">
        <div class="converter-native-values">
          ${renderConverterField('from', fromUnit, getConverterDisplayValue('from'))}
          ${renderConverterField('to', toUnit, getConverterDisplayValue('to'))}
        </div>
        <div class="converter-native-meta ${aboutEqual ? '' : 'empty'}">
          ${aboutEqual ? `<div class="converter-native-meta-label">${t('converter.aboutEqualTo')}</div><div class="converter-native-meta-value">${escapeHtml(aboutEqual)}</div>` : ''}
        </div>
      </section>
      <section class="converter-native-keypad" aria-label="${t('converter.keypad')}">
        ${GENERIC_CONVERTER_KEYPAD.flat().map((button) => renderConverterKey(button)).join('')}
      </section>
    </div>
  `;
}

function renderCurrencyView(units, title) {
  const fromMeta = getCurrencyDetails(state.converter.fromUnit);
  const toMeta = getCurrencyDetails(state.converter.toUnit);
  const fromDisplay = getConverterDisplayValue('from');
  const toDisplay = getConverterDisplayValue('to');
  const rateLine = renderCurrencyRateLine(units, fromMeta, toMeta);
  const updateButtonLabel = state.converter.isUpdatingRates ? t('converter.currency.updatingRates') : t('converter.currency.updateRates');
  const layoutClasses = getConverterLayoutClasses('currency-layout');

  return `
    <div class="${layoutClasses}">
      <section class="currency-panel">
        <div class="currency-values">
          ${renderCurrencyField('from', fromMeta, fromDisplay)}
          ${renderCurrencyField('to', toMeta, toDisplay)}
        </div>
        <div class="currency-meta">
          <div class="currency-meta-line">${rateLine}</div>
          <div class="currency-meta-line">${t('converter.currency.updated', { timestamp: state.converter.currencyUpdatedAt })}</div>
          <div class="currency-meta-line currency-meta-status">${t(state.converter.currencyUpdateMessageKey)}</div>
          <button class="currency-update-button" type="button" data-currency-update-rates="true" ${state.converter.isUpdatingRates ? 'disabled' : ''}>${updateButtonLabel}</button>
        </div>
      </section>
      <section class="currency-keypad" aria-label="${t('converter.currency.keypad')}">
        ${CURRENCY_KEYPAD.flat().map((button) => renderCurrencyKey(button)).join('')}
      </section>
    </div>
  `;
}

function renderConverterField(field, unit, value) {
  const options = getUnitsForCategory(state.converter.category).map((unitOption) => ({
    value: unitOption.name,
    label: getUnitLabel(unitOption.name)
  }));
  return `
    <div class="converter-native-field ${state.converter.lastEdited === field ? 'active' : ''}">
      <button class="converter-native-field-activate" data-converter-active-field="${field}">
        <div class="converter-native-value-row">
          <span class="converter-native-amount">${escapeHtml(value || '0')}</span>
        </div>
      </button>
      ${renderConverterSelect(field, getUnitLabel(unit.name), options, `${field === 'from' ? t('converter.from') : t('converter.to')} ${t('converter.unit').toLowerCase()}`, `${field === 'from' ? t('converter.from') : t('converter.to')} ${t('converter.unitOptions').toLowerCase()}`)}
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
  const options = getCurrencyOptions().map((currency) => ({
    value: currency.name,
    label: currency.label
  }));
  return `
    <div class="currency-field ${state.converter.lastEdited === field ? 'active' : ''}">
      <button class="currency-field-activate" data-converter-active-field="${field}">
        <div class="currency-value-row">
          <span class="currency-symbol">${escapeHtml(meta.symbol)}</span>
          <span class="currency-amount">${escapeHtml(value || '0')}</span>
        </div>
      </button>
      ${renderConverterSelect(field, meta.label, options, `${field === 'from' ? t('converter.from') : t('converter.to')} ${t('converter.currency.currency').toLowerCase()}`, `${field === 'from' ? t('converter.from') : t('converter.to')} ${t('converter.currency.options').toLowerCase()}`)}
    </div>
  `;
}

function renderConverterSelect(field, selectedLabel, options, buttonLabel, menuLabel) {
  const menuOpen = state.converter.openConverterMenu === field;
  return `
    <label class="converter-select-wrap">
      <button type="button" class="converter-select-button ${menuOpen ? 'active' : ''}" data-converter-menu-toggle="${field}" aria-haspopup="listbox" aria-expanded="${menuOpen ? 'true' : 'false'}" aria-label="${buttonLabel}">
        <span class="converter-select-label">${escapeHtml(selectedLabel)}</span>
        <span class="converter-select-caret ui-caret" aria-hidden="true"></span>
      </button>
      ${menuOpen ? renderConverterMenu(field, options, menuLabel) : ''}
    </label>
  `;
}

function renderConverterMenu(field, options, menuLabel) {
  const currentValue = field === 'from' ? state.converter.fromUnit : state.converter.toUnit;
  return `
    <div class="converter-select-menu" role="listbox" aria-label="${menuLabel}">
      ${options.map((option) => renderConverterMenuOption(field, option, option.value === currentValue)).join('')}
    </div>
  `;
}

function renderConverterMenuOption(field, option, selected) {
  return `
    <button
      type="button"
      class="converter-select-option ${selected ? 'selected' : ''}"
      data-converter-option-select="${field}"
      data-converter-option-value="${option.value}"
      role="option"
      aria-selected="${selected ? 'true' : 'false'}"
    >${escapeHtml(option.label)}</button>
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

function getConverterLayoutClasses(baseClass) {
  const isShortHeight = window.innerHeight < CONVERTER_SHORT_HEIGHT_BREAKPOINT;
  const hasSideKeypadSpace = window.innerWidth >= CONVERTER_SIDE_KEYPAD_MIN_WIDTH;
  return [
    baseClass,
    isShortHeight ? 'converter-short-height' : '',
    isShortHeight && hasSideKeypadSpace ? 'converter-side-keypad' : ''
  ].filter(Boolean).join(' ');
}

function renderConverterKey(button, extraClass = 'converter-native-key', actionAttribute = 'data-converter-action') {
  if (!button) {
    return '<div class="currency-keypad-spacer" aria-hidden="true"></div>';
  }
  const content = button.icon === 'backspace' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8L4 12l6-5Zm2.5 3 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.55"/></svg>' : escapeHtml(button.label);
  const valueAttr = button.value ? `data-value="${button.value}"` : '';
  return `<button class="calc-button digit ${extraClass}" ${actionAttribute}="${button.action}" ${valueAttr}>${content}</button>`;
}
