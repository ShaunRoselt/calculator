import { t } from './i18n.js';
import { CURRENCY_OPTIONS } from './currencyData.js';
export { CURRENCY_OPTIONS, CURRENCY_DETAILS, CURRENCY_CODE_TO_NAME, DEFAULT_CURRENCY_RATES, OFFLINE_CURRENCY_RATE_SNAPSHOT, OFFLINE_CURRENCY_UPDATED_AT, getCurrencyOptions, getCurrencyDetails } from './currencyData.js';

function btn(label, action, value = '', tone = 'default') {
  return { label, action, value, tone };
}

function unit(name, symbol, toBase, fromBase) {
  return { name, symbol, toBase, fromBase };
}

function factorUnit(name, symbol, factor) {
  return unit(name, symbol, (v) => v * factor, (v) => v / factor);
}

export const STORAGE_KEYS = {
  history: 'calculator-history',
  memory: 'calculator-memory',
  nav: 'calculator-nav',
  page: 'calculator-page',
  theme: 'calculator-theme',
  language: 'calculator-language',
  repeatEquals: 'calculator-repeat-equals',
  shortcuts: 'calculator-shortcuts'
};

export const APP_SHORTCUT_DEFINITIONS = [
  {
    id: 'undo',
    labelKey: 'settings.shortcuts.undoTitle',
    descriptionKey: 'settings.shortcuts.undoDescription',
    defaultBinding: 'Ctrl+Z'
  },
  {
    id: 'redo',
    labelKey: 'settings.shortcuts.redoTitle',
    descriptionKey: 'settings.shortcuts.redoDescription',
    defaultBinding: 'Ctrl+Shift+Z'
  },
  {
    id: 'copy',
    labelKey: 'settings.shortcuts.copyTitle',
    descriptionKey: 'settings.shortcuts.copyDescription',
    defaultBinding: 'Ctrl+C'
  },
  {
    id: 'paste',
    labelKey: 'settings.shortcuts.pasteTitle',
    descriptionKey: 'settings.shortcuts.pasteDescription',
    defaultBinding: 'Ctrl+V'
  },
  {
    id: 'fullscreen',
    labelKey: 'settings.shortcuts.fullscreenTitle',
    descriptionKey: 'settings.shortcuts.fullscreenDescription',
    defaultBinding: 'F11',
    allowInEditable: true
  }
];

export const APP_SHORTCUT_DEFAULTS = Object.fromEntries(
  APP_SHORTCUT_DEFINITIONS.map((shortcut) => [shortcut.id, shortcut.defaultBinding])
);

const SHORTCUT_MODIFIER_ALIASES = new Map([
  ['ctrl', 'Ctrl'],
  ['control', 'Ctrl'],
  ['cmdorctrl', 'Ctrl'],
  ['commandorcontrol', 'Ctrl'],
  ['alt', 'Alt'],
  ['option', 'Alt'],
  ['shift', 'Shift'],
  ['meta', 'Meta'],
  ['cmd', 'Meta'],
  ['command', 'Meta'],
  ['super', 'Meta'],
  ['win', 'Meta'],
  ['windows', 'Meta']
]);

const SHORTCUT_SPECIAL_KEYS = new Map([
  ['esc', 'Escape'],
  ['escape', 'Escape'],
  ['enter', 'Enter'],
  ['return', 'Enter'],
  ['space', 'Space'],
  ['spacebar', 'Space'],
  ['tab', 'Tab'],
  ['backspace', 'Backspace'],
  ['delete', 'Delete'],
  ['del', 'Delete'],
  ['home', 'Home'],
  ['end', 'End'],
  ['pageup', 'PageUp'],
  ['pagedown', 'PageDown'],
  ['up', 'ArrowUp'],
  ['arrowup', 'ArrowUp'],
  ['down', 'ArrowDown'],
  ['arrowdown', 'ArrowDown'],
  ['left', 'ArrowLeft'],
  ['arrowleft', 'ArrowLeft'],
  ['right', 'ArrowRight'],
  ['arrowright', 'ArrowRight'],
  ['=', '='],
  ['equals', '='],
  ['minus', '-'],
  ['hyphen', '-']
]);

const SHORTCUT_MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'];
const STANDALONE_SHORTCUT_KEYS = new Set([
  'Escape',
  'Enter',
  'Space',
  'Tab',
  'Backspace',
  'Delete',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight'
]);

