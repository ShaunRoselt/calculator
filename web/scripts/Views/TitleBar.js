import { renderWindowControlIcon } from './ViewIcons.js';

export function renderTitleBar() {
  return `
    <header class="window-chrome">
      <div class="window-brand">
        <img class="window-brand-icon" src="/src/Calculator/Assets/CalculatorAppList.targetsize-32_altform-unplated.png" alt="" />
        <span>Calculator</span>
      </div>
      <div class="window-controls" aria-hidden="true">
        <button class="window-control" tabindex="-1">${renderWindowControlIcon('minimize')}</button>
        <button class="window-control" tabindex="-1">${renderWindowControlIcon('maximize')}</button>
        <button class="window-control close" tabindex="-1">${renderWindowControlIcon('close')}</button>
      </div>
    </header>
  `;
}
