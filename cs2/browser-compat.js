import english from '../assets/i18n/en.json';
import dateFormats from 'calculator-native-dates';

// The native calculator shares the web model, with narrow adapters for the
// browser services used while calculating: translations and collection storage.
let collections = new Map();

export function useCollections(storage) {
  collections = storage;
}

export const localStorage = {
  getItem: (key) => collections.get(key) ?? null,
  setItem: (key, value) => collections.set(key, value),
};

export const document = { documentElement: {}, getElementById: () => null };
export const window = { innerWidth: 1280, innerHeight: 720 };
export const HTMLCanvasElement = class {};

// URL values only identify embedded translations in the native runtime.
export const URL = class {
  constructor(path, base) {
    this.href = String(base) + String(path);
  }
};

export async function fetch(url) {
  if (String(url.href ?? url).endsWith('/assets/i18n/en.json')) {
    return { ok: true, json: async () => english };
  }
  return { ok: false };
}

class EmbeddedDateFormat {
  constructor(locale = 'en-US', options = {}) {
    this.locale = Object.hasOwn(dateFormats, locale) ? locale : 'en-US';
    const { styles, digits } = dateFormats[this.locale];
    this.pattern = styles[options.weekday ? 'weekday' : options.month === 'short' ? 'short' : options.day ? 'long' : 'month'];
    this.digits = digits;
  }

  resolvedOptions() {
    return { locale: this.locale };
  }

  formatToParts(date) {
    const { pattern, months, weekdays } = this.pattern;
    const localize = (value) => value.replace(/\d/g, (digit) => this.digits[Number(digit)]);
    const values = {
      year: localize(String(date.getUTCFullYear())),
      month: months[date.getUTCMonth()],
      day: localize(String(date.getUTCDate()).padStart(2, '0')),
      weekday: weekdays[date.getUTCDay()],
    };
    return pattern.map(({ type, value }) => ({ type, value: values[type] ?? value }));
  }

  format(date) {
    return this.formatToParts(date).map(({ value }) => value).join('');
  }
}

function supportedIntl() {
  try {
    const intl = globalThis.Intl;
    new intl.Collator('en').compare('a', 'b');
    new intl.DateTimeFormat('en').format(new Date(0));
    return intl;
  } catch {
    // Some CS2 builds expose Intl but lack ICU data in map scripts.
    return {
      Collator: class { compare(a, b) { return a < b ? -1 : Number(a > b); } },
      DateTimeFormat: EmbeddedDateFormat,
    };
  }
}

export const Intl = supportedIntl();
