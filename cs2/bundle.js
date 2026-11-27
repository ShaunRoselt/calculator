import { pathToFileURL } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import * as currencies from '../scripts/currencyData.js';
import { getCurrentLocale, getSupportedLanguages, useLoadedTranslations } from '../scripts/i18n.js';
import { getSettingsLanguageOptions } from '../scripts/Views/Settings.js';

const [esbuildPath, output] = process.argv.slice(2);
const { build } = await import(pathToFileURL(esbuildPath));

const currencyConstants = Object.entries(currencies)
  .filter(([, value]) => typeof value !== 'function')
  .map(([name, value]) => `export const ${name} = ${JSON.stringify(value)};`);
const currencyOptions = currencies.getCurrencyOptions();
const currencyDetails = Object.fromEntries(currencyOptions.flatMap(({ code, name }) => {
  const details = currencies.getCurrencyDetails(name);
  return [[code, details], [name, details]];
}));
const currencyModule = `
${currencyConstants.join('\n')}
const sortedOptions = ${JSON.stringify(currencyOptions)};
const detailsByName = ${JSON.stringify(currencyDetails)};
export function getCurrencyOptions({ includeCryptocurrencies = true } = {}) {
  return sortedOptions.filter((currency) => includeCryptocurrencies || currency.type !== 'crypto');
}
export function getCurrencyDetails(name) {
  if (Object.hasOwn(detailsByName, name)) return detailsByName[name];
  const label = String(name || '').trim();
  const code = label.toUpperCase() || 'CUR';
  return { label: label || 'Unknown Currency', symbol: code, code, type: 'fiat' };
}
`;

const languageDirectory = new URL('../assets/i18n/', import.meta.url);
const nativeSections = ['common', 'converter', 'errors', 'date', 'graph', 'history', 'memory',
  'navigation', 'programmer', 'calculator', 'settings', 'modes', 'categories', 'units', 'currencies'];
const languageFiles = (await readdir(languageDirectory)).filter((name) => name.endsWith('.json'));
const languages = Object.fromEntries(await Promise.all(languageFiles.map(async (name) => {
  const source = JSON.parse(await readFile(new URL(name, languageDirectory), 'utf8'));
  return [name.slice(0, -5), Object.fromEntries(nativeSections.map((key) => [key, source[key]]))];
})));
const documentFiles = { readme: 'README.md', release: 'RELEASE-NOTES.md', license: 'LICENSE' };
const documents = Object.fromEntries(await Promise.all(Object.entries(documentFiles).map(async ([id, resource]) => {
  const source = await readFile(new URL('../' + resource, import.meta.url), 'utf8');
  return [id, source.trim().split(/\r?\n/).map(line => line.replace(/^#+ /, ''))];
})));
const dateFormats = {};
const makeDate = (month, day) => new Date(Date.UTC(2024, month, day));
const referenceDate = makeDate(0, 22);
const dateLocales = new Set(['en-US']);
const languageOptions = {};
for (const { value } of getSupportedLanguages()) {
  useLoadedTranslations(value, {}, {});
  const locale = getCurrentLocale();
  dateLocales.add(locale);
  if (Object.hasOwn(languages, value)) {
    languageOptions[value] = getSettingsLanguageOptions(locale)
      .filter((option) => Object.hasOwn(languages, option.value));
  }
}
for (const locale of dateLocales) {
  const digits = Array.from({ length: 10 }, (_, digit) => new Intl.NumberFormat(locale).format(digit));
  const styles = {};
  for (const [style, option] of Object.entries({
    month: { month: 'long' },
    short: { day: '2-digit', month: 'short' },
    long: { day: '2-digit', month: 'long' },
    weekday: { weekday: 'long', day: '2-digit', month: 'long' },
  })) {
    const format = new Intl.DateTimeFormat(locale, {
      ...option, year: 'numeric', timeZone: 'UTC', calendar: 'gregory',
    });
    const part = (date, type) => format.formatToParts(date).find((item) => item.type === type)?.value ?? '';
    styles[style] = {
      pattern: format.formatToParts(referenceDate),
      months: Array.from({ length: 12 }, (_, month) => part(makeDate(month, 22), 'month')),
      weekdays: option.weekday ? Array.from({ length: 7 }, (_, day) => part(makeDate(0, day + 7), 'weekday')) : [],
    };
  }
  dateFormats[locale] = { digits, styles };
}
const nerdamerDirectory = new URL('../assets/vendor/nerdamer/', import.meta.url);
const [nerdamerSource, nerdamerLicense, decimalLicense] = await Promise.all(
  ['bundle.js', 'LICENSE.txt', 'Decimal.js.LICENSE.txt'].map((name) => readFile(new URL(name, nerdamerDirectory), 'utf8')),
);

await build({
  entryPoints: ['cs2/controller.js'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  external: ['cs_script/*'],
  define: { 'import.meta.url': '"file:///calculator/scripts/controller.js"' },
  inject: ['cs2/browser-compat.js'],
  charset: 'utf8',
  outfile: output,
  plugins: [{
    name: 'calculator-native-assets',
    setup(builder) {
      // Resolve the original English currency names and symbols before running
      // the map, where Intl and locale-aware sorting may depend on missing ICU.
      builder.onLoad({ filter: /[\\/]scripts[\\/]currencyData\.js$/ }, () => ({
        contents: currencyModule,
        loader: 'js',
      }));
      builder.onResolve({ filter: /^calculator-native-(languages|language-options|nerdamer|documents|dates)$/ }, ({ path }) => ({
        path,
        namespace: 'calculator-native',
      }));
      builder.onLoad({ filter: /languages$/, namespace: 'calculator-native' }, () => ({
        contents: JSON.stringify(languages),
        loader: 'json',
      }));
      builder.onLoad({ filter: /language-options$/, namespace: 'calculator-native' }, () => ({
        contents: JSON.stringify(languageOptions),
        loader: 'json',
      }));
      builder.onLoad({ filter: /documents$/, namespace: 'calculator-native' }, () => ({
        contents: JSON.stringify(documents),
        loader: 'json',
      }));
      builder.onLoad({ filter: /dates$/, namespace: 'calculator-native' }, () => ({
        contents: JSON.stringify(dateFormats),
        loader: 'json',
      }));
      builder.onLoad({ filter: /nerdamer$/, namespace: 'calculator-native' }, () => ({
        contents: `/*! Nerdamer\n${nerdamerLicense}\nDecimal.js\n${decimalLicense}\n*/
          const module = { exports: {} };
          const exports = module.exports;
          ${nerdamerSource}
          export default module.exports;`,
        loader: 'js',
      }));
    },
  }],
});
