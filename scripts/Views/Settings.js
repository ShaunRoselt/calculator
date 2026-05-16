import { APP_INFO, APP_SHORTCUT_DEFINITIONS, APP_SHORTCUT_DEFAULTS, getAppName } from '../config.js';
import { getCurrentLanguage, getCurrentLocale, getSupportedLanguages, t } from '../i18n.js';
import { getResolvedAppThemeId, getThemeLogoPath, getThemeOptions } from '../themes.js';
import { buildAppUrl } from '../urlParams.js';
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

const ENGLISH_LANGUAGE_DISPLAY_NAMES = typeof Intl?.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'language' })
  : null;
const LANGUAGE_DISPLAY_NAMES_CACHE = new Map();

function isKlingonLanguage(languageCode) {
  return languageCode === 'tlh-Latn' || languageCode === 'tlh-Piqd';
}

function isUnhelpfulLocalizedLanguageName(languageCode, localizedName) {
  return localizedName.localeCompare(languageCode, undefined, { sensitivity: 'base' }) === 0;
}

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

function getLanguageDisplayNames(locale) {
  if (typeof Intl?.DisplayNames !== 'function') {
    return null;
  }

  if (LANGUAGE_DISPLAY_NAMES_CACHE.has(locale)) {
    return LANGUAGE_DISPLAY_NAMES_CACHE.get(locale);
  }

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
    LANGUAGE_DISPLAY_NAMES_CACHE.set(locale, displayNames);
    return displayNames;
  } catch {
    LANGUAGE_DISPLAY_NAMES_CACHE.set(locale, null);
    return null;
  }
}

function getLocalizedLanguageName(languageCode, locale) {
  const displayNames = getLanguageDisplayNames(locale);
  if (!displayNames) {
    return '';
  }

  try {
    return displayNames.of(languageCode) ?? '';
  } catch {
    return '';
  }
}

function getVisibleLanguageLabel(language, locale) {
  const localizedName = isKlingonLanguage(language.value)
    ? ''
    : getLocalizedLanguageName(language.value, locale).trim();
  const baseLabel = !localizedName || isUnhelpfulLocalizedLanguageName(language.value, localizedName)
    ? language.label
    : localizedName;
  return `${baseLabel}${language.isFallbackOnly ? ' (English fallback)' : ''}`;
}

function getLanguageSearchText(language, locale) {
  const englishAlias = getLanguageEnglishAlias(language.value, language.label);
  return [
    language.value,
    language.label,
    getLanguageOptionLabel(language),
    getVisibleLanguageLabel(language, locale),
    englishAlias
  ]
    .filter(Boolean)
    .join(' ');
}

function getLanguageEnglishName(languageCode) {
  if (!ENGLISH_LANGUAGE_DISPLAY_NAMES) {
    return '';
  }

  try {
    return ENGLISH_LANGUAGE_DISPLAY_NAMES.of(languageCode) ?? '';
  } catch {
    return '';
  }
}

function getLanguageEnglishAlias(languageCode, nativeLabel) {
  const englishName = getLanguageEnglishName(languageCode).trim();
  if (!englishName) {
    return '';
  }

  return englishName.localeCompare(nativeLabel, undefined, { sensitivity: 'base' }) === 0
    ? ''
    : englishName;
}

function renderSettingsMenuOption(menu, option, selected) {
  if (menu === 'theme') {
    return renderThemeMenuOption(option, selected);
  }

  const searchText = typeof option.searchText === 'string'
    ? option.searchText
    : [option.label, option.value].filter(Boolean).join(' ');
  return `
    <button type="button" class="date-native-mode-option ${selected ? 'selected' : ''}" data-settings-menu-select="${menu}" data-settings-menu-value="${escapeHtml(option.value)}" data-settings-menu-option="${menu}" data-settings-menu-text="${escapeHtml(searchText.toLowerCase())}" role="option" aria-selected="${selected ? 'true' : 'false'}">
      <span class="settings-menu-option-label">${escapeHtml(option.label)}</span>
    </button>
  `;
}

