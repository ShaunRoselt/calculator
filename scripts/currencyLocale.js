import { CURRENCY_CODE_TO_NAME } from './config.js';
import { getCurrentLocale } from './i18n.js';
import { getCurrency } from './vendor/localeCurrency.js';

const DEFAULT_PRIMARY_CURRENCY_CODE = 'USD';
const DEFAULT_SECONDARY_CURRENCY_CODE = 'USD';
const FALLBACK_SECONDARY_CURRENCY_CODE = 'EUR';

function normalizeLocaleCandidate(locale) {
  return typeof locale === 'string' ? locale.trim() : '';
}

function maximizeLocale(locale) {
  if (!locale || typeof Intl?.Locale !== 'function') {
    return '';
  }

  try {
    return new Intl.Locale(locale).maximize().toString();
  } catch {
    return '';
  }
}

function getPreferredLocales() {
  const localeCandidates = [];
  const navigatorLocales = globalThis.navigator?.languages;

  if (Array.isArray(navigatorLocales)) {
    localeCandidates.push(...navigatorLocales);
  }

  if (typeof globalThis.navigator?.language === 'string') {
    localeCandidates.push(globalThis.navigator.language);
  }

  if (typeof Intl?.DateTimeFormat === 'function') {
    const resolvedLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
    if (resolvedLocale) {
      localeCandidates.push(resolvedLocale);
    }
  }

  localeCandidates.push(getCurrentLocale());

  return [...new Set(localeCandidates.map(normalizeLocaleCandidate).filter(Boolean))];
}

function getSupportedCurrencyCodeForLocale(locale) {
  const localeCandidates = [locale, maximizeLocale(locale)];

  for (const localeCandidate of localeCandidates) {
    const currencyCode = getCurrency(localeCandidate);
    if (currencyCode && CURRENCY_CODE_TO_NAME[currencyCode]) {
      return currencyCode;
    }
  }

  return null;
}

export function detectUserCurrencyCode(preferredLocales = getPreferredLocales()) {
  for (const locale of preferredLocales) {
    const supportedCurrencyCode = getSupportedCurrencyCodeForLocale(locale);
    if (supportedCurrencyCode) {
      return supportedCurrencyCode;
    }
  }

  return DEFAULT_PRIMARY_CURRENCY_CODE;
}

export function getDefaultCurrencyUnits(preferredLocales = getPreferredLocales()) {
  const primaryCurrencyCode = detectUserCurrencyCode(preferredLocales);
  const secondaryCurrencyCode = primaryCurrencyCode === DEFAULT_SECONDARY_CURRENCY_CODE
    ? FALLBACK_SECONDARY_CURRENCY_CODE
    : DEFAULT_SECONDARY_CURRENCY_CODE;

  return {
    fromUnit: CURRENCY_CODE_TO_NAME[primaryCurrencyCode] || CURRENCY_CODE_TO_NAME[DEFAULT_PRIMARY_CURRENCY_CODE],
    toUnit: CURRENCY_CODE_TO_NAME[secondaryCurrencyCode] || CURRENCY_CODE_TO_NAME[FALLBACK_SECONDARY_CURRENCY_CODE]
  };
}