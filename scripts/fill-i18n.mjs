import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(SCRIPT_DIR, '..', 'assets', 'i18n');
const SOURCE_LANGUAGE = 'en';
const PLACEHOLDER_REGEX = /\{\w+\}/g;
const BATCH_SIZE = 24;
const MANUAL_ONLY_LOCALES = new Set(['tlh-Latn', 'tlh-Piqd']);
const MARKER_REGEX = /\[\[\s*SEG_(\d+)\s*]]/g;
const supportCache = new Map();

const ENGINE_LANGUAGE_MAP = {
  'ca-valencia': 'ca',
  'es-419': 'es',
  'es-ES': 'es',
  'fa-AF': 'fa',
  'pa-Arab': 'ur',
  'pa-Guru': 'pa',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  'tlh-Latn': 'en',
  'tlh-Piqd': 'en',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW'
};

function getTargetLanguage(locale) {
  return ENGINE_LANGUAGE_MAP[locale] ?? locale;
}

function flattenTranslations(value, path = []) {
  if (typeof value === 'string') {
    return [{ path, value }];
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nextValue]) => flattenTranslations(nextValue, [...path, key]));
}

function setByPath(target, path, value) {
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    cursor[key] ??= {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function decodeHtml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = text.replace(PLACEHOLDER_REGEX, (match) => {
    const token = `⟪PH_${placeholders.length}⟫`;
    placeholders.push(match);
    return token;
  });

  return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  return placeholders.reduce((result, placeholder, index) => result.replaceAll(`⟪PH_${index}⟫`, placeholder), text);
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchTranslationJson(url, targetLanguage, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) {
      return response.json();
    }

    lastError = new Error(`Translation request failed for ${targetLanguage}: ${response.status}`);
    if (attempt < attempts) {
      await delay(250 * attempt);
    }
  }

  throw lastError;
}

async function isTargetLanguageSupported(targetLanguage) {
  if (supportCache.has(targetLanguage)) {
    return supportCache.get(targetLanguage);
  }

  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', SOURCE_LANGUAGE);
  url.searchParams.set('tl', targetLanguage);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', 'Calculator');

  const response = await fetch(url);
  const supported = response.ok;
  supportCache.set(targetLanguage, supported);
  return supported;
}

function buildBatchPayload(batch) {
  return batch.map((entry, index) => {
    const { protectedText, placeholders } = protectPlaceholders(entry.value);
    return {
      ...entry,
      placeholders,
      marker: `[[SEG_${index}]]`,
      protectedText
    };
  });
}