function canonicalizeShortcutKey(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return null;
  }

  const lowered = normalizedToken.toLowerCase();
  if (SHORTCUT_SPECIAL_KEYS.has(lowered)) {
    return SHORTCUT_SPECIAL_KEYS.get(lowered);
  }

  const uppered = normalizedToken.toUpperCase();
  if (/^F(?:[1-9]|1\d|2[0-4])$/.test(uppered)) {
    return uppered;
  }

  if (normalizedToken.length === 1) {
    return normalizedToken === ' '
      ? 'Space'
      : uppered;
  }

  return null;
}

function isStandaloneShortcutKey(key) {
  return STANDALONE_SHORTCUT_KEYS.has(key) || /^F(?:[1-9]|1\d|2[0-4])$/.test(key);
}

export function canonicalizeShortcutBinding(binding) {
  if (typeof binding !== 'string') {
    return null;
  }

  const tokens = binding.split('+').map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) {
    return null;
  }

  const modifiers = new Set();
  let key = null;

  for (const token of tokens) {
    const modifier = SHORTCUT_MODIFIER_ALIASES.get(token.toLowerCase());
    if (modifier) {
      modifiers.add(modifier);
      continue;
    }

    if (key !== null) {
      return null;
    }

    key = canonicalizeShortcutKey(token);
  }

  if (!key || (modifiers.size === 0 && !isStandaloneShortcutKey(key))) {
    return null;
  }

  return [...SHORTCUT_MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join('+');
}

export function createDefaultShortcutBindings() {
  return { ...APP_SHORTCUT_DEFAULTS };
}

export function normalizeShortcutBindings(value) {
  const shortcuts = createDefaultShortcutBindings();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return shortcuts;
  }

  for (const definition of APP_SHORTCUT_DEFINITIONS) {
    const normalizedBinding = canonicalizeShortcutBinding(value[definition.id]);
    if (normalizedBinding) {
      shortcuts[definition.id] = normalizedBinding;
    }
  }

  return shortcuts;
}

export const DEFAULT_MODE = 'standard';

export const MODE_META = {
  standard: { label: 'Standard', icon: 'standard', subtitle: 'Classic immediate evaluation' },
  scientific: { label: 'Scientific', icon: 'scientific', subtitle: 'Operators, functions, and expression support' },
  graphing: { label: 'Graphing', icon: 'graphing', subtitle: 'Plot a simple expression on a cartesian plane' },
  programmer: { label: 'Programmer', icon: 'programmer', subtitle: 'Integer math with base conversion' },
  date: { label: 'Date calculation', icon: 'date', subtitle: 'Find durations and shift dates' },
  currency: { label: 'Currency', icon: 'currency', subtitle: 'Convert live exchange rates' },
  volume: { label: 'Volume', icon: 'volume', subtitle: 'Convert volume measurements' },
  length: { label: 'Length', icon: 'length', subtitle: 'Convert distance and length units' },
  weight: { label: 'Weight and Mass', icon: 'weight', subtitle: 'Convert weight and mass units' },
  temperature: { label: 'Temperature', icon: 'temperature', subtitle: 'Convert temperature scales' },
  energy: { label: 'Energy', icon: 'energy', subtitle: 'Convert energy measurements' },
  area: { label: 'Area', icon: 'area', subtitle: 'Convert area measurements' },
  speed: { label: 'Speed', icon: 'speed', subtitle: 'Convert speed measurements' },
  time: { label: 'Time', icon: 'time', subtitle: 'Convert time measurements' },
  power: { label: 'Power', icon: 'power', subtitle: 'Convert power measurements' },
  data: { label: 'Data', icon: 'data', subtitle: 'Convert digital storage units' },
  pressure: { label: 'Pressure', icon: 'pressure', subtitle: 'Convert pressure units' },
  angle: { label: 'Angle', icon: 'angle', subtitle: 'Convert angle measurements' },
  settings: { label: 'Settings', icon: 'settings', subtitle: 'Appearance and app information' }
};

export const NAVIGATION_GROUPS = [
  {
    key: 'calculator',
    label: 'Calculator',
    modes: ['standard', 'scientific', 'graphing', 'programmer', 'date']
  },
  {
    key: 'converter',
    label: 'Converter',
    modes: ['currency', 'volume', 'length', 'weight', 'temperature', 'energy', 'area', 'speed', 'time', 'power', 'data', 'pressure', 'angle']
  }
];

