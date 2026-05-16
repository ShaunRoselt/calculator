import { state } from '../state.js';
import { t } from '../i18n.js';

export function renderScientificAngleButtons() {
  const angleTooltip = t('calculator.scientific.angleUnit', { value: state.scientific.angle });
  return `
    <div class="scientific-angle-operators">
      <button class="angle-toggle active" data-action="cycle-angle" data-tooltip="${angleTooltip}" aria-label="${angleTooltip}">${state.scientific.angle}</button>
      <button class="exponential-format-toggle ${state.scientific.isExponentialFormat ? 'active' : ''}" data-action="toggle-fe" data-tooltip="${t('calculator.scientific.exponentialFormat')}" aria-pressed="${state.scientific.isExponentialFormat ? 'true' : 'false'}">F-E</button>
    </div>
  `;
}
