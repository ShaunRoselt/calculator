import { getTheme, getThemeLogoPath, getThemeOptions } from './themes.js';
import { buildBinaryGrid, initPublicPage } from './publicPage.js';

let latestContext = null;
let currentThemeSearch = '';

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (typeof textContent === 'string') {
    element.textContent = textContent;
  }
  return element;
}

function renderThemeGallery(context) {
  const gallery = document.querySelector('[data-theme-gallery]');
  if (!(gallery instanceof HTMLElement)) {
    return;
  }

  const availableThemes = getThemeOptions();
  const normalizedSearch = currentThemeSearch.trim().toLowerCase();
  const filteredThemes = availableThemes.filter((option) => {
    if (!normalizedSearch) {
      return true;
    }
    return option.label.toLowerCase().includes(normalizedSearch) || option.value.toLowerCase().includes(normalizedSearch);
  });
  gallery.replaceChildren();

  if (!filteredThemes.length) {
    gallery.append(createElement('p', 'showcase-status', context.copy.noMatches));
  }

  for (const option of filteredThemes) {
    const theme = getTheme(option.value);
    if (!theme) {
      continue;
    }

    const accent = theme.tokens?.['--accent'] || theme.metaColor;
    const accentStrong = theme.tokens?.['--accent-strong'] || theme.tokens?.['--button-equals-bg-end'] || accent;
    const card = createElement('article', 'showcase-theme-card');
    card.style.setProperty('--theme-accent', accent);
    card.style.setProperty('--theme-accent-strong', accentStrong);

    const header = createElement('div', 'showcase-theme-card-header');
    const logo = createElement('img', 'showcase-theme-card-logo');
    logo.src = getThemeLogoPath(theme.id);
    logo.alt = `${theme.label} ${context.copy.themeLabel}`;
    logo.width = 46;
    logo.height = 46;

    const title = createElement('h3', 'showcase-theme-card-title');
    const titleLink = createElement('a', 'showcase-theme-card-title-link', theme.label);
    titleLink.href = context.buildAppHref({
      page: 'standard',
      theme: theme.id,
      language: context.currentLanguageId
    });
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.title = `${context.copy.openThisTheme}: ${theme.label}`;
    title.append(titleLink);
    header.append(logo, title);

    const preview = createElement('div', 'showcase-theme-card-preview');
    const iframe = createElement('iframe', 'showcase-theme-card-frame');
    iframe.loading = 'lazy';
    iframe.title = `${theme.label} ${context.copy.themePreviewLabel}`;
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = context.buildAppHref({
      page: 'standard',
      theme: theme.id,
      language: context.currentLanguageId,
      readOnly: true
    });
    preview.append(iframe);

    card.append(header, preview);
    gallery.append(card);
  }

  const themeCount = document.querySelector('[data-theme-count]');
  if (themeCount) {
    themeCount.textContent = String(filteredThemes.length);
  }
}

function applyThemesPageState(context) {
  latestContext = context;
  const {
    copy
  } = context;

  const eyebrow = document.querySelector('[data-showcase-eyebrow]');
  const title = document.querySelector('[data-hero-title]');
  const subtitle = document.querySelector('[data-hero-subtitle]');
  const themeCountLabel = document.querySelector('[data-theme-count-label]');
  const themesKicker = document.querySelector('[data-themes-kicker]');
  const themesTitle = document.querySelector('[data-themes-title]');
  const themesCopy = document.querySelector('[data-themes-copy]');
  const themeSearch = document.querySelector('[data-theme-search]');
  const gridTarget = document.querySelector('[data-hero-grid-text]');

  if (eyebrow) {
    eyebrow.textContent = copy.preferencesKicker;
  }
  if (title) {
    title.textContent = copy.heroTitle;
  }
  if (subtitle) {
    subtitle.textContent = copy.heroSubtitle;
  }
  if (themeCountLabel) {
    themeCountLabel.textContent = copy.themeCountLabel;
  }
  if (themesKicker) {
    themesKicker.textContent = copy.themesKicker;
  }
  if (themesTitle) {
    themesTitle.textContent = copy.themesTitle;
  }
  if (themesCopy) {
    themesCopy.textContent = copy.themesCopy;
  }
  if (themeSearch instanceof HTMLInputElement) {
    themeSearch.placeholder = copy.themeSearch;
    themeSearch.setAttribute('aria-label', copy.themeSearch);
    if (themeSearch.value !== currentThemeSearch) {
      themeSearch.value = currentThemeSearch;
    }
  }

  buildBinaryGrid(gridTarget, ['0', '1', 'ROSELT', 'CALCULATOR', 'THEME']);
  renderThemeGallery(context);
}

document.addEventListener('input', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.matches('[data-theme-search]')) {
    currentThemeSearch = event.target.value;
    if (latestContext) {
      renderThemeGallery(latestContext);
    }
  }
});

void initPublicPage({
  buildPageCopy(translate) {
    return {
      preferencesKicker: translate('themesPage.sections.themes.kicker', 'Appearance'),
      heroTitle: translate('themesPage.summary.themeCountLabel', 'Themes'),
      heroSubtitle: translate('themesPage.sections.themes.copy', 'Pick the look of the app.'),
      themeCountLabel: translate('themesPage.summary.themeCountLabel', 'Themes'),
      themesKicker: translate('themesPage.sections.themes.kicker', 'Appearance'),
      themesTitle: translate('themesPage.summary.themeCountLabel', 'Themes'),
      themesCopy: translate('themesPage.sections.themes.copy', 'Pick the look of the app.'),
      themeLabel: translate('settings.appearance.themeTitle', 'Theme'),
      themePreviewLabel: translate('themesPage.cards.previewLabel', 'theme preview'),
      openThisTheme: translate('themesPage.cards.openTheme', 'Open this theme')
    };
  },
  applyPageState: applyThemesPageState
}).catch((error) => {
  console.error('Unable to initialize the themes page.', error);
});
