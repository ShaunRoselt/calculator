const THEME_QUERY_PARAM = 'theme';
const LANGUAGE_QUERY_PARAM = 'language';
const READONLY_QUERY_PARAM = 'readonly';

const TRUTHY_QUERY_VALUES = new Set(['1', 'true', 'yes', 'on']);

function normalizeQueryValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

export function isTruthyUrlFlag(value) {
  return TRUTHY_QUERY_VALUES.has(String(value ?? '').trim().toLowerCase());
}

export function getUrlPreferenceOverrides(url = window.location.href) {
  const parsedUrl = new URL(url, window.location.href);
  return {
    theme: normalizeQueryValue(parsedUrl.searchParams.get(THEME_QUERY_PARAM)),
    language: normalizeQueryValue(parsedUrl.searchParams.get(LANGUAGE_QUERY_PARAM)),
    readOnly: isTruthyUrlFlag(parsedUrl.searchParams.get(READONLY_QUERY_PARAM))
  };
}

export function buildAppUrl(options = {}, baseUrl = new URL('../app.html', import.meta.url)) {
  const nextUrl = new URL(baseUrl, window.location.href);

  if (typeof options.page === 'string' && options.page.trim()) {
    nextUrl.searchParams.set('page', options.page.trim());
  }

  if (typeof options.theme === 'string' && options.theme.trim()) {
    nextUrl.searchParams.set(THEME_QUERY_PARAM, options.theme.trim());
  }

  if (typeof options.language === 'string' && options.language.trim()) {
    nextUrl.searchParams.set(LANGUAGE_QUERY_PARAM, options.language.trim());
  }

  if (options.readOnly) {
    nextUrl.searchParams.set(READONLY_QUERY_PARAM, '1');
  }

  return nextUrl.href;
}