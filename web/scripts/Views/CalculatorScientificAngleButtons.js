import { state } from '../state.js';

const SCIENTIFIC_ANGLE_OPTIONS = ['DEG', 'RAD', 'GRAD'];

export function renderScientificAngleButtons() {
  return `
    <div class="scientific-angle-operators">
      ${SCIENTIFIC_ANGLE_OPTIONS.map((angle) => `
        <button class="angle-toggle ${state.scientific.angle === angle ? 'active' : ''}" data-action="set-angle" data-value="${angle}">${angle}</button>
      `).join('')}
      <button class="fe-toggle ${state.scientific.isExponentialFormat ? 'active' : ''}" data-action="toggle-fe" aria-pressed="${state.scientific.isExponentialFormat ? 'true' : 'false'}">F-E</button>
    </div>
  `;
}
