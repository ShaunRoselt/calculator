import { MOCK_CURRENCY_NOTE, UNIT_CATEGORIES } from '../config.js';
import { state } from '../state.js';
import { escapeHtml } from '../utils.js';
import { getUnitsForCategory } from '../logic.js';

export function renderUnitConverterView() {
  const units = getUnitsForCategory(state.converter.category);
  return `
    <div class="form-section">
      <div class="section-header">
        <div>
          <div class="subtitle">Built-in converter collections</div>
          <h3>Unit converter</h3>
        </div>
      </div>
      ${state.converter.category === 'Currency' ? `<div class="currency-banner">${MOCK_CURRENCY_NOTE}</div>` : ''}
      <div class="converter-grid">
        <label class="label-stack full">
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
          <div class="value-output converter-output">${escapeHtml(state.converter.toValue || '0')}</div>
        </div>
        <div class="full converter-swap">
          <button class="aux-button" data-converter-swap="true">Swap units</button>
        </div>
      </div>
    </div>
  `;
}
