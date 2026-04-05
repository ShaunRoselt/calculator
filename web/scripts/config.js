function btn(label, action, value = '', tone = 'default') {
  return { label, action, value, tone };
}

function unit(name, symbol, toBase, fromBase) {
  return { name, symbol, toBase, fromBase };
}

export const STORAGE_KEYS = {
  history: 'windows-calculator-web-history',
  memory: 'windows-calculator-web-memory',
  nav: 'windows-calculator-web-nav'
};

export const MODE_META = {
  standard: { label: 'Standard', icon: '🧮', subtitle: 'Classic immediate evaluation' },
  scientific: { label: 'Scientific', icon: 'ƒ', subtitle: 'Operators, functions, and expression support' },
  programmer: { label: 'Programmer', icon: '⌨', subtitle: 'Integer math with base conversion' },
  date: { label: 'Date Calculation', icon: '📅', subtitle: 'Find durations and shift dates' },
  converter: { label: 'Unit Converter', icon: '⇄', subtitle: 'Convert units and mock currencies' },
  graphing: { label: 'Graphing', icon: '📈', subtitle: 'Plot a simple expression on a cartesian plane' }
};

export const STANDARD_BUTTONS = [
  [btn('%', 'percent', '', 'function'), btn('CE', 'clear-entry', '', 'function'), btn('C', 'clear-all', '', 'function'), btn('⌫', 'backspace', '', 'function')],
  [btn('1/x', 'standard-unary', 'reciprocal', 'function'), btn('x²', 'standard-unary', 'square', 'function'), btn('√x', 'standard-unary', 'sqrt', 'function'), btn('÷', 'operator', '/', 'operator')],
  [btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('×', 'operator', '*', 'operator')],
  [btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('−', 'operator', '-', 'operator')],
  [btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('+', 'operator', '+', 'operator')],
  [btn('±', 'negate', ''), btn('0', 'digit', '0'), btn('.', 'decimal', '.'), btn('=', 'equals', '', 'equals')]
];

export const SCIENTIFIC_BUTTONS = [
  [btn('2ⁿᵈ', 'noop', '', 'function'), btn('π', 'constant', 'pi', 'function'), btn('e', 'constant', 'e', 'function'), btn('(', 'paren', '(' , 'function'), btn(')', 'paren', ')', 'function')],
  [btn('x²', 'scientific-unary', 'square', 'function'), btn('x³', 'scientific-unary', 'cube', 'function'), btn('xʸ', 'operator', '^', 'operator'), btn('10ˣ', 'scientific-unary', 'pow10', 'function'), btn('÷', 'operator', '/', 'operator')],
  [btn('√x', 'scientific-unary', 'sqrt', 'function'), btn('∛x', 'scientific-unary', 'cbrt', 'function'), btn('x!', 'scientific-unary', 'factorial', 'function'), btn('mod', 'operator', 'mod', 'operator'), btn('×', 'operator', '*', 'operator')],
  [btn('sin', 'scientific-unary', 'sin', 'function'), btn('cos', 'scientific-unary', 'cos', 'function'), btn('tan', 'scientific-unary', 'tan', 'function'), btn('ln', 'scientific-unary', 'ln', 'function'), btn('−', 'operator', '-', 'operator')],
  [btn('log', 'scientific-unary', 'log', 'function'), btn('exp', 'scientific-unary', 'exp', 'function'), btn('1/x', 'scientific-unary', 'reciprocal', 'function'), btn('C', 'clear-all', '', 'function'), btn('+', 'operator', '+', 'operator')],
  [btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('CE', 'clear-entry', '', 'function'), btn('⌫', 'backspace', '', 'function')],
  [btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('±', 'negate', ''), btn('=', 'equals', '', 'equals')],
  [btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('.', 'decimal', '.'), btn('0', 'digit', '0')]
];

export const PROGRAMMER_BUTTONS = [
  [btn('A', 'digit', 'A'), btn('B', 'digit', 'B'), btn('C', 'digit', 'C'), btn('D', 'digit', 'D'), btn('E', 'digit', 'E')],
  [btn('F', 'digit', 'F'), btn('AND', 'operator', 'and', 'operator'), btn('OR', 'operator', 'or', 'operator'), btn('XOR', 'operator', 'xor', 'operator'), btn('NOT', 'programmer-unary', 'not', 'function')],
  [btn('7', 'digit', '7'), btn('8', 'digit', '8'), btn('9', 'digit', '9'), btn('<<', 'operator', 'lsh', 'operator'), btn('>>', 'operator', 'rsh', 'operator')],
  [btn('4', 'digit', '4'), btn('5', 'digit', '5'), btn('6', 'digit', '6'), btn('mod', 'operator', 'mod', 'operator'), btn('÷', 'operator', '/', 'operator')],
  [btn('1', 'digit', '1'), btn('2', 'digit', '2'), btn('3', 'digit', '3'), btn('×', 'operator', '*', 'operator'), btn('−', 'operator', '-', 'operator')],
  [btn('±', 'negate', ''), btn('0', 'digit', '0'), btn('⌫', 'backspace', '', 'function'), btn('C', 'clear-all', '', 'function'), btn('+', 'operator', '+', 'operator')],
  [btn('CE', 'clear-entry', '', 'function'), btn('=', 'equals', '', 'equals')]
];

