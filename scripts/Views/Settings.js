import { APP_INFO, getAppName } from '../config.js';
import { getCurrentLanguage, getSupportedLanguages, t } from '../i18n.js';
import { getResolvedAppThemeId, getThemeLogoPath, getThemeOptions } from '../themes.js';
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

function getSystemTheme() {
  if (typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches === true ? 'light' : 'dark';
}

function getEffectiveTheme() {
  return getResolvedAppThemeId(state.settings.theme, getSystemTheme());
}

function getSettingsAppIconPath() {
  return getThemeLogoPath(getEffectiveTheme()) ?? 'assets/logo-dark.svg';
}

function getLanguageOptionLabel(language) {
  return `${language.label}${language.isFallbackOnly ? ' (English fallback)' : ''}`;
}

function renderThemePreviewSwatches(colors = []) {
  if (!Array.isArray(colors) || colors.length === 0) {
    return '<span class="settings-theme-option-swatches-spacer" aria-hidden="true"></span>';
  }

  return `
    <span class="settings-theme-option-swatches" aria-hidden="true">
      ${colors.slice(0, 5).map((color) => `<span class="settings-theme-option-swatch" style="background:${escapeHtml(color)}"></span>`).join('')}
    </span>
  `;
}

function renderSettingsMenuOption(menu, option, selected) {
  const searchText = typeof option.searchText === 'string'
    ? option.searchText
    : [option.label, option.value].filter(Boolean).join(' ');
  return `
    <button type="button" class="date-native-mode-option ${selected ? 'selected' : ''}" data-settings-menu-select="${menu}" data-settings-menu-value="${escapeHtml(option.value)}" data-settings-menu-option="${menu}" data-settings-menu-text="${escapeHtml(searchText.toLowerCase())}" role="option" aria-selected="${selected ? 'true' : 'false'}">
      ${menu === 'theme' ? renderThemePreviewSwatches(option.previewColors) : ''}
      <span class="settings-menu-option-label">${escapeHtml(option.label)}</span>
    </button>
  `;
}

function renderSettingsMenu(menu, label, selectedLabel, options) {
  const isOpen = state.settings.openMenu === menu;
  const searchPlaceholder = `Search ${label.toLowerCase()}`;
  return `
    <span class="date-native-select-wrap settings-select-wrap settings-select-menu-wrap">
      <button type="button" class="date-native-select-button settings-select-button ${isOpen ? 'active' : ''}" data-settings-menu-toggle="${menu}" aria-haspopup="listbox" aria-expanded="${isOpen ? 'true' : 'false'}" aria-label="${escapeHtml(label)}">
        <span class="settings-select-button-label">${escapeHtml(selectedLabel)}</span>
      </button>
      <span class="date-native-select-caret ui-caret" aria-hidden="true"></span>
      ${isOpen ? `
        <div class="date-native-mode-menu settings-select-menu">
          <div class="settings-select-search-row">
            <input type="search" class="settings-select-search-input" data-settings-menu-search="${menu}" placeholder="${escapeHtml(searchPlaceholder)}" aria-label="${escapeHtml(searchPlaceholder)}" autocomplete="off" spellcheck="false" autofocus />
          </div>
          <div class="settings-select-menu-options" role="listbox" aria-label="${escapeHtml(label)}">
            ${options.map((option) => renderSettingsMenuOption(menu, option, option.value === (menu === 'theme' ? state.settings.theme : getCurrentLanguage()))).join('')}
            <div class="settings-select-menu-empty" data-settings-menu-empty hidden>No matches</div>
          </div>
        </div>
      ` : ''}
    </span>
  `;
}

export function renderSettingsView() {
  const languages = getSupportedLanguages();
  const themes = getThemeOptions();
  const currentLanguage = getCurrentLanguage();
  const systemThemeId = getResolvedAppThemeId('system', getSystemTheme());
  const systemThemePreviewColors = themes.find((theme) => theme.value === systemThemeId)?.previewColors ?? [];
  const themeOptions = [
    {
      value: 'system',
      label: t('settings.appearance.system'),
      previewColors: systemThemePreviewColors,
      searchText: `${t('settings.appearance.system')} system auto`
    },
    ...themes
  ];
  const currentTheme = themeOptions.find((theme) => theme.value === state.settings.theme) ?? themeOptions[0];
  const currentLanguageOption = languages.find((language) => language.value === currentLanguage) ?? languages[0];
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
            <label class="settings-select-label">
              <span>${t('settings.appearance.themeTitle')}</span>
              ${renderSettingsMenu('theme', t('settings.appearance.themeTitle'), currentTheme.label, themeOptions)}
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
            <label class="settings-select-label">
              <span>${t('settings.language.title')}</span>
              ${renderSettingsMenu('language', t('settings.language.title'), getLanguageOptionLabel(currentLanguageOption), languages.map((language) => ({
                value: language.value,
                label: getLanguageOptionLabel(language),
                searchText: [language.value, language.label, getLanguageOptionLabel(language)].filter(Boolean).join(' ')
              })))}
            </label>
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
