const DEFAULT_LANGUAGE = 'en';

const SUPPORTED_LANGUAGES = {
  en: 'English',
  af: 'Afrikaans',
  de: 'Deutsch',
  nl: 'Nederlands',
  zu: 'isiZulu',
  xh: 'isiXhosa'
};

const LANGUAGE_LOCALES = {
  en: 'en',
  af: 'af',
  de: 'de',
  nl: 'nl-NL',
  zu: 'zu-ZA',
  xh: 'xh-ZA'
};

const translationCache = new Map();
let activeLanguage = DEFAULT_LANGUAGE;
let fallbackTranslations = {};
let activeTranslations = {};

function getTranslationsUrl(language) {
  return new URL(`../assets/i18n/${language}.json`, import.meta.url);
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function mergeTranslations(base, overrides) {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return isPlainObject(overrides) ? { ...overrides } : { ...base };
  }

  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = merged[key];
    merged[key] = isPlainObject(baseValue) && isPlainObject(value)
      ? mergeTranslations(baseValue, value)
      : value;
  }
  return merged;
}

function getValueByPath(source, path) {
  return path.split('.').reduce((value, segment) => {
    if (value == null || typeof value !== 'object') {
      return undefined;
    }
    return value[segment];
  }, source);
}

function formatTranslation(template, replacements = {}) {
  if (typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => replacements[key] ?? `{${key}}`);
}

async function fetchTranslations(language) {
  if (translationCache.has(language)) {
    return translationCache.get(language);
  }

  const response = await fetch(getTranslationsUrl(language));
  if (!response.ok) {
    throw new Error(`Unable to load translations for ${language}`);
  }

  const translations = await response.json();
  translationCache.set(language, translations);
  return translations;
}

function applyDocumentLanguage(language) {
  document.documentElement.lang = language;
  document.title = t('app.title');
}

export function getDefaultLanguage() {
  return DEFAULT_LANGUAGE;
}

export function getCurrentLanguage() {
  return activeLanguage;
}

export function getCurrentLocale() {
  return LANGUAGE_LOCALES[activeLanguage] ?? LANGUAGE_LOCALES[DEFAULT_LANGUAGE];
}

export function isSupportedLanguage(language) {
  return Object.hasOwn(SUPPORTED_LANGUAGES, language);
}

export function getSupportedLanguages() {
  return Object.entries(SUPPORTED_LANGUAGES).map(([value, label]) => ({ value, label }));
}

export async function initI18n(language = DEFAULT_LANGUAGE) {
  fallbackTranslations = await fetchTranslations(DEFAULT_LANGUAGE);

  const nextLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  if (nextLanguage === DEFAULT_LANGUAGE) {
    activeTranslations = fallbackTranslations;
  } else {
    const requestedTranslations = await fetchTranslations(nextLanguage);
    activeTranslations = mergeTranslations(fallbackTranslations, requestedTranslations);
  }

  activeLanguage = nextLanguage;
  applyDocumentLanguage(nextLanguage);
}

export async function setLanguage(language) {
  await initI18n(language);
}

export function t(key, replacements) {
  const resolved = getValueByPath(activeTranslations, key) ?? getValueByPath(fallbackTranslations, key);
  return typeof resolved === 'string'
    ? formatTranslation(resolved, replacements)
    : resolved ?? key;
}