import { APP_INFO } from '../config.js';
import { escapeHtml } from '../utils.js';
import { state } from '../state.js';

const SETTINGS_LINKS = [
  {
    label: 'Project repository',
    href: 'https://github.com/ShaunRoselt/calculator'
  },
  {
    label: 'MIT license',
    href: 'https://github.com/ShaunRoselt/calculator/blob/main/LICENSE'
  },
  {
    label: 'Microsoft privacy statement',
    href: 'https://go.microsoft.com/fwlink/?LinkID=521839'
  }
];

export function renderSettingsView() {
  return `
    <section class="settings-page">
      <div class="settings-scroll">
        <div class="settings-group-heading">Appearance</div>
        <details class="settings-expander" open>
          <summary class="settings-expander-summary">
            <span class="settings-expander-icon" aria-hidden="true">◐</span>
            <span class="settings-expander-copy">
              <span class="settings-expander-title">App theme</span>
              <span class="settings-expander-description">Choose light, dark, or use the system setting.</span>
            </span>
          </summary>
          <div class="settings-expander-body">
            <label class="settings-radio-option">
              <input type="radio" name="settings-theme" value="light" ${state.settings.theme === 'light' ? 'checked' : ''} />
              <span>Light</span>
            </label>
            <label class="settings-radio-option">
              <input type="radio" name="settings-theme" value="dark" ${state.settings.theme === 'dark' ? 'checked' : ''} />
              <span>Dark</span>
            </label>
            <label class="settings-radio-option">
              <input type="radio" name="settings-theme" value="system" ${state.settings.theme === 'system' ? 'checked' : ''} />
              <span>Use system setting</span>
            </label>
          </div>
        </details>

        <div class="settings-group-heading about-heading">About</div>
        <details class="settings-expander" open>
          <summary class="settings-expander-summary settings-expander-summary-about">
            <img class="settings-app-icon" src="/src/Calculator/Assets/CalculatorAppList.targetsize-32_altform-unplated.png" alt="" />
            <span class="settings-expander-copy">
              <span class="settings-expander-title">${escapeHtml(APP_INFO.name)}</span>
              <span class="settings-expander-description">${escapeHtml(APP_INFO.version)}</span>
            </span>
          </summary>
          <div class="settings-expander-body settings-links">
            ${SETTINGS_LINKS.map((link) => `
              <a class="settings-link" href="${link.href}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>
            `).join('')}
          </div>
        </details>

        <a class="settings-feedback-button" href="https://github.com/ShaunRoselt/calculator/issues" target="_blank" rel="noreferrer">Send Feedback</a>

        <p class="settings-contribute">
          Want to help improve Calculator? Visit the
          <a href="https://github.com/ShaunRoselt/calculator" target="_blank" rel="noreferrer">GitHub project</a>
          to follow development and contribute.
        </p>
      </div>
    </section>
  `;
}
