import { getProgrammerBitColumns, getProgrammerBitValue } from '../logic.js';
import { t } from '../i18n.js';

export function renderProgrammerBitFlipPanel() {
  const bits = getProgrammerBitColumns();
  const groups = [];
  for (let index = 0; index < bits.length; index += 4) {
    groups.push(bits.slice(index, index + 4));
  }
  return `
    <div class="programmer-bitflip-panel" aria-label="${t('programmer.bitFlipPanel')}">
      ${groups.map((group) => `
        <div class="bitflip-group">
          <div class="bitflip-label-row">
            ${group.map((bit) => `<span class="bitflip-label">${bit}</span>`).join('')}
          </div>
          <div class="bitflip-value-row">
            ${group.map((bit) => `
              <button class="bitflip-cell ${getProgrammerBitValue(bit) ? 'active' : ''}" data-action="flip-bit" data-value="${bit}" aria-pressed="${getProgrammerBitValue(bit) ? 'true' : 'false'}">
                ${getProgrammerBitValue(bit)}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