function renderThemeMenuOption(option, selected) {
  const searchText = typeof option.searchText === 'string'
    ? option.searchText
    : [option.label, option.value].filter(Boolean).join(' ');

  return `
    <div class="settings-theme-card ${selected ? 'selected' : ''}" data-settings-menu-option="theme" data-settings-menu-text="${escapeHtml(searchText.toLowerCase())}" role="option" aria-selected="${selected ? 'true' : 'false'}">
      <iframe class="settings-theme-card-frame" src="${escapeHtml(option.previewUrl)}" title="${escapeHtml(option.label)}" loading="lazy" tabindex="-1" aria-hidden="true"></iframe>
      <button type="button" class="settings-theme-card-button" data-settings-menu-select="theme" data-settings-menu-value="${escapeHtml(option.value)}" aria-label="${escapeHtml(option.label)}" aria-pressed="${selected ? 'true' : 'false'}">
        <span class="settings-theme-card-header">
          <span class="settings-theme-card-title-wrap">
            <span class="settings-theme-card-title">${escapeHtml(option.label)}</span>
            ${option.description ? `<span class="settings-theme-card-caption">${escapeHtml(option.description)}</span>` : ''}
          </span>
          ${selected ? '<span class="settings-theme-card-selected" aria-hidden="true">✓</span>' : ''}
        </span>
      </button>
    </div>
  `;
}

function renderSettingsMenu(menu, label, selectedLabel, options) {
  const isOpen = state.settings.openMenu === menu;
  const isThemeMenu = menu === 'theme';
  const searchPlaceholder = isThemeMenu ? t('settings.appearance.searchThemes') : t('settings.language.search');
  return `
    <span class="date-native-select-wrap settings-select-wrap settings-select-menu-wrap ${isThemeMenu ? 'settings-select-wrap-theme' : ''}">
      <button type="button" class="date-native-select-button settings-select-button ${isOpen ? 'active' : ''}" data-settings-menu-toggle="${menu}" aria-haspopup="listbox" aria-expanded="${isOpen ? 'true' : 'false'}" aria-label="${escapeHtml(label)}">
        <span class="settings-select-button-label">${escapeHtml(selectedLabel)}</span>
      </button>
      <span class="date-native-select-caret ui-caret" aria-hidden="true"></span>
      ${isOpen ? `
        <div class="date-native-mode-menu settings-select-menu ${isThemeMenu ? 'settings-select-menu-theme' : ''}">
          <div class="settings-select-search-row">
            <input type="search" class="settings-select-search-input" data-settings-menu-search="${menu}" placeholder="${escapeHtml(searchPlaceholder)}" aria-label="${escapeHtml(searchPlaceholder)}" autocomplete="off" spellcheck="false" />
          </div>
          <div class="settings-select-menu-options ${isThemeMenu ? 'settings-select-menu-options-theme' : ''}" role="listbox" aria-label="${escapeHtml(label)}">
            ${options.map((option) => renderSettingsMenuOption(menu, option, option.value === (menu === 'theme' ? state.settings.theme : getCurrentLanguage()))).join('')}
            <div class="settings-select-menu-empty" data-settings-menu-empty hidden>No matches</div>
          </div>
        </div>
      ` : ''}
    </span>
  `;
}

function renderSettingsPreferenceItem(title, description, controlMarkup, icon = '•') {
  return `
    <div class="settings-preference-item">
      <span class="settings-preference-icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <div class="settings-preference-content">
        <span class="settings-preference-copy">
          <span class="settings-preference-title">${escapeHtml(title)}</span>
          <span class="settings-preference-description">${escapeHtml(description)}</span>
        </span>
        <div class="settings-preference-control">
          ${controlMarkup}
        </div>
      </div>
    </div>
  `;
}

function renderSettingsToggleControl(setting, title, enabled, labels = {}) {
  const statusLabel = enabled
    ? (labels.enabled ?? t('settings.calculation.enabled'))
    : (labels.disabled ?? t('settings.calculation.disabled'));
  return `
    <div class="settings-toggle-row">
      <button type="button" class="settings-toggle-button ${enabled ? 'active' : ''}" data-settings-toggle="${escapeHtml(setting)}" aria-pressed="${enabled ? 'true' : 'false'}" aria-label="${escapeHtml(title)}">
        <span class="settings-toggle-track" aria-hidden="true">
          <span class="settings-toggle-thumb"></span>
        </span>
        <span class="settings-toggle-status">${escapeHtml(statusLabel)}</span>
      </button>
    </div>
  `;
}

function renderShortcutRow(definition) {
  const isCapturing = state.settings.activeShortcutId === definition.id;
  const currentBinding = state.settings.shortcuts[definition.id] ?? APP_SHORTCUT_DEFAULTS[definition.id] ?? definition.defaultBinding;
  const desc = t(definition.descriptionKey);
  return `
    <div class="settings-shortcut-row">
      <span class="settings-shortcut-copy">
        <span class="settings-shortcut-title">${escapeHtml(t(definition.labelKey))}</span>
      </span>
      <span class="settings-shortcut-actions">
        <button type="button" class="settings-shortcut-button ${isCapturing ? 'active' : ''}" data-settings-shortcut-capture="${escapeHtml(definition.id)}" aria-pressed="${isCapturing ? 'true' : 'false'}" title="${escapeHtml(desc)}" aria-label="${escapeHtml(t(definition.labelKey) + ' - ' + desc)}">
          ${escapeHtml(isCapturing ? t('settings.shortcuts.recording') : currentBinding)}
        </button>
        <button type="button" class="settings-shortcut-reset" data-settings-shortcut-reset="${escapeHtml(definition.id)}">
          ${escapeHtml(t('settings.shortcuts.reset'))}
        </button>
      </span>
    </div>
  `;
}

