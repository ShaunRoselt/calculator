import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, beforeEach, test } from 'node:test';
import { CONVERTER_MODE_TO_CATEGORY } from '../scripts/config.js';
import { initI18n } from '../scripts/i18n.js';
import {
  computeDateResults,
  getUnitsForCategory,
  handleAction,
  handleMemoryOperation,
  recallHistory,
  recallMemory,
  syncConverterValues
} from '../scripts/logic.js';
import {
  createProgrammerState,
  createScientificState,
  createStandardState,
  getHistoryCollection,
  replaceHistoryCollection,
  replaceMemoryCollection,
  state
} from '../scripts/state.js';

const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  }
});

before(async () => {
  const fetch = globalThis.fetch;
  const translations = await readFile(new URL('../assets/i18n/en.json', import.meta.url), 'utf8');
  globalThis.document = { documentElement: {} };
  globalThis.fetch = async () => new Response(translations);
  try {
    await initI18n();
  } finally {
    globalThis.fetch = fetch;
  }
});

beforeEach(() => {
  state.mode = 'standard';
  state.settings.repeatEquals = true;
  state.standard = createStandardState();
  state.scientific = createScientificState();
  state.programmer = createProgrammerState();
  for (const mode of ['standard', 'scientific', 'programmer']) {
    replaceHistoryCollection([], mode);
    replaceMemoryCollection([], mode);
  }
  storage.clear();
});

function enter(input) {
  for (const character of input) {
    if (/[0-9A-F]/.test(character)) {
      handleAction('digit', character);
    } else if (character === '=') {
      handleAction('equals');
    } else if (character === '.') {
      handleAction('decimal');
    } else if (character === '(' || character === ')') {
      handleAction('paren', character);
    } else {
      handleAction('operator', character);
    }
  }
}

function display() {
  return state[state.mode].display.replace(/\s/g, '');
}

test('standard arithmetic and memory accept the displayed grouping separators', () => {
  enter('999+2=');
  assert.equal(display(), '1001');
  handleMemoryOperation('ms');
  enter('+20=');
  assert.equal(display(), '1021');
  handleMemoryOperation('m+');
  handleAction('clear-all');
  recallMemory(0);
  assert.equal(display(), '2022');
  enter('+1==');
  assert.equal(display(), '2024');
});

test('recalling a standard result discards pending and repeated operations', () => {
  enter('3+3=4+3');
  recallHistory(0);
  enter('=');
  assert.equal(display(), '6');
  enter('+4=');
  assert.equal(display(), '10');
});

test('chaining retains precision beyond the formatted display', () => {
  enter('1/3=*3=');
  assert.equal(display(), '1');
  state.mode = 'scientific';
  enter('1/3=*3=');
  assert.equal(display(), '1');
});

test('standard percentage, division error, and clear entry', () => {
  enter('200+10');
  handleAction('percent');
  enter('=');
  assert.equal(display(), '220');
  enter('/0=');
  assert.equal(state.standard.error, true);
  handleAction('clear-entry');
  assert.equal(state.standard.error, false);
  assert.equal(display(), '0');
});

test('scientific evaluation chains from the result and repeats the outer operation', () => {
  state.mode = 'scientific';
  enter('2+3*4=');
  assert.equal(display(), '14');
  enter('=');
  assert.equal(display(), '26');
  enter('*2=');
  assert.equal(display(), '52');
  state.settings.repeatEquals = false;
  enter('=');
  assert.equal(display(), '52');
});

for (const [expression, expected] of [
  ['2^3^2=', '512'],
  ['2^-3=', '0.125'],
  ['-2^2=', '-4'],
  ['(-2)^2=', '4'],
  ['(-1)^-2147483648=', '1']
]) {
  test(`scientific powers evaluate ${expression}`, () => {
    state.mode = 'scientific';
    enter(expression);
    assert.equal(display(), expected);
  });
}

test('scientific unary operations preserve a pending expression', () => {
  state.mode = 'scientific';
  enter('2+3');
  handleAction('scientific-unary', 'square');
  enter('=');
  assert.equal(display(), '11');
  enter('2.25');
  handleAction('scientific-unary', 'sqrt');
  enter('-1.5=');
  assert.equal(display(), '0');
});

test('scientific notation can feed the next calculation and clears with CE', () => {
  state.mode = 'scientific';
  enter('10^21=');
  handleAction('toggle-fe');
  enter('/10=');
  assert.equal(display(), '1E+20');
  handleAction('clear-entry');
  assert.equal(display(), '0');
  assert.equal(state.scientific.isExponentialFormat, false);
});

test('scientific factorial reports overflow and allows recovery', () => {
  state.mode = 'scientific';
  enter('171');
  handleAction('scientific-unary', 'factorial');
  assert.equal(state.scientific.error, true);
  enter('5');
  handleAction('scientific-unary', 'factorial');
  assert.equal(display(), '120');
});

test('programmer history recalls its signed value across bases and word sizes', () => {
  state.mode = 'programmer';
  handleAction('set-base', 'HEX');
  enter('A+5=');
  assert.equal(display(), 'F');
  assert.equal(getHistoryCollection()[0].programmerValue, '15');
  enter('+2');
  handleAction('set-base', 'DEC');
  recallHistory(0);
  enter('=');
  assert.equal(display(), '15');
  handleAction('set-word-size', 'BYTE');
  enter('127+1=');
  assert.equal(display(), '-128');
  assert.equal(getHistoryCollection()[0].result, '-128');
});

test('legacy hexadecimal history can be recalled and large shifts are bounded', () => {
  state.mode = 'programmer';
  replaceHistoryCollection([{ expression: 'A + 5 =', result: 'F' }]);
  recallHistory(0);
  assert.equal(display(), '15');
  enter('1');
  handleAction('operator', 'lsh');
  enter('100000000000=');
  assert.equal(display(), '0');
});

test('date calculations use UTC calendar days and clamp month ends', () => {
  Object.assign(state.date, { mode: 'difference', from: '0099-12-31', to: '0100-01-02' });
  computeDateResults();
  assert.equal(state.date.result.totalDays, 2);
  Object.assign(state.date, { mode: 'shift', baseDate: '2025-01-31', operation: 'add', years: 0, months: 1, days: 0 });
  computeDateResults();
  assert.match(state.date.result.summary, /February 28 2025/);
  Object.assign(state.date, { baseDate: '2024-03-31', operation: 'subtract' });
  computeDateResults();
  assert.match(state.date.result.summary, /February 29 2024/);
});

test('converter examples use the selected units in both directions', () => {
  Object.assign(state.converter, { category: 'Length', fromUnit: 'Kilometers', toUnit: 'Miles', fromValue: '5' });
  syncConverterValues('from');
  assert.match(state.converter.toValue, /^3\.10685/);
  syncConverterValues('to');
  assert.ok(Math.abs(Number(state.converter.fromValue) - 5) < 1e-10);
  Object.assign(state.converter, { category: 'Temperature', fromUnit: 'Fahrenheit', toUnit: 'Celsius', fromValue: '32' });
  syncConverterValues('from');
  assert.equal(state.converter.toValue, '0');
});

for (const category of Object.values(CONVERTER_MODE_TO_CATEGORY)) {
  test(`${category} converter units have finite, reversible transforms`, () => {
    const units = getUnitsForCategory(category);
    assert.ok(units.length >= 2);
    for (const unit of units) {
      const input = 28.5;
      const roundTrip = unit.fromBase(unit.toBase(input));
      assert.ok(Math.abs(input - roundTrip) < 1e-8, `${unit.name} converted ${input} to ${roundTrip}`);
    }
  });
}
