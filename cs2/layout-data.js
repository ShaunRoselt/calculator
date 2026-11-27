import {
  CONVERTER_MODE_TO_CATEGORY, CURRENCY_OPTIONS, MODE_META, NAVIGATION_GROUPS, PROGRAMMER_BUTTONS, SCIENTIFIC_BUTTONS,
  STANDARD_BUTTONS, UNIT_CATEGORIES,
} from '../scripts/config.js';
import { CURRENCY_KEYPAD, GENERIC_CONVERTER_KEYPAD } from '../scripts/Views/UnitConverter.js';
import { GRAPHING_KEYPAD_ROWS } from '../scripts/Views/GraphingCalculator/GraphingCalculator.js';
import { getSupportedLanguages } from '../scripts/i18n.js';
import themeManifest from '../assets/themes/data/index.json' with { type: 'json' };

const button = (label, action, value = '', tone = 'function') => ({ label, action, value, tone });

export const modes = ['standard', 'scientific', 'graphing', 'programmer', 'date', ...Object.keys(CONVERTER_MODE_TO_CATEGORY), 'settings'];
export const modeLabel = (mode) => MODE_META[mode].label;
export const navigationGroups = NAVIGATION_GROUPS;
export const collectionSize = 60;
export const converterKeypad = GENERIC_CONVERTER_KEYPAD;
export const currencyKeypad = CURRENCY_KEYPAD;

export const keys = {
  standard: STANDARD_BUTTONS,
  scientific: SCIENTIFIC_BUTTONS,
  programmer: PROGRAMMER_BUTTONS,
};

export const scientificShift = {
  5: button('x³', 'scientific-unary', 'cube'),
  10: button('³√x', 'scientific-unary', 'cbrt'),
  15: button('ʸ√x', 'operator', 'root'),
  20: button('2ˣ', 'scientific-unary', 'pow2'),
  25: button('logᵧ', 'operator', 'logbase'),
  30: button('eˣ', 'scientific-unary', 'powe'),
};

export const memoryKeys = [['MC', 'mc'], ['MR', 'mr'], ['M+', 'm+'], ['M−', 'm-'], ['MS', 'ms']];
export const scienceKeys = [
  ['DEG', 'cycle-angle'], ['F-E', 'toggle-fe'], ['Trigonometry', 'toggle-scientific-menu', 'trig'],
  ['Function', 'toggle-scientific-menu', 'function'],
];
export const scienceMenu = [
  [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'], ['sec', 'sec'], ['csc', 'csc'], ['cot', 'cot']],
  [['sin⁻¹', 'asin'], ['cos⁻¹', 'acos'], ['tan⁻¹', 'atan'], ['sec⁻¹', 'asec'], ['csc⁻¹', 'acsc'], ['cot⁻¹', 'acot']],
  [['sinh', 'sinh'], ['cosh', 'cosh'], ['tanh', 'tanh'], ['sech', 'sech'], ['csch', 'csch'], ['coth', 'coth']],
  [['sinh⁻¹', 'asinh'], ['cosh⁻¹', 'acosh'], ['tanh⁻¹', 'atanh'], ['sech⁻¹', 'asech'], ['csch⁻¹', 'acsch'], ['coth⁻¹', 'acoth']],
  [['|x|', 'abs'], ['⌊x⌋', 'floor'], ['⌈x⌉', 'ceil'], ['rand', 'rand'], ['dms', 'dms'], ['deg', 'degrees']],
];
export const bases = ['HEX', 'DEC', 'OCT', 'BIN'];
export const bitwiseKeys = [['AND', 'and'], ['OR', 'or'], ['XOR', 'xor'], ['NAND', 'nand'], ['NOR', 'nor'], ['NOT', 'not']];

export const graphKeypad = GRAPHING_KEYPAD_ROWS.map((row) => row.map(({ label, insert, editAction, tone }) =>
  button(label ?? '', 'graph', editAction ?? insert ?? 'shift', tone)));

export const graphColumns = 72;
export const graphRows = 32;
export const graphListSize = 16;
export const graphGridSize = 23;
export const graphTraceZones = 41;
export const graphVectorLayers = 4;
export const graphVectorSegments = 100;
export const graphColors = [
  '#107c10', '#0063b1', '#e81123', '#8a8886', '#00b7c3', '#6600cc', '#00cc6a',
  '#008055', '#58595b', '#e3008c', '#b31564', '#ffb900', '#f7630c', '#8e562e', '#000000',
];
export const pickerRows = 8;
export const scrollPickerRows = Math.max(CURRENCY_OPTIONS.length, getSupportedLanguages().length,
  ...Object.values(UNIT_CATEGORIES).map((units) => units.length));
export const themePickerRows = themeManifest.themes.length + 1;
