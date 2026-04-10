import { state } from '../state.js';

export function renderScientificAngleButtons() {
  return `
    <div class="scientific-angle-operators">
      <button class="angle-toggle active" data-action="cycle-angle" aria-label="Angle unit ${state.scientific.angle}">${state.scientific.angle}</button>
      <button class="exponential-format-toggle ${state.scientific.isExponentialFormat ? 'active' : ''}" data-action="toggle-fe" aria-pressed="${state.scientific.isExponentialFormat ? 'true' : 'false'}">F-E</button>
    </div>
  `;
}