export const CONVERTER_MODE_TO_CATEGORY = {
  currency: 'Currency',
  volume: 'Volume',
  length: 'Length',
  weight: 'Mass',
  temperature: 'Temperature',
  energy: 'Energy',
  area: 'Area',
  speed: 'Speed',
  time: 'Time',
  power: 'Power',
  data: 'Data',
  pressure: 'Pressure',
  angle: 'Angle'
};

export function isConverterMode(mode) {
  return Object.hasOwn(CONVERTER_MODE_TO_CATEGORY, mode);
}

export function isMode(mode) {
  return Object.hasOwn(MODE_META, mode);
}

function translatedValue(path, fallback) {
  const translated = t(path);
  return translated === path ? fallback : translated;
}

export function getModeMeta(mode) {
  const meta = MODE_META[mode];
  if (!meta) {
    return null;
  }

  return {
    ...meta,
    label: translatedValue(`modes.${mode}.label`, meta.label),
    subtitle: translatedValue(`modes.${mode}.subtitle`, meta.subtitle)
  };
}

export function getNavigationGroups() {
  return NAVIGATION_GROUPS.map((group) => ({
    ...group,
    label: translatedValue(`navigation.groups.${group.key}`, group.label)
  }));
}

export function getCategoryLabel(category) {
  return translatedValue(`categories.${category}`, category);
}

export function getUnitLabel(unitName) {
  return translatedValue(`units.labels.${unitName}`, unitName);
}

export function getCurrencyName(currencyName) {
  return translatedValue(`currencies.names.${currencyName}`, currencyName);
}

export function getCurrencyLabel(label) {
  return translatedValue(`currencies.labels.${label}`, label);
}

export const APP_INFO = {
  name: 'Roselt Calculator',
  version: '12.0.0'
};

export function getAppName() {
  return APP_INFO.name;
}

export const STANDARD_BUTTONS = [
  [btn('%', 'percent', '', 'function'), btn('CE', 'clear-entry', '', 'function'), btn('C', 'clear-all', '', 'function'), btn('⌫', 'backspace', '', 'function')],
  [btn('¹∕x', 'standard-unary', 'reciprocal', 'function'), btn('x²', 'standard-unary', 'square', 'function'), btn('²√x', 'standard-unary', 'sqrt', 'function'), btn('÷', 'operator', '/', 'operator')],
  [btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('×', 'operator', '*', 'operator')],
  [btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('−', 'operator', '-', 'operator')],
  [btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('+', 'operator', '+', 'operator')],
  [btn('+/-', 'negate', ''), btn('0', 'digit', '0'), btn(',', 'decimal', '.'), btn('=', 'equals', '', 'equals')]
];

export const SCIENTIFIC_BUTTONS = [
  [btn('2ⁿᵈ', 'noop', '', 'function'), btn('π', 'constant', 'pi', 'function'), btn('e', 'constant', 'e', 'function'), btn('C', 'clear-all', '', 'function'), btn('⌫', 'backspace', '', 'function')],
  [btn('x²', 'scientific-unary', 'square', 'function'), btn('⅟x', 'scientific-unary', 'reciprocal', 'function'), btn('|x|', 'scientific-unary', 'abs', 'function'), btn('exp', 'scientific-unary', 'exp', 'function'), btn('mod', 'operator', 'mod', 'operator')],
  [btn('²√x', 'scientific-unary', 'sqrt', 'function'), btn('(', 'paren', '(', 'function'), btn(')', 'paren', ')', 'function'), btn('n!', 'scientific-unary', 'factorial', 'function'), btn('÷', 'operator', '/', 'operator')],
  [btn('xʸ', 'operator', '^', 'operator'), btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('×', 'operator', '*', 'operator')],
  [btn('10ˣ', 'scientific-unary', 'pow10', 'function'), btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('−', 'operator', '-', 'operator')],
  [btn('log', 'scientific-unary', 'log', 'function'), btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('+', 'operator', '+', 'operator')],
  [btn('ln', 'scientific-unary', 'ln', 'function'), btn('+/-', 'negate', ''), btn('0', 'digit', '0'), btn(',', 'decimal', '.'), btn('=', 'equals', '', 'equals')]
];

