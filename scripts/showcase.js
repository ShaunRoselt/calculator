import { getSupportedLanguages } from './i18n.js';
import { getTheme, getThemeLogoPath, getThemeOptions, initThemes } from './themes.js';
import { buildAppUrl } from './urlParams.js';

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

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

function renderThemeGallery() {
  const gallery = document.querySelector('[data-theme-gallery]');
  if (!gallery) {
    return;
  }

  const themeOptions = getThemeOptions();
  gallery.replaceChildren();

  for (const option of themeOptions) {
    const theme = getTheme(option.value);
    if (!theme) {
      continue;
    }

    const accent = theme.tokens?.['--accent'] || theme.metaColor;
    const accentStrong = theme.tokens?.['--accent-strong'] || theme.tokens?.['--button-equals-bg-end'] || accent;
    const card = createElement('article', 'showcase-theme-card');
    card.style.setProperty('--theme-accent', accent);
    card.style.setProperty('--theme-accent-strong', accentStrong);

    const preview = createElement('div', 'showcase-theme-card-preview');
    const iframe = createElement('iframe', 'showcase-theme-card-frame');
    iframe.loading = 'lazy';
    iframe.title = `${theme.label} theme preview`;
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = buildAppUrl({
      page: 'standard',
      theme: theme.id,
      language: 'en',
      readOnly: true
    });
    preview.append(iframe);

    const body = createElement('div', 'showcase-theme-card-body');
    const header = createElement('div', 'showcase-theme-card-header');
    const logo = createElement('img', 'showcase-theme-card-logo');
    logo.src = getThemeLogoPath(theme.id);
    logo.alt = `${theme.label} theme logo`;
    logo.width = 46;
    logo.height = 46;

    const titleWrap = createElement('div', 'showcase-theme-card-title-wrap');
    titleWrap.append(createElement('h3', 'showcase-theme-card-title', theme.label));
    titleWrap.append(createElement('p', 'showcase-theme-card-subtitle', `${theme.colorScheme === 'light' ? 'Light' : 'Dark'} color scheme`));
    header.append(logo, titleWrap);

    const meta = createElement('div', 'showcase-meta-list');
    meta.append(createElement('span', 'showcase-meta-pill', theme.id));
    meta.append(createElement('span', 'showcase-meta-pill', theme.metaColor));

    const actions = createElement('div', 'showcase-theme-actions');
    const launchLink = createElement('a', 'showcase-theme-link', 'Open this theme');
    launchLink.href = buildAppUrl({
      page: 'standard',
      theme: theme.id,
      language: 'en'
    });

    const settingsLink = createElement('a', 'showcase-theme-link secondary', 'Open in settings');
    settingsLink.href = buildAppUrl({
      page: 'settings',
      theme: theme.id,
      language: 'en'
    });

    actions.append(launchLink, settingsLink);
    body.append(header, meta, actions);
    card.append(preview, body);
    gallery.append(card);
  }

  setText('[data-showcase-theme-count]', String(themeOptions.length));
}

function renderLanguages() {
  const list = document.querySelector('[data-language-list]');
  if (!list) {
    return;
  }

  const languages = getSupportedLanguages();
  list.replaceChildren();

  for (const language of languages) {
    const item = createElement('li', 'language-item');
    item.append(createElement('strong', '', language.label));
    item.append(createElement('span', '', language.value));
    list.append(item);
  }

  setText('[data-showcase-language-count]', String(languages.length));
}

async function initShowcase() {
  try {
    await initThemes();
    renderThemeGallery();
    renderLanguages();
  } catch (error) {
    console.error('Unable to initialize the themes showcase.', error);
    const gallery = document.querySelector('[data-theme-gallery]');
    if (gallery) {
      gallery.replaceChildren(createElement('p', 'showcase-status', 'Unable to load theme previews right now.'));
    }
    const list = document.querySelector('[data-language-list]');
    if (list) {
      list.replaceChildren(createElement('li', 'showcase-status', 'Unable to load the language list right now.'));
    }
  }
}

void initShowcase();