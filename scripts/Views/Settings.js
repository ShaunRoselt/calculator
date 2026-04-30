import { APP_INFO, getAppName } from '../config.js';
import { getCurrentLanguage, getSupportedLanguages, t } from '../i18n.js';
import { escapeHtml } from '../utils.js';
import { state } from '../state.js';

const SETTINGS_LINKS = [
  {
    labelKey: 'settings.links.repository',
    label: 'Project repository',
    href: 'https://github.com/ShaunRoselt/calculator'
  },
  {
    labelKey: 'settings.links.readme',
    label: 'README',
    href: 'https://github.com/ShaunRoselt/calculator/blob/main/README.md'
  },
  {
    labelKey: 'settings.links.license',
    label: 'MIT license',
    href: 'https://github.com/ShaunRoselt/calculator/blob/main/LICENSE'
  }
];

const SETTINGS_APP_ICONS = {
  light: 'assets/logo-light.svg',
  dark: 'assets/logo-dark.svg'
};

function getSystemTheme() {
  if (typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches === true ? 'light' : 'dark';
}

function getEffectiveTheme() {
  if (state.settings.theme === 'system') {
    return getSystemTheme();
  }

  return state.settings.theme;
}

function getSettingsAppIconPath() {
  return SETTINGS_APP_ICONS[getEffectiveTheme()] ?? SETTINGS_APP_ICONS.dark;
}

export function renderSettingsView() {
  const languages = getSupportedLanguages();
  const currentLanguage = getCurrentLanguage();
  return `
    <section class="settings-page">
      <div class="settings-scroll">
        <div class="settings-group-heading">${t('settings.appearance.group')}</div>
        <details class="settings-expander" open>
          <summary class="settings-expander-summary">
            <span class="settings-expander-icon" aria-hidden="true">◐</span>
            <span class="settings-expander-copy">
              <span class="settings-expander-title">${t('settings.appearance.themeTitle')}</span>
              <span class="settings-expander-description">${t('settings.appearance.themeDescription')}</span>
            </span>
            <span class="settings-expander-arrow" aria-hidden="true"></span>
          </summary>
          <div class="settings-expander-body">
            <label class="settings-radio-option">
              <input type="radio" name="settings-theme" value="light" ${state.settings.theme === 'light' ? 'checked' : ''} />
              <span>${t('settings.appearance.light')}</span>
            </label>
            <label class="settings-radio-option">
              <input type="radio" name="settings-theme" value="dark" ${state.settings.theme === 'dark' ? 'checked' : ''} />
              <span>${t('settings.appearance.dark')}</span>
            </label>
            <label class="settings-radio-option">
              <input type="radio" name="settings-theme" value="system" ${state.settings.theme === 'system' ? 'checked' : ''} />
              <span>${t('settings.appearance.system')}</span>
            </label>
          </div>
        </details>

        <div class="settings-group-heading">${t('settings.language.group')}</div>
        <details class="settings-expander" open>
          <summary class="settings-expander-summary">
            <span class="settings-expander-icon" aria-hidden="true">A</span>
            <span class="settings-expander-copy">
              <span class="settings-expander-title">${t('settings.language.title')}</span>
              <span class="settings-expander-description">${t('settings.language.description')}</span>
            </span>
            <span class="settings-expander-arrow" aria-hidden="true"></span>
          </summary>
          <div class="settings-expander-body">
            ${languages.map((language) => `
              <label class="settings-radio-option">
                <input type="radio" name="settings-language" value="${language.value}" ${currentLanguage === language.value ? 'checked' : ''} />
                <span>${escapeHtml(language.label)}</span>
              </label>
            `).join('')}
          </div>
        </details>

        <div class="settings-group-heading about-heading">${t('settings.about.group')}</div>
        <details class="settings-expander" open>
          <summary class="settings-expander-summary settings-expander-summary-about">
            <img class="settings-app-icon" src="${getSettingsAppIconPath()}" alt="" />
            <span class="settings-expander-copy">
              <span class="settings-expander-title">${escapeHtml(getAppName())}</span>
              <span class="settings-expander-description">${escapeHtml(APP_INFO.version)}</span>
            </span>
            <span class="settings-expander-arrow" aria-hidden="true"></span>
          </summary>
          <div class="settings-expander-body settings-links">
            ${SETTINGS_LINKS.map((link) => `
              <a class="settings-link" href="${link.href}" target="_blank" rel="noreferrer">${escapeHtml(t(link.labelKey) === link.labelKey ? link.label : t(link.labelKey))}</a>
            `).join('')}
          </div>
        </details>

        <a class="settings-feedback-button" href="https://github.com/ShaunRoselt/calculator/issues" target="_blank" rel="noreferrer">${t('settings.feedback')}</a>

        <p class="settings-contribute">
          ${t('settings.contribute.prefix')}
          <a href="https://github.com/ShaunRoselt/calculator" target="_blank" rel="noreferrer">${t('settings.contribute.link')}</a>
          ${t('settings.contribute.suffix')}
        </p>
      </div>
    </section>
  `;
}