export const UNIT_CATEGORIES = {
  Length: [
    unit('Meter', 'm', (v) => v, (v) => v),
    unit('Kilometer', 'km', (v) => v * 1000, (v) => v / 1000),
    unit('Centimeter', 'cm', (v) => v / 100, (v) => v * 100),
    unit('Mile', 'mi', (v) => v * 1609.344, (v) => v / 1609.344),
    unit('Foot', 'ft', (v) => v * 0.3048, (v) => v / 0.3048),
    unit('Inch', 'in', (v) => v * 0.0254, (v) => v / 0.0254)
  ],
  Mass: [
    unit('Kilogram', 'kg', (v) => v, (v) => v),
    unit('Gram', 'g', (v) => v / 1000, (v) => v * 1000),
    unit('Pound', 'lb', (v) => v * 0.45359237, (v) => v / 0.45359237),
    unit('Ounce', 'oz', (v) => v * 0.028349523125, (v) => v / 0.028349523125),
    unit('Metric Ton', 't', (v) => v * 1000, (v) => v / 1000)
  ],
  Temperature: [
    unit('Celsius', '°C', (v) => v, (v) => v),
    unit('Fahrenheit', '°F', (v) => (v - 32) * 5 / 9, (v) => (v * 9 / 5) + 32),
    unit('Kelvin', 'K', (v) => v - 273.15, (v) => v + 273.15)
  ],
  Volume: [
    unit('Liter', 'L', (v) => v, (v) => v),
    unit('Milliliter', 'mL', (v) => v / 1000, (v) => v * 1000),
    unit('US Gallon', 'gal', (v) => v * 3.785411784, (v) => v / 3.785411784),
    unit('US Pint', 'pt', (v) => v * 0.473176473, (v) => v / 0.473176473),
    unit('Cubic Meter', 'm³', (v) => v * 1000, (v) => v / 1000)
  ],
  Area: [
    unit('Square Meter', 'm²', (v) => v, (v) => v),
    unit('Square Kilometer', 'km²', (v) => v * 1_000_000, (v) => v / 1_000_000),
    unit('Square Foot', 'ft²', (v) => v * 0.09290304, (v) => v / 0.09290304),
    unit('Acre', 'ac', (v) => v * 4046.8564224, (v) => v / 4046.8564224)
  ],
  Speed: [
    unit('Meters per second', 'm/s', (v) => v, (v) => v),
    unit('Kilometers per hour', 'km/h', (v) => v / 3.6, (v) => v * 3.6),
    unit('Miles per hour', 'mph', (v) => v * 0.44704, (v) => v / 0.44704),
    unit('Knot', 'kn', (v) => v * 0.514444, (v) => v / 0.514444)
  ],
  Energy: [
    unit('Joule', 'J', (v) => v, (v) => v),
    unit('Kilojoule', 'kJ', (v) => v * 1000, (v) => v / 1000),
    unit('Calorie', 'cal', (v) => v * 4.184, (v) => v / 4.184),
    unit('Kilowatt hour', 'kWh', (v) => v * 3_600_000, (v) => v / 3_600_000)
  ],
  Data: [
    unit('Byte', 'B', (v) => v, (v) => v),
    unit('Kilobyte', 'KB', (v) => v * 1024, (v) => v / 1024),
    unit('Megabyte', 'MB', (v) => v * 1024 ** 2, (v) => v / 1024 ** 2),
    unit('Gigabyte', 'GB', (v) => v * 1024 ** 3, (v) => v / 1024 ** 3),
    unit('Bit', 'bit', (v) => v / 8, (v) => v * 8)
  ],
  Time: [
    unit('Second', 's', (v) => v, (v) => v),
    unit('Minute', 'min', (v) => v * 60, (v) => v / 60),
    unit('Hour', 'h', (v) => v * 3600, (v) => v / 3600),
    unit('Day', 'd', (v) => v * 86400, (v) => v / 86400),
    unit('Week', 'wk', (v) => v * 604800, (v) => v / 604800)
  ],
  Currency: [
    unit('US Dollar', 'USD', (v) => v, (v) => v),
    unit('Euro', 'EUR', (v) => v / 0.92, (v) => v * 0.92),
    unit('British Pound', 'GBP', (v) => v / 0.78, (v) => v * 0.78),
    unit('Japanese Yen', 'JPY', (v) => v / 151.24, (v) => v * 151.24),
    unit('Canadian Dollar', 'CAD', (v) => v / 1.35, (v) => v * 1.35)
  ]
};
export const MOCK_CURRENCY_NOTE = 'Mock reference rates for the standalone web demo, matching the repository developer-mode approach.';