async function translateBatch(batch, targetLanguage) {
  if (batch.length === 1) {
    const [{ value }] = batch;
    const { protectedText, placeholders } = protectPlaceholders(value);
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', SOURCE_LANGUAGE);
    url.searchParams.set('tl', targetLanguage);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', protectedText);

    const translatedJson = await fetchTranslationJson(url, targetLanguage);
    const translatedText = translatedJson?.[0]?.map((item) => item?.[0] ?? '').join('') ?? '';
    return [restorePlaceholders(translatedText, placeholders)];
  }

  try {
  const prepared = buildBatchPayload(batch);
  const payload = prepared
    .map((entry) => `${entry.marker}${escapeHtml(entry.protectedText)}`)
    .join('\n');

  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', SOURCE_LANGUAGE);
  url.searchParams.set('tl', targetLanguage);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', payload);

  const translatedJson = await fetchTranslationJson(url, targetLanguage);
  const translatedText = translatedJson?.[0]?.map((item) => item?.[0] ?? '').join('') ?? '';
  const normalized = decodeHtml(translatedText);

  const translatedByIndex = new Map();
  const matches = [...normalized.matchAll(MARKER_REGEX)];
  if (matches.length < prepared.length) {
    throw new Error(`Expected ${prepared.length} markers, received ${matches.length} for ${targetLanguage}`);
  }

  for (let index = 0; index < matches.length; index += 1) {
    const currentMatch = matches[index];
    const nextMatch = matches[index + 1];
    const segmentIndex = Number(currentMatch[1]);
    const contentStart = currentMatch.index + currentMatch[0].length;
    const contentEnd = nextMatch ? nextMatch.index : normalized.length;
    translatedByIndex.set(segmentIndex, normalized.slice(contentStart, contentEnd).trim());
  }

  return prepared.map((entry, index) => restorePlaceholders(translatedByIndex.get(index) ?? entry.value, entry.placeholders));
  } catch (error) {
    const midpoint = Math.ceil(batch.length / 2);
    const firstHalf = await translateBatch(batch.slice(0, midpoint), targetLanguage);
    const secondHalf = await translateBatch(batch.slice(midpoint), targetLanguage);
    return [...firstHalf, ...secondHalf];
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getMissingEntriesForLocale(sourceEntries, localeTranslations) {
  const existingEntries = new Set(flattenTranslations(localeTranslations).map((entry) => entry.path.join('.')));
  return sourceEntries.filter((entry) => !existingEntries.has(entry.path.join('.')));
}

function getRequestedLocales() {
  const argumentLocales = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
  return argumentLocales.length > 0 ? argumentLocales : null;
}

async function getIncompleteLocaleFiles(sourceEntries) {
  const entries = await readdir(I18N_DIR);
  const locales = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json') || entry === `${SOURCE_LANGUAGE}.json`) {
      continue;
    }

    const locale = entry.slice(0, -5);
    const content = await readJson(join(I18N_DIR, entry));
    if (MANUAL_ONLY_LOCALES.has(locale)) {
      continue;
    }

    if (getMissingEntriesForLocale(sourceEntries, content).length > 0) {
      locales.push(locale);
    }
  }
  return locales.sort();
}

async function translateLocale(locale, sourceEntries) {
  const targetLanguage = getTargetLanguage(locale);
  if (!(await isTargetLanguageSupported(targetLanguage))) {
    console.log(`Skipping unsupported auto-translation locale: ${locale} -> ${targetLanguage}`);
    return false;
  }

  const localePath = join(I18N_DIR, `${locale}.json`);
  const existingTranslations = await readJson(localePath);
  const missingEntries = getMissingEntriesForLocale(sourceEntries, existingTranslations);
  if (missingEntries.length === 0) {
    return true;
  }

  const translated = structuredClone(existingTranslations);

  for (const batch of chunk(missingEntries, BATCH_SIZE)) {
    const batchTranslations = await translateBatch(batch, targetLanguage);
    batch.forEach((entry, index) => {
      setByPath(translated, entry.path, batchTranslations[index]);
    });
  }

  await writeJson(localePath, translated);
  return true;
}

async function main() {
  const sourceTranslations = await readJson(join(I18N_DIR, `${SOURCE_LANGUAGE}.json`));
  const sourceEntries = flattenTranslations(sourceTranslations);
  const requestedLocales = getRequestedLocales();
  const locales = requestedLocales ?? await getIncompleteLocaleFiles(sourceEntries);
  const skippedLocales = [];

  if (locales.length === 0) {
    console.log('No auto-translatable incomplete locale files found.');
    return;
  }

  if (MANUAL_ONLY_LOCALES.size > 0) {
    console.log(`Skipping manual-only locales: ${[...MANUAL_ONLY_LOCALES].join(', ')}`);
  }

  for (const locale of locales) {
    console.log(`Translating ${locale}...`);
    try {
      const translated = await translateLocale(locale, sourceEntries);
      if (!translated) {
        skippedLocales.push(locale);
      }
    } catch (error) {
      skippedLocales.push(locale);
      console.error(`Skipping ${locale}: ${error.message}`);
    }
  }

  if (skippedLocales.length > 0) {
    console.log(`Skipped locales: ${skippedLocales.join(', ')}`);
  }
}

await main();