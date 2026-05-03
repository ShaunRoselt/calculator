const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_SORTER = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

const SUPPORTED_LANGUAGES = {
  en: 'English',
  'en-x-pirate': 'Pirate',
  it: 'Italian',
  'es-ES': 'Spanish - Spain',
  ar: 'Arabic',
  sq: 'Albanian',
  am: 'Amharic',
  as: 'Assamese',
  hy: 'Armenian',
  az: 'Azerbaijani',
  bn: 'Bangla',
  be: 'Belarusian',
  eu: 'Basque',
  bs: 'Bosnian',
  ca: 'Catalan',
  chr: 'Cherokee - Tsalagi',
  cs: 'Czech',
  hr: 'Croatian',
  'fa-AF': 'Dari',
  et: 'Estonian',
  fil: 'Filipino',
  nl: 'Nederlands',
  el: 'Greek',
  gl: 'Galician',
  ka: 'Georgian',
  gu: 'Gujarati',
  ha: 'Hausa',
  he: 'Hebrew',
  hi: 'Hindi',
  id: 'Indonesian',
  ig: 'Igbo',
  is: 'Icelandic',
  ga: 'Irish',
  kn: 'Kannada',
  km: 'Khmer',
  kok: 'Konkani',
  quc: 'Kʼicheʼ (Quiché)',
  kk: 'Kazakh',
  ko: 'Korean',
  rw: 'Kinyarwanda',
  ky: 'Kyrgyz',
  lv: 'Latvian',
  lt: 'Lithuanian',
  lb: 'Luxembourgish',
  ms: 'Malay',
  mt: 'Maltese',
  mk: 'Macedonian',
  ml: 'Malayalam',
  mr: 'Marathi',
  mi: 'Maori',
  mn: 'Mongolian',
  ne: 'Nepali',
  or: 'Odia',
  fa: 'Persian',
  'pa-Arab': 'Punjabi (Shahmukhi)',
  'pa-Guru': 'Punjabi (Gurmukhi)',
  pl: 'Polish',
  'pt-PT': 'Portuguese - Portugal',
  qu: 'Quechua',
  ru: 'Russian',
  sco: 'Scots',
  sd: 'Sindhi',
  sr: 'Serbian',
  si: 'Sinhala',
  sk: 'Slovak',
  sl: 'Slovenian',
  ckb: 'Sorani',
  st: 'Sotho',
  'es-419': 'Spanish - Latin America',
  sw: 'Swahili',
  ta: 'Tamil',
  tg: 'Tajik',
  te: 'Telugu',
  tt: 'Tatar',
  th: 'Thai',
  'tlh-Latn': 'Klingon (Latin)',
  'tlh-Piqd': 'Klingon (Klingon script)',
  ti: 'Tigrinya',
  tn: 'Tswana',
  tr: 'Turkish',
  tk: 'Turkmen',
  ug: 'Uyghur',
  ur: 'Urdu',
  uz: 'Uzbek',
  'ca-valencia': 'Valencian',
  vi: 'Vietnamese',
  cy: 'Welsh',
  wo: 'Wolof',
  yo: 'Yoruba',
  fr: 'French',
  af: 'Afrikaans',
  de: 'Deutsch',
  bg: 'Bulgarian',
  da: 'Danish',
  fi: 'Finnish',
  hu: 'Hungarian',
  ja: 'Japanese',
  nb: 'Norwegian',
  'pt-BR': 'Portuguese - Brazil',
  ro: 'Romanian',
  'zh-Hans': 'Simplified Chinese',
  sv: 'Swedish',
  'zh-Hant': 'Traditional Chinese',
  uk: 'Ukrainian',
  zu: 'isiZulu',
  xh: 'isiXhosa'
};

const LANGUAGE_LOCALES = {
  en: 'en',
  'en-x-pirate': 'en',
  it: 'it-IT',
  'es-ES': 'es-ES',
  ar: 'ar',
  sq: 'sq-AL',
  am: 'am-ET',
  as: 'as-IN',
  hy: 'hy-AM',
  az: 'az-AZ',
  bn: 'bn-BD',
  be: 'be-BY',
  eu: 'eu-ES',
  bs: 'bs-BA',
  ca: 'ca-ES',
  chr: 'chr-US',
  cs: 'cs-CZ',
  hr: 'hr-HR',
  'fa-AF': 'fa-AF',
  et: 'et-EE',
  fil: 'fil-PH',
  nl: 'nl-NL',
  el: 'el-GR',
  gl: 'gl-ES',
  ka: 'ka-GE',
  gu: 'gu-IN',
  ha: 'ha-NG',
  he: 'he-IL',
  hi: 'hi-IN',
  id: 'id-ID',
  ig: 'ig-NG',
  is: 'is-IS',
  ga: 'ga-IE',
  kn: 'kn-IN',
  km: 'km-KH',
  kok: 'kok-IN',
  quc: 'quc-GT',
  kk: 'kk-KZ',
  ko: 'ko-KR',
  rw: 'rw-RW',
  ky: 'ky-KG',
  lv: 'lv-LV',
  lt: 'lt-LT',
  lb: 'lb-LU',
  ms: 'ms-MY',
  mt: 'mt-MT',
  mk: 'mk-MK',
  ml: 'ml-IN',
  mr: 'mr-IN',
  mi: 'mi-NZ',
  mn: 'mn-MN',
  ne: 'ne-NP',
  or: 'or-IN',
  fa: 'fa-IR',
  'pa-Arab': 'pa-Arab-PK',
  'pa-Guru': 'pa-Guru-IN',
  pl: 'pl-PL',
  'pt-PT': 'pt-PT',
  qu: 'qu-PE',
  ru: 'ru-RU',
  sco: 'sco-GB',
  sd: 'sd-Arab-PK',
  sr: 'sr-RS',
  si: 'si-LK',
  sk: 'sk-SK',
  sl: 'sl-SI',
  ckb: 'ckb-IQ',
  st: 'st-LS',
  'es-419': 'es-419',
  sw: 'sw-KE',
  ta: 'ta-IN',
  tg: 'tg-TJ',
  te: 'te-IN',
  tt: 'tt-RU',
  th: 'th-TH',
  'tlh-Latn': 'tlh-Latn',
  'tlh-Piqd': 'tlh-Piqd',
  ti: 'ti-ER',
  tn: 'tn-BW',
  tr: 'tr-TR',
  tk: 'tk-TM',
  ug: 'ug-CN',
  ur: 'ur-PK',
  uz: 'uz-UZ',
  'ca-valencia': 'ca-ES-valencia',
  vi: 'vi-VN',
  cy: 'cy-GB',
  wo: 'wo-SN',
  yo: 'yo-NG',
  fr: 'fr-FR',
  af: 'af',
  de: 'de',
  bg: 'bg-BG',
  da: 'da-DK',
  fi: 'fi-FI',
  hu: 'hu-HU',
  ja: 'ja-JP',
  nb: 'nb-NO',
  'pt-BR': 'pt-BR',
  ro: 'ro-RO',
  'zh-Hans': 'zh-CN',
  sv: 'sv-SE',
  'zh-Hant': 'zh-TW',
  uk: 'uk-UA',
  zu: 'zu-ZA',
  xh: 'xh-ZA'
};

const FALLBACK_ONLY_LANGUAGES = new Set();

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
  return Object.entries(SUPPORTED_LANGUAGES)
    .map(([value, label]) => ({
      value,
      label,
      isFallbackOnly: FALLBACK_ONLY_LANGUAGES.has(value)
    }))
    .sort((left, right) => LANGUAGE_SORTER.compare(left.label, right.label));
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