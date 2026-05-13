import { DEFAULT_MODE, STORAGE_KEYS, isMode } from './config.js';
import { getCurrentLocale, getDefaultLanguage, getSupportedLanguages, initI18n, t } from './i18n.js';
import { applyThemeToElement, getResolvedAppThemeId, getThemeLogoPath, getThemeOptions, initThemes } from './themes.js';
import { buildAppUrl } from './urlParams.js';

const FALLBACK_COPY = {
  themes: 'Themes',
  updates: 'Updates',
  launchCalculator: 'Launch Calculator',
  launchCalculatorNewTab: 'Launch Calculator in a new tab',
  noMatches: 'No matches',
  primaryNavigation: 'Primary navigation',
  home: 'Roselt Calculator home',
  language: 'Language',
  languageSearch: 'Search languages',
  theme: 'Theme',
  themeSearch: 'Search themes',
  systemTheme: 'System',
  loadingLanguages: 'Loading languages...',
  loadingThemes: 'Loading themes...'
};

const ENGLISH_LANGUAGE_DISPLAY_NAMES = typeof Intl?.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'language' })
  : null;
const LANGUAGE_DISPLAY_NAMES_CACHE = new Map();
const LATIN_AMERICAN_SPANISH_REGIONS = new Set(['AR', 'BO', 'BR', 'BZ', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GT', 'GY', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'US', 'UY', 'VE']);

function normalizeLocaleCandidate(locale) {
  return typeof locale === 'string' ? locale.trim().replaceAll('_', '-') : '';
}

function getLocaleParts(locale) {
  const normalizedLocale = normalizeLocaleCandidate(locale);
  if (!normalizedLocale) {
    return { language: '', region: '', script: '' };
  }

  if (typeof Intl?.Locale === 'function') {
    try {
      const intlLocale = new Intl.Locale(normalizedLocale).maximize();
      return {
        language: intlLocale.language?.toLowerCase() ?? '',
        region: intlLocale.region?.toUpperCase() ?? '',
        script: intlLocale.script?.toLowerCase() ?? ''
      };
    } catch {
      // Fall through to basic parsing.
    }
  }

  const [language = '', second = '', third = ''] = normalizedLocale.split('-');
  const inferredRegion = second.length === 2 ? second : third.length === 2 ? third : '';
  const inferredScript = second.length === 4 ? second : '';
  return {
    language: language.toLowerCase(),
    region: inferredRegion.toUpperCase(),
    script: inferredScript.toLowerCase()
  };
}

function getPreferredBrowserLocales() {
  const localeCandidates = [];

  if (Array.isArray(window.navigator?.languages)) {
    localeCandidates.push(...window.navigator.languages);
  }

  if (typeof window.navigator?.language === 'string') {
    localeCandidates.push(window.navigator.language);
  }

  if (typeof Intl?.DateTimeFormat === 'function') {
    const resolvedLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
    if (resolvedLocale) {
      localeCandidates.push(resolvedLocale);
    }
  }

  return [...new Set(localeCandidates.map(normalizeLocaleCandidate).filter(Boolean))];
}

function isKlingonLanguage(languageCode) {
  return languageCode === 'tlh-Latn' || languageCode === 'tlh-Piqd';
}

function isUnhelpfulLocalizedLanguageName(languageCode, localizedName) {
  return localizedName.localeCompare(languageCode, undefined, { sensitivity: 'base' }) === 0;
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
    getVisibleLanguageLabel(language, locale),
    englishAlias
  ]
    .filter(Boolean)
    .join(' ');
}

function normalizePage(page) {
  return typeof page === 'string' && isMode(page.trim().toLowerCase()) ? page.trim().toLowerCase() : DEFAULT_MODE;
}

function translateWithFallback(key, fallback, replacements) {
  const translated = t(key, replacements);
  return typeof translated === 'string' && translated !== key ? translated : fallback;
}

export function buildBinaryGrid(target, tokens = ['0', '1', 'ROSELT', 'CALCULATOR', 'STANDARD', 'GRAPHING', 'THEME', 'LANGUAGE'], rows = 170, columns = 108) {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const builtRows = [];
  for (let row = 0; row < rows; row += 1) {
    const parts = [];
    for (let column = 0; column < columns; column += 1) {
      const randomValue = Math.random();
      if (randomValue > 0.987) {
        parts.push(tokens[Math.floor(Math.random() * tokens.length)]);
      } else {
        parts.push(Math.random() > 0.5 ? '1' : '0');
      }
    }
    builtRows.push(parts.join(' '));
  }

  target.textContent = builtRows.join('\n');
}

export async function initPublicPage({
  buildPageCopy = () => ({}),
  applyPageState = () => {},
  onThemeApplied = () => {}
} = {}) {
  const pageHeader = document.querySelector('.page-header');
  const headerInner = document.querySelector('.page-header__inner');
  const brandLink = document.querySelector('.page-header__brand');
  const brandImage = brandLink?.querySelector('img');
  const primaryNav = document.querySelector('[data-primary-nav]');
  const themesLink = document.querySelector('[data-themes-link]');
  const updatesLink = document.querySelector('[data-updates-link]');
  const languageToggle = document.querySelector('[data-menu-toggle="language"]');
  const themeToggle = document.querySelector('[data-menu-toggle="theme"]');
  const languageMenu = document.querySelector('[data-menu-panel="language"]');
  const themeMenu = document.querySelector('[data-menu-panel="theme"]');
  const launchLink = document.querySelector('[data-launch-link]');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const favicon = document.getElementById('page-favicon');
  const systemThemeMedia = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

  if (!(brandLink instanceof HTMLAnchorElement)
    || !(brandImage instanceof HTMLImageElement)
    || !(primaryNav instanceof HTMLElement)
    || !(updatesLink instanceof HTMLAnchorElement)
    || !(languageToggle instanceof HTMLButtonElement)
    || !(themeToggle instanceof HTMLButtonElement)
    || !(languageMenu instanceof HTMLElement)
    || !(themeMenu instanceof HTMLElement)
    || !(launchLink instanceof HTMLAnchorElement)) {
    throw new Error('Missing shared public-page header elements.');
  }

  let rawLanguageOptions = [];
  let languageOptions = [];
  let baseThemeOptions = [];
  let themeOptions = [];
  let currentLanguageId = getDefaultLanguage();
  let currentThemeSetting = 'system';
  let currentResolvedThemeId = 'dark';
  let currentAppPage = DEFAULT_MODE;
  let currentCopy = { ...FALLBACK_COPY };
  let openMenuId = null;
  let headerLayoutFrame = null;

  function isLocalPublicContext() {
    const hostname = window.location.hostname;
    return window.location.protocol === 'file:'
      || hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '0.0.0.0'
      || hostname === '::1'
      || hostname === '[::1]'
      || hostname.endsWith('.localhost');
  }

  function getSystemThemeId() {
    return systemThemeMedia?.matches === true ? 'light' : 'dark';
  }

  function syncHeaderOffset() {
    if (!(pageHeader instanceof HTMLElement)) {
      return;
    }

    const measuredHeight = Math.max(74, Math.ceil(pageHeader.getBoundingClientRect().height));
    document.documentElement.style.setProperty('--header-height', `${measuredHeight}px`);
  }

  function updateHeaderLayout() {
    if (!(pageHeader instanceof HTMLElement) || !(headerInner instanceof HTMLElement)) {
      syncHeaderOffset();
      return;
    }

    pageHeader.classList.remove('page-header--stacked');
    const needsStackedLayout = headerInner.scrollWidth > headerInner.clientWidth + 1;
    pageHeader.classList.toggle('page-header--stacked', needsStackedLayout);
    syncHeaderOffset();
  }

  function scheduleHeaderLayoutUpdate() {
    if (typeof window.requestAnimationFrame !== 'function') {
      updateHeaderLayout();
      return;
    }

    if (headerLayoutFrame !== null) {
      window.cancelAnimationFrame(headerLayoutFrame);
    }

    headerLayoutFrame = window.requestAnimationFrame(() => {
      headerLayoutFrame = null;
      updateHeaderLayout();
    });
  }

  function findSupportedLanguageByValue(languageId) {
    if (typeof languageId !== 'string' || !languageId.trim()) {
      return null;
    }

    const normalizedLanguageId = languageId.trim().toLowerCase();
    return rawLanguageOptions.find((option) => option.value.toLowerCase() === normalizedLanguageId)?.value ?? null;
  }

  function resolveBrowserLanguageId() {
    for (const locale of getPreferredBrowserLocales()) {
      const exactMatch = findSupportedLanguageByValue(locale);
      if (exactMatch) {
        return exactMatch;
      }

      const { language, region, script } = getLocaleParts(locale);
      if (!language) {
        continue;
      }

      if (language === 'zh') {
        return script === 'hant' || ['HK', 'MO', 'TW'].includes(region) ? 'zh-Hant' : 'zh-Hans';
      }

      if (language === 'es') {
        return LATIN_AMERICAN_SPANISH_REGIONS.has(region) ? 'es-419' : 'es-ES';
      }

      if (language === 'pt') {
        return region === 'BR' ? 'pt-BR' : 'pt-PT';
      }

      const baseMatch = findSupportedLanguageByValue(language);
      if (baseMatch) {
        return baseMatch;
      }

      const prefixedMatch = rawLanguageOptions.find((option) => option.value.toLowerCase().startsWith(`${language}-`));
      if (prefixedMatch) {
        return prefixedMatch.value;
      }
    }

    return getDefaultLanguage();
  }

  function getStoredPreference(primaryKey, secondaryKey) {
    const primaryValue = window.localStorage.getItem(primaryKey);
    if (typeof primaryValue === 'string' && primaryValue.trim()) {
      return primaryValue.trim();
    }

    const secondaryValue = window.localStorage.getItem(secondaryKey);
    return typeof secondaryValue === 'string' && secondaryValue.trim() ? secondaryValue.trim() : null;
  }

  function getRequestedLanguageId() {
    const params = new URLSearchParams(window.location.search);
    const requestedQueryLanguage = findSupportedLanguageByValue(params.get('language'));
    if (requestedQueryLanguage) {
      return requestedQueryLanguage;
    }

    const storedLanguage = findSupportedLanguageByValue(getStoredPreference('roselt-website-language', STORAGE_KEYS.language));
    return storedLanguage ?? resolveBrowserLanguageId();
  }

  function getRequestedThemeSetting() {
    const params = new URLSearchParams(window.location.search);
    const queryTheme = params.get('theme');
    if (typeof queryTheme === 'string' && queryTheme.trim()) {
      return queryTheme.trim();
    }

    return getStoredPreference('roselt-website-theme', STORAGE_KEYS.theme) ?? 'system';
  }

  function getRequestedAppPage() {
    const params = new URLSearchParams(window.location.search);
    const requestedPage = params.get('page');
    if (requestedPage) {
      return normalizePage(requestedPage);
    }

    return normalizePage(window.localStorage.getItem(STORAGE_KEYS.page) ?? DEFAULT_MODE);
  }

  function isSupportedThemeSetting(themeId) {
    return themeId === 'system' || baseThemeOptions.some((theme) => theme.value === themeId);
  }

  function normalizeThemeSetting(themeId) {
    return isSupportedThemeSetting(themeId) ? themeId : 'system';
  }

  function buildLocalizedLanguageOptions(locale) {
    return rawLanguageOptions.map((language) => ({
      ...language,
      label: getVisibleLanguageLabel(language, locale),
      searchText: getLanguageSearchText(language, locale)
    }));
  }

  function buildCopy() {
    const translate = (key, fallback, replacements) => translateWithFallback(key, fallback, replacements);
    return {
      themes: translate('themesPage.summary.themeCountLabel', FALLBACK_COPY.themes),
      updates: translate('landingPage.header.updates', FALLBACK_COPY.updates),
      launchCalculator: translate('landingPage.header.launchCalculator', FALLBACK_COPY.launchCalculator),
      launchCalculatorNewTab: translate('landingPage.header.launchCalculatorNewTab', FALLBACK_COPY.launchCalculatorNewTab),
      noMatches: translate('landingPage.menus.noMatches', FALLBACK_COPY.noMatches),
      primaryNavigation: translate('landingPage.header.primaryNavigation', FALLBACK_COPY.primaryNavigation),
      home: translate('landingPage.header.home', FALLBACK_COPY.home),
      language: translate('settings.language.title', FALLBACK_COPY.language),
      languageSearch: translate('settings.language.search', FALLBACK_COPY.languageSearch),
      theme: translate('settings.appearance.themeTitle', FALLBACK_COPY.theme),
      themeSearch: translate('settings.appearance.searchThemes', FALLBACK_COPY.themeSearch),
      systemTheme: translate('settings.appearance.system', FALLBACK_COPY.systemTheme),
      loadingLanguages: translate('landingPage.menus.loadingLanguages', FALLBACK_COPY.loadingLanguages),
      loadingThemes: translate('landingPage.menus.loadingThemes', FALLBACK_COPY.loadingThemes),
      ...buildPageCopy(translate)
    };
  }

  function buildThemeOptions() {
    const systemThemeId = getResolvedAppThemeId('system', getSystemThemeId());
    const systemThemeLabel = baseThemeOptions.find((theme) => theme.value === systemThemeId)?.label ?? systemThemeId;
    return [
      {
        value: 'system',
        label: currentCopy.systemTheme,
        searchText: `${currentCopy.systemTheme} system auto ${systemThemeLabel}`
      },
      ...baseThemeOptions
    ];
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('page', currentAppPage);
    url.searchParams.set('theme', currentThemeSetting);
    url.searchParams.set('language', currentLanguageId);
    window.history.replaceState({}, '', url);
  }

  function buildAppHref({ page = currentAppPage, theme = currentThemeSetting, language = currentLanguageId, readOnly = false } = {}) {
    return buildAppUrl({ page, theme, language, readOnly });
  }

  function getMenuElements(menuId) {
    return menuId === 'language'
      ? { toggle: languageToggle, menu: languageMenu }
      : { toggle: themeToggle, menu: themeMenu };
  }

  function updateToggleLabel(menuId, label) {
    const { toggle } = getMenuElements(menuId);
    const labelElement = toggle.querySelector('.settings-select-button-label');
    if (labelElement) {
      labelElement.textContent = label;
    }
    toggle.title = label;
  }

  function renderMenuOptions(menuId, options, selectedValue) {
    const { menu } = getMenuElements(menuId);
    const menuLabel = menuId === 'language' ? currentCopy.language : currentCopy.theme;
    const searchPlaceholder = menuId === 'language' ? currentCopy.languageSearch : currentCopy.themeSearch;
    menu.replaceChildren();
    menu.setAttribute('aria-label', menuLabel);

    const searchRow = document.createElement('div');
    searchRow.className = 'settings-select-search-row';

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'settings-select-search-input';
    searchInput.dataset.menuSearch = menuId;
    searchInput.placeholder = searchPlaceholder;
    searchInput.setAttribute('aria-label', searchPlaceholder);
    searchInput.autocomplete = 'off';
    searchInput.spellcheck = false;
    searchRow.append(searchInput);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'settings-select-menu-options';
    optionsContainer.dataset.menuOptions = menuId;
    optionsContainer.role = 'listbox';
    optionsContainer.setAttribute('aria-label', menuLabel);

    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `date-native-mode-option${option.value === selectedValue ? ' selected' : ''}`;
      button.dataset.menuOption = menuId;
      button.dataset.value = option.value;
      button.dataset.menuText = `${option.searchText ?? option.label} ${option.value}`.toLowerCase();
      button.role = 'option';
      button.ariaSelected = option.value === selectedValue ? 'true' : 'false';

      const label = document.createElement('span');
      label.className = 'settings-menu-option-label';
      label.textContent = option.label;
      button.append(label);
      optionsContainer.append(button);
    }

    const emptyState = document.createElement('div');
    emptyState.className = 'settings-select-menu-empty';
    emptyState.dataset.menuEmpty = menuId;
    emptyState.hidden = true;
    emptyState.textContent = currentCopy.noMatches;

    menu.append(searchRow, optionsContainer, emptyState);
  }

  function filterMenuOptions(menuId, searchText) {
    const { menu } = getMenuElements(menuId);
    const normalizedSearch = searchText.trim().toLowerCase();
    const optionButtons = menu.querySelectorAll('[data-menu-option]');
    let visibleCount = 0;

    for (const button of optionButtons) {
      const isMatch = !normalizedSearch || button.dataset.menuText.includes(normalizedSearch);
      button.hidden = !isMatch;
      if (isMatch) {
        visibleCount += 1;
      }
    }

    const emptyState = menu.querySelector('[data-menu-empty]');
    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
    }
  }

  function closeMenus() {
    openMenuId = null;

    for (const menuId of ['language', 'theme']) {
      const { toggle, menu } = getMenuElements(menuId);
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }
  }

  function toggleMenu(menuId) {
    if (openMenuId === menuId) {
      closeMenus();
      return;
    }

    closeMenus();
    const { toggle, menu } = getMenuElements(menuId);
    renderMenuOptions(menuId, menuId === 'language' ? languageOptions : themeOptions, menuId === 'language' ? currentLanguageId : currentThemeSetting);
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    openMenuId = menuId;

    const searchInput = menu.querySelector('[data-menu-search]');
    if (searchInput instanceof HTMLInputElement) {
      searchInput.value = '';
      filterMenuOptions(menuId, '');
      requestAnimationFrame(() => searchInput.focus());
    }
  }

  function getContext() {
    return {
      copy: currentCopy,
      currentLanguageId,
      currentThemeSetting,
      currentResolvedThemeId,
      currentAppPage,
      languageOptions,
      baseThemeOptions,
      themeOptions,
      buildAppHref,
      translateWithFallback,
      currentLocale: getCurrentLocale()
    };
  }

  function applyCommonCopy() {
    primaryNav.setAttribute('aria-label', currentCopy.primaryNavigation);
    brandLink.setAttribute('aria-label', currentCopy.home);
    if (themesLink instanceof HTMLAnchorElement) {
      themesLink.hidden = !isLocalPublicContext();
      themesLink.textContent = currentCopy.themes;
      themesLink.href = 'themes.html';
    }
    updatesLink.textContent = currentCopy.updates;
    launchLink.textContent = currentCopy.launchCalculator;
    launchLink.setAttribute('aria-label', currentCopy.launchCalculatorNewTab);
    launchLink.title = currentCopy.launchCalculatorNewTab;
    languageToggle.setAttribute('aria-label', currentCopy.language);
    languageMenu.setAttribute('aria-label', currentCopy.language);
    themeToggle.setAttribute('aria-label', currentCopy.theme);
    themeMenu.setAttribute('aria-label', currentCopy.theme);
  }

  function updateLaunchLink() {
    launchLink.href = buildAppHref();
  }

  function applyTheme(themeSetting) {
    const normalizedThemeSetting = normalizeThemeSetting(themeSetting);
    const resolvedThemeId = getResolvedAppThemeId(normalizedThemeSetting, getSystemThemeId());
    const activeTheme = applyThemeToElement(document.documentElement, resolvedThemeId);
    if (!activeTheme) {
      return;
    }

    currentThemeSetting = normalizedThemeSetting;
    currentResolvedThemeId = activeTheme.id;
    window.localStorage.setItem('roselt-website-theme', normalizedThemeSetting);
    window.localStorage.setItem(STORAGE_KEYS.theme, normalizedThemeSetting);
    syncUrl();
    updateLaunchLink();
    updateToggleLabel('theme', themeOptions.find((theme) => theme.value === currentThemeSetting)?.label ?? activeTheme.label ?? currentThemeSetting);
    renderMenuOptions('theme', themeOptions, currentThemeSetting);

    if (themeColorMeta) {
      themeColorMeta.content = activeTheme.metaColor ?? '#1f2025';
    }

    const themeLogoPath = getThemeLogoPath(activeTheme.id);
    brandImage.src = themeLogoPath;
    if (favicon instanceof HTMLLinkElement) {
      favicon.href = themeLogoPath;
    }

    onThemeApplied(getContext());
    applyPageState(getContext());
    scheduleHeaderLayoutUpdate();
  }

  async function applyLanguage(languageId) {
    currentLanguageId = findSupportedLanguageByValue(languageId) ?? getDefaultLanguage();
    await initI18n(currentLanguageId);
    languageOptions = buildLocalizedLanguageOptions(getCurrentLocale());
    currentCopy = buildCopy();
    themeOptions = buildThemeOptions();
    window.localStorage.setItem('roselt-website-language', currentLanguageId);
    window.localStorage.setItem(STORAGE_KEYS.language, currentLanguageId);
    syncUrl();
    applyCommonCopy();
    updateLaunchLink();
    updateToggleLabel('language', languageOptions.find((language) => language.value === currentLanguageId)?.label ?? 'English');
    renderMenuOptions('language', languageOptions, currentLanguageId);
    updateToggleLabel('theme', themeOptions.find((theme) => theme.value === currentThemeSetting)?.label ?? currentThemeSetting);
    renderMenuOptions('theme', themeOptions, currentThemeSetting);
    applyPageState(getContext());
    scheduleHeaderLayoutUpdate();
  }

  function refreshCurrentAppPage() {
    const storedPage = normalizePage(window.localStorage.getItem(STORAGE_KEYS.page) ?? currentAppPage);
    if (storedPage !== currentAppPage) {
      currentAppPage = storedPage;
      syncUrl();
      updateLaunchLink();
      applyPageState(getContext());
    }
  }

  document.addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-menu-toggle]');
    if (toggle) {
      toggleMenu(toggle.dataset.menuToggle);
      return;
    }

    const option = event.target.closest('[data-menu-option]');
    if (option) {
      if (option.dataset.menuOption === 'language') {
        await applyLanguage(option.dataset.value);
      } else {
        applyTheme(option.dataset.value);
      }
      closeMenus();
      return;
    }

    if (!event.target.closest('.settings-select-menu-wrap')) {
      closeMenus();
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.matches('[data-menu-search]')) {
      filterMenuOptions(event.target.dataset.menuSearch, event.target.value);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenus();
    }
  });

  window.addEventListener('focus', refreshCurrentAppPage);
  window.addEventListener('resize', scheduleHeaderLayoutUpdate);
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.page) {
      refreshCurrentAppPage();
    }
  });

  await initThemes();
  rawLanguageOptions = getSupportedLanguages();
  baseThemeOptions = getThemeOptions();
  currentAppPage = getRequestedAppPage();
  await applyLanguage(getRequestedLanguageId());
  applyTheme(getRequestedThemeSetting());

  if (systemThemeMedia?.addEventListener) {
    systemThemeMedia.addEventListener('change', () => {
      if (currentThemeSetting === 'system') {
        themeOptions = buildThemeOptions();
        applyTheme('system');
      }
    });
  } else if (systemThemeMedia?.addListener) {
    systemThemeMedia.addListener(() => {
      if (currentThemeSetting === 'system') {
        themeOptions = buildThemeOptions();
        applyTheme('system');
      }
    });
  }

  syncUrl();
  updateLaunchLink();
  applyPageState(getContext());
  scheduleHeaderLayoutUpdate();
  if (document.fonts?.ready) {
    void document.fonts.ready.then(scheduleHeaderLayoutUpdate);
  }
  return getContext();
}