export const PROGRAMMER_BUTTONS = [
  [btn('A', 'digit', 'A'), btn('<<', 'operator', 'lsh', 'operator'), btn('>>', 'operator', 'rsh', 'operator'), btn('CE', 'clear-entry', '', 'function'), btn('⌫', 'backspace', '', 'function')],
  [btn('B', 'digit', 'B'), btn('(', 'noop', ''), btn(')', 'noop', ''), btn('%', 'operator', 'mod', 'function'), btn('÷', 'operator', '/', 'operator')],
  [btn('C', 'digit', 'C'), btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('×', 'operator', '*', 'operator')],
  [btn('D', 'digit', 'D'), btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('−', 'operator', '-', 'operator')],
  [btn('E', 'digit', 'E'), btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('+', 'operator', '+', 'operator')],
  [btn('F', 'digit', 'F'), btn('+/-', 'negate', ''), btn('0', 'digit', '0'), btn(',', 'noop', ''), btn('=', 'equals', '', 'equals')]
];

export const UNIT_CATEGORIES = {
  Length: [
    factorUnit('Angstroms', 'A', 0.0000000001),
    factorUnit('Nanometers', 'nm', 0.000000001),
    factorUnit('Microns', 'µm', 0.000001),
    factorUnit('Millimeters', 'mm', 0.001),
    factorUnit('Centimeters', 'cm', 0.01),
    factorUnit('Meters', 'm', 1),
    factorUnit('Kilometers', 'km', 1000),
    factorUnit('Inches', 'in', 0.0254),
    factorUnit('Feet', 'ft', 0.3048),
    factorUnit('Yards', 'yd', 0.9144),
    factorUnit('Miles', 'mi', 1609.344),
    factorUnit('Nautical miles', 'nmi', 1852),
    factorUnit('paperclips', 'paperclips', 0.035052),
    factorUnit('hands', 'hands', 0.18669),
    factorUnit('jumbo jets', 'jumbo jets', 76)
  ],
  Mass: [
    factorUnit('Carats', 'ct', 0.0002),
    factorUnit('Milligrams', 'mg', 0.000001),
    factorUnit('Centigrams', 'cg', 0.00001),
    factorUnit('Decigrams', 'dg', 0.0001),
    factorUnit('Grams', 'g', 0.001),
    factorUnit('Dekagrams', 'dag', 0.01),
    factorUnit('Hectograms', 'hg', 0.1),
    factorUnit('Kilograms', 'kg', 1),
    factorUnit('Metric tonnes', 't', 1000),
    factorUnit('Ounces', 'oz', 0.028349523125),
    factorUnit('Pounds', 'lb', 0.45359237),
    factorUnit('Stone', 'st', 6.35029318),
    factorUnit('Short tons (US)', 'ton (US)', 907.18474),
    factorUnit('Long tons (UK)', 'ton (UK)', 1016.0469088),
    factorUnit('snowflakes', 'snowflakes', 0.000002),
    factorUnit('soccer balls', 'soccer balls', 0.4325),
    factorUnit('elephants', 'elephants', 4000),
    factorUnit('whales', 'whales', 90000)
  ],
  Temperature: [
    unit('Celsius', '°C', (v) => v, (v) => v),
    unit('Fahrenheit', '°F', (v) => (v - 32) * 5 / 9, (v) => (v * 9 / 5) + 32),
    unit('Kelvin', 'K', (v) => v - 273.15, (v) => v + 273.15)
  ],
  Volume: [
    unit('Milliliters', 'mL', (v) => v / 1000, (v) => v * 1000),
    unit('Cubic centimeters', 'cm³', (v) => v / 1000, (v) => v * 1000),
    unit('Liters', 'L', (v) => v, (v) => v),
    unit('Cubic meters', 'm³', (v) => v * 1000, (v) => v / 1000),
    unit('Teaspoons (US)', 'tsp. (US)', (v) => v * 0.00492892159375, (v) => v / 0.00492892159375),
    unit('Tablespoons (US)', 'tbsp. (US)', (v) => v * 0.01478676478125, (v) => v / 0.01478676478125),
    unit('Fluid ounces (US)', 'fl oz (US)', (v) => v * 0.0295735295625, (v) => v / 0.0295735295625),
    unit('Cups (US)', 'cup (US)', (v) => v * 0.236588237, (v) => v / 0.236588237),
    unit('Pints (US)', 'pt (US)', (v) => v * 0.473176473, (v) => v / 0.473176473),
    unit('Quarts (US)', 'qt (US)', (v) => v * 0.946352946, (v) => v / 0.946352946),
    unit('Gallons (US)', 'gal (US)', (v) => v * 3.785411784, (v) => v / 3.785411784),
    unit('Cubic inches', 'in³', (v) => v * 0.016387064, (v) => v / 0.016387064),
    unit('Cubic feet', 'ft³', (v) => v * 28.316846592, (v) => v / 28.316846592),
    unit('Cubic yards', 'yd³', (v) => v * 764.554857984, (v) => v / 764.554857984),
    unit('Teaspoons (UK)', 'tsp. (UK)', (v) => v * 0.00591938802083333333333, (v) => v / 0.00591938802083333333333),
    unit('Tablespoons (UK)', 'tbsp. (UK)', (v) => v * 0.0177581640625, (v) => v / 0.0177581640625),
    unit('Fluid ounces (UK)', 'fl oz (UK)', (v) => v * 0.0284130625, (v) => v / 0.0284130625),
    unit('Pints (UK)', 'pt (UK)', (v) => v * 0.56826125, (v) => v / 0.56826125),
    unit('Quarts (UK)', 'qt (UK)', (v) => v * 1.1365225, (v) => v / 1.1365225),
    unit('Gallons (UK)', 'gal (UK)', (v) => v * 4.54609, (v) => v / 4.54609),
    unit('coffee cups', 'coffee cups', (v) => v * 0.2365882, (v) => v / 0.2365882),
    unit('bathtubs', 'bathtubs', (v) => v * 378.5412, (v) => v / 378.5412),
    unit('swimming pools', 'swimming pools', (v) => v * 3_750_000, (v) => v / 3_750_000)
  ],
  Area: [
    factorUnit('Square millimeters', 'mm²', 0.000001),
    factorUnit('Square centimeters', 'cm²', 0.0001),
    factorUnit('Square meters', 'm²', 1),
    factorUnit('Hectares', 'ha', 10000),
    factorUnit('Square kilometers', 'km²', 1000000),
    factorUnit('Square inches', 'in²', 0.00064516),
    factorUnit('Square feet', 'ft²', 0.09290304),
    factorUnit('Square yards', 'yd²', 0.83612736),
    factorUnit('Acres', 'ac', 4046.8564224),
    factorUnit('Square miles', 'mi²', 2589988.110336),
    factorUnit('hands', 'hands', 0.012516104),
    factorUnit('sheets of paper', 'sheets of paper', 0.06032246),
    factorUnit('soccer fields', 'soccer fields', 10869.66),
    factorUnit('castles', 'castles', 100000),
    factorUnit('Pyeong', 'Pyeong', 400 / 121)
  ],
  Speed: [
    factorUnit('Centimeters per second', 'cm/s', 0.01),
    factorUnit('Meters per second', 'm/s', 1),
    factorUnit('Kilometers per hour', 'km/h', 0.2777777777777778),
    factorUnit('Feet per second', 'ft/s', 0.3048),
    factorUnit('Miles per hour', 'mph', 0.447),
    factorUnit('Knots', 'kn', 0.5144),
    factorUnit('Mach', 'M', 340.3),
    factorUnit('turtles', 'turtles', 0.0894),
    factorUnit('horses', 'horses', 20.115),
    factorUnit('jets', 'jets', 245.85)
  ],
  Power: [
    factorUnit('Watts', 'W', 1),
    factorUnit('Kilowatts', 'kW', 1000),
    factorUnit('Horsepower (US)', 'hp (US)', 745.6998715822702),
    factorUnit('Foot-pounds/minute', 'ft•lb/min', 0.0225969658055233),
    factorUnit('BTUs/minute', 'BTU/min', 17.58426666666667),
    factorUnit('light bulbs', 'light bulbs', 60),
    factorUnit('horses', 'horses', 745.7),
    factorUnit('train engines', 'train engines', 2982799.486329081)
  ],
  Energy: [
    factorUnit('Thermal calories', 'cal', 4.184),
    factorUnit('Food calories', 'kcal', 4184),
    factorUnit('British thermal units', 'BTU', 1055.056),
    factorUnit('Kilojoules', 'kJ', 1000),
    factorUnit('Kilowatt-hours', 'kWh', 3600000),
    factorUnit('Electron volts', 'eV', 0.0000000000000000001602176565),
    factorUnit('Joules', 'J', 1),
    factorUnit('Foot-pounds', 'ft•lb', 1.3558179483314),
    factorUnit('batteries', 'batteries', 9000),
    factorUnit('bananas', 'bananas', 439614),
    factorUnit('slices of cake', 'slices of cake', 1046700)
  ],
  Data: [
    factorUnit('Bits', 'b', 0.125),
    factorUnit('Nibble', 'nybl', 0.5),
    factorUnit('Bytes', 'B', 1),
    factorUnit('Kilobits', 'Kb', 125),
    factorUnit('Kibibits', 'Ki', 128),
    factorUnit('Kilobytes', 'KB', 1000),
    factorUnit('Kibibytes', 'KiB', 1024),
    factorUnit('Megabits', 'Mb', 125000),
    factorUnit('Mebibits', 'Mi', 131072),
    factorUnit('Megabytes', 'MB', 1000000),
    factorUnit('Mebibytes', 'MiB', 1048576),
    factorUnit('Gigabits', 'Gb', 125000000),
    factorUnit('Gibibits', 'Gi', 134217728),
    factorUnit('Gigabytes', 'GB', 1000000000),
    factorUnit('Gibibytes', 'GiB', 1073741824),
    factorUnit('Terabits', 'Tb', 125000000000),
    factorUnit('Tebibits', 'Ti', 137438953472),
    factorUnit('Terabytes', 'TB', 1000000000000),
    factorUnit('Tebibytes', 'TiB', 1099511627776),
    factorUnit('Petabits', 'Pb', 125000000000000),
    factorUnit('Pebibits', 'Pi', 140737488355328),
    factorUnit('Petabytes', 'PB', 1000000000000000),
    factorUnit('Pebibytes', 'PiB', 1125899906842624),
    factorUnit('Exabits', 'E', 125000000000000000),
    factorUnit('Exbibits', 'Ei', 144115188075855870),
    factorUnit('Exabytes', 'EB', 1000000000000000000),
    factorUnit('Exbibytes', 'EiB', 1152921504606847000),
    factorUnit('Zetabits', 'Z', 1.25e+20),
    factorUnit('Zebibits', 'Zi', 1.4757395258967641e+20),
    factorUnit('Zetabytes', 'ZB', 1e+21),
    factorUnit('Zebibytes', 'ZiB', 1.1805916207174113e+21),
    factorUnit('Yottabits', 'Y', 1.25e+23),
    factorUnit('Yobibits', 'Yi', 1.5111572745182865e+23),
    factorUnit('Yottabytes', 'YB', 1e+24),
    factorUnit('Yobibytes', 'YiB', 1.2089258196146292e+24),
    factorUnit('floppy disks', 'floppy disks', 1474560),
    factorUnit('CDs', 'CDs', 700000000),
    factorUnit('DVDs', 'DVDs', 4700000000)
  ],
  Pressure: [
    factorUnit('Atmospheres', 'atm', 101325),
    factorUnit('Bars', 'ba', 100000),
    factorUnit('Kilopascals', 'kPa', 1000),
    factorUnit('Millimeters of mercury ', 'mmHg', 133.322387415),
    factorUnit('Pascals', 'Pa', 1),
    factorUnit('Pounds per square inch', 'psi', 6894.757293168)
  ],
  Angle: [
    unit('Degrees', 'deg', (v) => v, (v) => v),
    unit('Radians', 'rad', (v) => v * 180 / Math.PI, (v) => v * Math.PI / 180),
    unit('Gradians', 'grad', (v) => v * 0.9, (v) => v / 0.9)
  ],
  Time: [
    factorUnit('Microseconds', 'µs', 0.000001),
    factorUnit('Milliseconds', 'ms', 0.001),
    factorUnit('Seconds', 's', 1),
    factorUnit('Minutes', 'min', 60),
    factorUnit('Hours', 'hr', 3600),
    factorUnit('Days', 'd', 86400),
    factorUnit('Weeks', 'wk', 604800),
    factorUnit('Years', 'yr', 31557600)
  ],
  Currency: CURRENCY_OPTIONS.map((currency) => unit(
    currency.name,
    currency.code,
    (v) => v / currency.unitsPerUsd,
    (v) => v * currency.unitsPerUsd
  ))
};
export const MOCK_CURRENCY_NOTE = 'Snapshot reference rates for the standalone web demo, matching the repository developer-mode approach.';
