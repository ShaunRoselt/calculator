function btn(label, action, value = '', tone = 'default') {
  return { label, action, value, tone };
}

function unit(name, symbol, toBase, fromBase) {
  return { name, symbol, toBase, fromBase };
}

export const STORAGE_KEYS = {
  history: 'windows-calculator-web-history',
  memory: 'windows-calculator-web-memory',
  nav: 'windows-calculator-web-nav',
  theme: 'windows-calculator-web-theme'
};

export const DEFAULT_MODE = 'standard';

export const MODE_META = {
  standard: { label: 'Standard', icon: 'standard', subtitle: 'Classic immediate evaluation' },
  scientific: { label: 'Scientific', icon: 'scientific', subtitle: 'Operators, functions, and expression support' },
  graphing: { label: 'Graphing', icon: 'graphing', subtitle: 'Plot a simple expression on a cartesian plane' },
  programmer: { label: 'Programmer', icon: 'programmer', subtitle: 'Integer math with base conversion' },
  date: { label: 'Date calculation', icon: 'date', subtitle: 'Find durations and shift dates' },
  currency: { label: 'Currency', icon: 'currency', subtitle: 'Convert mock exchange rates' },
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
    label: 'Calculator',
    modes: ['standard', 'scientific', 'graphing', 'programmer', 'date']
  },
  {
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

export const APP_INFO = {
  name: 'Calculator',
  version: '12.0.0'
};

const MOCK_CURRENCIES = [
  { name: 'US Dollar', label: 'United States - Dollar', symbol: '$', code: 'USD', unitsPerUsd: 1 },
  { name: 'Euro', label: 'Europe - Euro', symbol: '€', code: 'EUR', unitsPerUsd: 0.8681 },
  { name: 'British Pound', label: 'United Kingdom - Pound', symbol: '£', code: 'GBP', unitsPerUsd: 0.78 },
  { name: 'Japanese Yen', label: 'Japan - Yen', symbol: '¥', code: 'JPY', unitsPerUsd: 151.24 },
  { name: 'Canadian Dollar', label: 'Canada - Dollar', symbol: 'C$', code: 'CAD', unitsPerUsd: 1.35 },
  { name: 'Australian Dollar', label: 'Australia - Dollar', symbol: 'A$', code: 'AUD', unitsPerUsd: 1.52 },
  { name: 'Brazilian Real', label: 'Brazil - Real', symbol: 'R$', code: 'BRL', unitsPerUsd: 5.06 },
  { name: 'Chilean Peso', label: 'Chile - Peso', symbol: 'CLP$', code: 'CLP', unitsPerUsd: 973.2 },
  { name: 'Chinese Yuan', label: 'China - Yuan Renminbi', symbol: 'CN¥', code: 'CNY', unitsPerUsd: 7.24 },
  { name: 'Colombian Peso', label: 'Colombia - Peso', symbol: 'COP$', code: 'COP', unitsPerUsd: 3921.4 },
  { name: 'Danish Krone', label: 'Denmark - Krone', symbol: 'kr', code: 'DKK', unitsPerUsd: 6.47 },
  { name: 'Egyptian Pound', label: 'Egypt - Pound', symbol: 'E£', code: 'EGP', unitsPerUsd: 48.5 },
  { name: 'Hong Kong Dollar', label: 'Hong Kong SAR - Dollar', symbol: 'HK$', code: 'HKD', unitsPerUsd: 7.82 },
  { name: 'Indian Rupee', label: 'India - Rupee', symbol: '₹', code: 'INR', unitsPerUsd: 83.45 },
  { name: 'Kenyan Shilling', label: 'Kenya - Shilling', symbol: 'KSh', code: 'KES', unitsPerUsd: 129.3 },
  { name: 'Mexican Peso', label: 'Mexico - Peso', symbol: 'MX$', code: 'MXN', unitsPerUsd: 16.72 },
  { name: 'Nigerian Naira', label: 'Nigeria - Naira', symbol: '₦', code: 'NGN', unitsPerUsd: 1542.0 },
  { name: 'New Zealand Dollar', label: 'New Zealand - Dollar', symbol: 'NZ$', code: 'NZD', unitsPerUsd: 1.66 },
  { name: 'Norwegian Krone', label: 'Norway - Krone', symbol: 'kr', code: 'NOK', unitsPerUsd: 10.78 },
  { name: 'Philippine Piso', label: 'Philippines - Piso', symbol: '₱', code: 'PHP', unitsPerUsd: 57.1 },
  { name: 'Polish Zloty', label: 'Poland - Zloty', symbol: 'zł', code: 'PLN', unitsPerUsd: 3.96 },
  { name: 'Qatari Riyal', label: 'Qatar - Riyal', symbol: 'QR', code: 'QAR', unitsPerUsd: 3.64 },
  { name: 'Saudi Riyal', label: 'Saudi Arabia - Riyal', symbol: 'SAR', code: 'SAR', unitsPerUsd: 3.75 },
  { name: 'Singapore Dollar', label: 'Singapore - Dollar', symbol: 'S$', code: 'SGD', unitsPerUsd: 1.34 },
  { name: 'South African Rand', label: 'South Africa - Rand', symbol: 'R', code: 'ZAR', unitsPerUsd: 18.52 },
  { name: 'South Korean Won', label: 'South Korea - Won', symbol: '₩', code: 'KRW', unitsPerUsd: 1344.0 },
  { name: 'Swedish Krona', label: 'Sweden - Krona', symbol: 'kr', code: 'SEK', unitsPerUsd: 10.42 },
  { name: 'Swiss Franc', label: 'Switzerland - Franc', symbol: 'CHF', code: 'CHF', unitsPerUsd: 0.91 },
  { name: 'Thai Baht', label: 'Thailand - Baht', symbol: '฿', code: 'THB', unitsPerUsd: 36.54 },
  { name: 'Turkish Lira', label: 'Turkey - Lira', symbol: '₺', code: 'TRY', unitsPerUsd: 32.21 },
  { name: 'Turkmenistani Manat', label: 'Turkmenistan - Manat', symbol: 'm', code: 'TMT', unitsPerUsd: 3.5 },
  { name: 'Ugandan Shilling', label: 'Uganda - Shilling', symbol: 'USh', code: 'UGX', unitsPerUsd: 3810.0 },
  { name: 'Ukrainian Hryvnia', label: 'Ukraine - Hryvnia', symbol: '₴', code: 'UAH', unitsPerUsd: 39.21 },
  { name: 'UAE Dirham', label: 'United Arab Emirates - Dirham', symbol: 'AED', code: 'AED', unitsPerUsd: 3.6725 },
  { name: 'Uruguayan Peso', label: 'Uruguay - Peso', symbol: '$U', code: 'UYU', unitsPerUsd: 39.11 },
  { name: 'Uzbekistani Som', label: 'Uzbekistan - Som', symbol: 'soʻm', code: 'UZS', unitsPerUsd: 12650.0 },
  { name: 'Vanuatu Vatu', label: 'Vanuatu - Vatu', symbol: 'VT', code: 'VUV', unitsPerUsd: 118.72 },
  { name: 'Venezuelan Bolivar Soberano', label: 'Venezuela - Bolívar Soberano', symbol: 'Bs.S', code: 'VES', unitsPerUsd: 36.45 },
  { name: 'Vietnamese Dong', label: 'Vietnam - Dong', symbol: '₫', code: 'VND', unitsPerUsd: 24675.0 },
  { name: 'Yemeni Rial', label: 'Yemen - Rial', symbol: 'YER', code: 'YER', unitsPerUsd: 250.35 }
];

export const CURRENCY_OPTIONS = [...MOCK_CURRENCIES].sort((left, right) => left.label.localeCompare(right.label));

export const CURRENCY_DETAILS = Object.fromEntries(
  CURRENCY_OPTIONS.map((currency) => [currency.name, { label: currency.label, symbol: currency.symbol, code: currency.code }])
);

export const CURRENCY_CODE_TO_NAME = Object.fromEntries(
  CURRENCY_OPTIONS.map((currency) => [currency.code, currency.name])
);

export const DEFAULT_CURRENCY_RATES = Object.fromEntries(
  CURRENCY_OPTIONS.map((currency) => [currency.name, currency.unitsPerUsd])
);

export const MOCK_CURRENCY_UPDATED_AT = '2026/04/05 15:13:00';

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
  Power: [
    unit('Watt', 'W', (v) => v, (v) => v),
    unit('Kilowatt', 'kW', (v) => v * 1000, (v) => v / 1000),
    unit('Horsepower', 'hp', (v) => v * 745.699872, (v) => v / 745.699872),
    unit('BTU per hour', 'BTU/h', (v) => v * 0.29307107, (v) => v / 0.29307107)
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
  Pressure: [
    unit('Pascal', 'Pa', (v) => v, (v) => v),
    unit('Kilopascal', 'kPa', (v) => v * 1000, (v) => v / 1000),
    unit('Bar', 'bar', (v) => v * 100000, (v) => v / 100000),
    unit('PSI', 'psi', (v) => v * 6894.757293, (v) => v / 6894.757293)
  ],
  Angle: [
    unit('Degree', '°', (v) => v, (v) => v),
    unit('Radian', 'rad', (v) => v * 180 / Math.PI, (v) => v * Math.PI / 180),
    unit('Gradian', 'grad', (v) => v * 0.9, (v) => v / 0.9),
    unit('Minute of arc', 'arcmin', (v) => v / 60, (v) => v * 60)
  ],
  Time: [
    unit('Second', 's', (v) => v, (v) => v),
    unit('Minute', 'min', (v) => v * 60, (v) => v / 60),
    unit('Hour', 'h', (v) => v * 3600, (v) => v / 3600),
    unit('Day', 'd', (v) => v * 86400, (v) => v / 86400),
    unit('Week', 'wk', (v) => v * 604800, (v) => v / 604800)
  ],
  Currency: MOCK_CURRENCIES.map((currency) => unit(
    currency.name,
    currency.code,
    (v) => v / currency.unitsPerUsd,
    (v) => v * currency.unitsPerUsd
  ))
};
export const MOCK_CURRENCY_NOTE = 'Mock reference rates for the standalone web demo, matching the repository developer-mode approach.';