export function renderSettingsView() {
  const languages = getSupportedLanguages();
  const themes = getThemeOptions();
  const currentLanguage = getCurrentLanguage();
  const currentLocale = getCurrentLocale();
  const languageSorter = new Intl.Collator(currentLocale, { sensitivity: 'base', numeric: true });
  const languageOptions = languages
    .map((language) => ({
      value: language.value,
      label: getVisibleLanguageLabel(language, currentLocale),
      searchText: getLanguageSearchText(language, currentLocale)
    }))
    .sort((left, right) => languageSorter.compare(left.label, right.label));
  const currentLanguageOption = languageOptions.find((language) => language.value === currentLanguage) ?? languageOptions[0];
  const systemThemeId = getResolvedAppThemeId('system', getSystemTheme());
  const systemThemeLabel = themes.find((theme) => theme.value === systemThemeId)?.label ?? systemThemeId;
  const themeOptions = [
    {
      value: 'system',
      label: t('settings.appearance.system'),
      description: systemThemeLabel,
      searchText: `${t('settings.appearance.system')} system auto ${systemThemeLabel}`,
      previewUrl: buildAppUrl({
        page: 'standard',
        theme: systemThemeId,
        language: currentLanguage,
        readOnly: true
      })
    },
    ...themes.map((theme) => ({
      ...theme,
      previewUrl: buildAppUrl({
        page: 'standard',
        theme: theme.value,
        language: currentLanguage,
        readOnly: true
      })
    }))
  ];
  const currentTheme = themeOptions.find((theme) => theme.value === state.settings.theme) ?? themeOptions[0];
  return `
    <section class="settings-page">
      <div class="settings-scroll">
        <details class="settings-expander">
          <summary class="settings-expander-summary">
            <span class="settings-expander-icon" aria-hidden="true">⚙</span>
            <span class="settings-expander-copy">
              <span class="settings-expander-title">${t('settings.preferences.group')}</span>
              <span class="settings-expander-description">${t('settings.preferences.description')}</span>
            </span>
            <span class="settings-expander-arrow" aria-hidden="true"></span>
          </summary>
          <div class="settings-expander-body">
            ${renderSettingsPreferenceItem(
              t('settings.appearance.themeTitle'),
              t('settings.appearance.themeDescription'),
              `<div class="settings-select-label">${renderSettingsMenu('theme', t('settings.appearance.themeTitle'), currentTheme.label, themeOptions)}</div>`,
              '◐'
            )}
            ${renderSettingsPreferenceItem(
              t('settings.language.title'),
              t('settings.language.description'),
              `<div class="settings-select-label">${renderSettingsMenu('language', t('settings.language.title'), currentLanguageOption.label, languageOptions)}</div>`,
              'A'
            )}
            ${renderSettingsPreferenceItem(
              t('settings.calculation.repeatEqualsTitle'),
              t('settings.calculation.repeatEqualsDescription'),
              renderSettingsToggleControl('repeatEquals', t('settings.calculation.repeatEqualsTitle'), state.settings.repeatEquals),
              '='
            )}
          </div>
        </details>

        <details class="settings-expander">
          <summary class="settings-expander-summary">
            <span class="settings-expander-icon" aria-hidden="true">⌘</span>
            <span class="settings-expander-copy">
              <span class="settings-expander-title">${t('settings.shortcuts.title')}</span>
              <span class="settings-expander-description">${t('settings.shortcuts.description')}</span>
            </span>
            <span class="settings-expander-arrow" aria-hidden="true"></span>
          </summary>
          <div class="settings-expander-body">
            <p class="settings-shortcut-helper">${escapeHtml(t('settings.shortcuts.helper'))}</p>
            ${state.settings.shortcutError ? `<p class="settings-shortcut-feedback" role="status">${escapeHtml(state.settings.shortcutError)}</p>` : ''}
            <div class="settings-shortcut-list">
              ${APP_SHORTCUT_DEFINITIONS.map((definition) => renderShortcutRow(definition)).join('')}
            </div>
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
