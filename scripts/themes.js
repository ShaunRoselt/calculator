const THEME_INDEX_URL = new URL('../assets/themes/index.json', import.meta.url);

const FALLBACK_GRAPH_DARK = {
  background: '#1b1c20',
  gridMajor: 'rgba(255, 255, 255, 0.14)',
  gridMinor: 'rgba(255, 255, 255, 0.07)',
  axis: '#c6cad2',
  label: '#eef0f3'
};

const FALLBACK_GRAPH_LIGHT = {
  background: '#f8f7f6',
  gridMajor: 'rgba(124, 124, 124, 0.28)',
  gridMinor: 'rgba(124, 124, 124, 0.12)',
  axis: '#666666',
  label: '#5b5b5b'
};

const themeDefinitions = new Map();
const themeVariableKeys = new Set();

let themeOrder = [];
let defaultThemeId = 'dark';

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function getThemeToken(theme, tokenName, fallback = '') {
  const value = theme?.tokens?.[tokenName];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getThemePreviewColors(theme) {
  if (!theme) {
    return [];
  }

  const background = getThemeToken(theme, '--shell-bg', getThemeToken(theme, '--bg', theme.metaColor));
  const accordion = getThemeToken(theme, '--panel', getThemeToken(theme, '--window-bg', background));
  const accordionHoverOverlay = getThemeToken(theme, '--surface-hover');
  const accordionHover = accordionHoverOverlay
    ? `linear-gradient(${accordionHoverOverlay}, ${accordionHoverOverlay}), ${accordion}`
    : getThemeToken(theme, '--panel-soft', accordion);
  const aboutLink = getThemeToken(theme, '--accent', getThemeToken(theme, '--accent-strong', theme.metaColor));
  const digitButton = getThemeToken(theme, '--button-digit-bg', getThemeToken(theme, '--button-default-bg', accordion));

  return [background, accordion, accordionHover, aboutLink, digitButton].filter(Boolean);
}

function mergeTheme(baseTheme, nextTheme) {
  return {
    ...baseTheme,
    ...nextTheme,
    tokens: {
      ...(baseTheme.tokens ?? {}),
      ...(nextTheme.tokens ?? {})
    },
    graphPalette: {
      ...(baseTheme.graphPalette ?? {}),
      ...(nextTheme.graphPalette ?? {})
    }
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load theme data from ${url}`);
  }

  return response.json();
}

async function loadThemeDefinition(themeId, manifestById, loading = new Set()) {
  if (themeDefinitions.has(themeId)) {
    return themeDefinitions.get(themeId);
  }

  if (loading.has(themeId)) {
    throw new Error(`Circular theme dependency detected for ${themeId}`);
  }

  const manifestEntry = manifestById.get(themeId);
  if (!manifestEntry?.file) {
    throw new Error(`Missing theme manifest entry for ${themeId}`);
  }

  loading.add(themeId);
  const themeUrl = new URL(`../assets/themes/${manifestEntry.file}`, import.meta.url);
  const rawTheme = await fetchJson(themeUrl);
  let resolvedTheme = isPlainObject(rawTheme) ? rawTheme : {};

  if (typeof resolvedTheme.extends === 'string' && resolvedTheme.extends) {
    const baseTheme = await loadThemeDefinition(resolvedTheme.extends, manifestById, loading);
    resolvedTheme = mergeTheme(baseTheme, resolvedTheme);
  }

  const normalizedTheme = {
    ...resolvedTheme,
    id: typeof resolvedTheme.id === 'string' && resolvedTheme.id ? resolvedTheme.id : themeId,
    label: typeof resolvedTheme.label === 'string' && resolvedTheme.label ? resolvedTheme.label : themeId,
    colorScheme: resolvedTheme.colorScheme === 'light' ? 'light' : 'dark',
    metaColor: typeof resolvedTheme.metaColor === 'string' && resolvedTheme.metaColor ? resolvedTheme.metaColor : '#1f2025',
    logoPath: typeof resolvedTheme.logoPath === 'string' && resolvedTheme.logoPath ? resolvedTheme.logoPath : 'assets/logo-dark.svg',
    tokens: isPlainObject(resolvedTheme.tokens) ? resolvedTheme.tokens : {},
    graphPalette: isPlainObject(resolvedTheme.graphPalette) ? resolvedTheme.graphPalette : {}
  };

  themeDefinitions.set(normalizedTheme.id, normalizedTheme);
  for (const tokenName of Object.keys(normalizedTheme.tokens)) {
    themeVariableKeys.add(tokenName);
  }

  loading.delete(themeId);
  return normalizedTheme;
}

export async function initThemes() {
  if (themeOrder.length > 0) {
    return;
  }

  const manifest = await fetchJson(THEME_INDEX_URL);
  const manifestThemes = Array.isArray(manifest.themes) ? manifest.themes : [];
  defaultThemeId = typeof manifest.defaultTheme === 'string' && manifest.defaultTheme ? manifest.defaultTheme : defaultThemeId;
  themeOrder = manifestThemes.map((theme) => theme.id).filter(Boolean);

  const manifestById = new Map(manifestThemes.map((theme) => [theme.id, theme]));
  for (const themeId of themeOrder) {
    await loadThemeDefinition(themeId, manifestById);
  }
}

export function isSupportedTheme(themeId) {
  return themeDefinitions.has(themeId);
}

export function getTheme(themeId) {
  return themeDefinitions.get(themeId)
    ?? themeDefinitions.get(defaultThemeId)
    ?? null;
}

export function getThemeOptions() {
  return themeOrder
    .map((themeId) => getTheme(themeId))
    .filter(Boolean)
    .map((theme) => ({
      value: theme.id,
      label: theme.label,
      previewColors: getThemePreviewColors(theme)
    }));
}

export function getResolvedAppThemeId(themeSetting, systemThemeId = 'dark') {
  if (themeSetting === 'system') {
    return isSupportedTheme(systemThemeId) ? systemThemeId : defaultThemeId;
  }

  return isSupportedTheme(themeSetting) ? themeSetting : defaultThemeId;
}

export function normalizeGraphThemeSetting(themeSetting) {
  return themeSetting === 'match-app' || isSupportedTheme(themeSetting)
    ? themeSetting
    : 'match-app';
}

function getGraphThemeId(themeSetting, appThemeId) {
  if (themeSetting === 'match-app') {
    return getResolvedAppThemeId(appThemeId, defaultThemeId);
  }

  return isSupportedTheme(themeSetting) ? themeSetting : defaultThemeId;
}

function getThemeStyleString(themeId) {
  const theme = getTheme(themeId);
  if (!theme) {
    return '';
  }

  const declarations = [`color-scheme: ${theme.colorScheme}`];
  for (const [tokenName, tokenValue] of Object.entries(theme.tokens)) {
    declarations.push(`${tokenName}: ${tokenValue}`);
  }
  return declarations.join('; ');
}

export function getThemeLogoPath(themeId) {
  return getTheme(themeId)?.logoPath ?? 'assets/logo-dark.svg';
}

export function getGraphThemeInlineStyle(themeSetting, appThemeId) {
  if (themeSetting === 'match-app') {
    return '';
  }

  return getThemeStyleString(getGraphThemeId(themeSetting, appThemeId));
}

export function applyThemeToElement(element, themeId) {
  const theme = getTheme(themeId);
  if (!element || !theme) {
    return getTheme(defaultThemeId) ?? {
      id: defaultThemeId,
      metaColor: '#1f2025',
      logoPath: 'assets/logo-dark.svg',
      colorScheme: 'dark',
      tokens: {},
      graphPalette: FALLBACK_GRAPH_DARK
    };
  }

  for (const tokenName of themeVariableKeys) {
    element.style.removeProperty(tokenName);
  }

  for (const [tokenName, tokenValue] of Object.entries(theme.tokens)) {
    element.style.setProperty(tokenName, tokenValue);
  }

  element.style.colorScheme = theme.colorScheme;
  element.dataset.theme = theme.id;
  return theme;
}

export function getGraphPaletteForSelection(themeSetting, appThemeId) {
  const theme = getTheme(getGraphThemeId(themeSetting, appThemeId));
  if (theme?.graphPalette && Object.keys(theme.graphPalette).length > 0) {
    return theme.graphPalette;
  }

  return theme?.colorScheme === 'light' ? FALLBACK_GRAPH_LIGHT : FALLBACK_GRAPH_DARK;
}
