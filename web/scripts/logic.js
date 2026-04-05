import { MODE_META, UNIT_CATEGORIES } from './config.js';
import {
  createProgrammerState,
  createScientificState,
  createStandardState,
  persistCollections,
  state
} from './state.js';
import { formatNumber } from './utils.js';

export function handleAction(action, value) {
  switch (state.mode) {
    case 'standard':
      handleStandardAction(action, value);
      break;
    case 'scientific':
      handleScientificAction(action, value);
      break;
    case 'programmer':
      handleProgrammerAction(action, value);
      break;
    default:
      break;
  }
}

function handleStandardAction(action, value) {
  const calc = state.standard;
  if (action === 'clear-all') {
    state.standard = createStandardState();
    return;
  }

  if (calc.error && !['clear-entry', 'clear-all'].includes(action)) {
    state.standard = createStandardState();
  }

  switch (action) {
    case 'digit':
      inputStandardDigit(value);
      break;
    case 'decimal':
      inputStandardDecimal();
      break;
    case 'operator':
      queueStandardOperator(value);
      break;
    case 'equals':
      evaluateStandardEquals();
      break;
    case 'negate':
      negateStandard();
      break;
    case 'percent':
      applyStandardPercent();
      break;
    case 'standard-unary':
      applyStandardUnary(value);
      break;
    case 'backspace':
      backspaceStandard();
      break;
    case 'clear-entry':
      clearEntryStandard();
      break;
    default:
      break;
  }
}

function inputStandardDigit(digit) {
  const calc = state.standard;
  if (calc.waitingForOperand || calc.justEvaluated) {
    calc.display = digit;
    calc.waitingForOperand = false;
    calc.justEvaluated = false;
    return;
  }
  calc.display = calc.display === '0' ? digit : `${calc.display}${digit}`;
}

function inputStandardDecimal() {
  const calc = state.standard;
  if (calc.waitingForOperand || calc.justEvaluated) {
    calc.display = '0.';
    calc.waitingForOperand = false;
    calc.justEvaluated = false;
    return;
  }
  if (!calc.display.includes('.')) {
    calc.display += '.';
  }
}

function queueStandardOperator(operator) {
  const calc = state.standard;
  const inputValue = parseDisplayNumber(calc.display);
  if (calc.operator && !calc.waitingForOperand) {
    const result = computeStandardBinary(calc.accumulator ?? 0, inputValue, calc.operator);
    if (result == null) {
      return;
    }
    calc.accumulator = result;
    calc.display = formatNumber(result);
  } else {
    calc.accumulator = inputValue;
  }
  calc.operator = operator;
  calc.expression = `${formatNumber(calc.accumulator)} ${operatorLabel(operator)}`;
  calc.waitingForOperand = true;
  calc.justEvaluated = false;
}

function evaluateStandardEquals() {
  const calc = state.standard;
  if (!calc.operator || calc.accumulator == null) {
    return;
  }
  const operand = calc.waitingForOperand ? (calc.lastOperand ?? parseDisplayNumber(calc.display)) : parseDisplayNumber(calc.display);
  const result = computeStandardBinary(calc.accumulator, operand, calc.operator);
  if (result == null) {
    return;
  }
  pushHistory(`${formatNumber(calc.accumulator)} ${operatorLabel(calc.operator)} ${formatNumber(operand)}`, formatNumber(result), 'standard');
  calc.display = formatNumber(result);
  calc.expression = `${formatNumber(calc.accumulator)} ${operatorLabel(calc.operator)} ${formatNumber(operand)}`;
  calc.accumulator = result;
  calc.lastOperand = operand;
  calc.operator = null;
  calc.waitingForOperand = true;
  calc.justEvaluated = true;
}

function negateStandard() {
  const calc = state.standard;
  if (calc.display === '0') {
    return;
  }
  calc.display = calc.display.startsWith('-') ? calc.display.slice(1) : `-${calc.display}`;
}

function applyStandardPercent() {
  const calc = state.standard;
  if (calc.accumulator == null) {
    return;
  }
  const current = parseDisplayNumber(calc.display);
  calc.display = formatNumber((calc.accumulator * current) / 100);
}

function applyStandardUnary(action) {
  const calc = state.standard;
  const current = parseDisplayNumber(calc.display);
  let result;
  let expression;
  if (action === 'reciprocal') {
    if (current === 0) {
      setStandardError('Cannot divide by zero');
      return;
    }
    result = 1 / current;
    expression = `1/(${formatNumber(current)})`;
  } else if (action === 'square') {
    result = current ** 2;
    expression = `sqr(${formatNumber(current)})`;
  } else if (action === 'sqrt') {
    if (current < 0) {
      setStandardError('Invalid input');
      return;
    }
    result = Math.sqrt(current);
    expression = `√(${formatNumber(current)})`;
  }
  calc.display = formatNumber(result);
  calc.expression = expression;
  calc.justEvaluated = true;
  pushHistory(expression, calc.display, 'standard');
}

function backspaceStandard() {
  const calc = state.standard;
  if (calc.waitingForOperand || calc.justEvaluated) {
    return;
  }
  calc.display = calc.display.length > 1 ? calc.display.slice(0, -1) : '0';
  if (calc.display === '-' || calc.display === '-0') {
    calc.display = '0';
  }
}

function clearEntryStandard() {
  state.standard.display = '0';
  state.standard.waitingForOperand = false;
}

function setStandardError(message) {
  state.standard.display = message;
  state.standard.error = true;
  state.standard.operator = null;
  state.standard.accumulator = null;
  state.standard.waitingForOperand = false;
}

function computeStandardBinary(left, right, operator) {
  if (operator === '/' && right === 0) {
    setStandardError('Cannot divide by zero');
    return null;
  }
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    default: return right;
  }
}

function handleScientificAction(action, value) {
  const calc = state.scientific;
  if (!['toggle-scientific-menu', 'toggle-scientific-hyp', 'toggle-shift'].includes(action)) {
    calc.openMenu = null;
  }

  if (action === 'clear-all') {
    state.scientific = createScientificState();
    return;
  }

  if (action === 'toggle-scientific-menu') {
    calc.openMenu = calc.openMenu === value ? null : value;
    if (calc.openMenu !== 'trig') {
      calc.isHyperbolic = false;
    }
    return;
  }

  if (action === 'toggle-shift') {
    calc.isShifted = !calc.isShifted;
    return;
  }

  if (action === 'toggle-scientific-hyp') {
    calc.isHyperbolic = !calc.isHyperbolic;
    return;
  }

  if (action === 'set-angle') {
    calc.angle = value;
    calc.display = formatScientificDisplay(parseDisplayNumber(calc.display), calc.display);
    return;
  }

  if (action === 'cycle-angle') {
    const nextAngle = {
      DEG: 'RAD',
      RAD: 'GRAD',
      GRAD: 'DEG'
    }[calc.angle] ?? 'DEG';
    calc.angle = nextAngle;
    calc.display = formatScientificDisplay(parseDisplayNumber(calc.display), calc.display);
    return;
  }

  if (action === 'toggle-fe') {
    calc.isExponentialFormat = !calc.isExponentialFormat;
    calc.display = formatScientificDisplay(parseDisplayNumber(calc.display), calc.display);
    return;
  }

  if (calc.error && !['clear-all', 'clear-entry'].includes(action)) {
    state.scientific = createScientificState();
  }

  switch (action) {
    case 'digit':
      appendScientificDigit(value);
      break;
    case 'decimal':
      appendScientificDecimal();
      break;
    case 'operator':
      appendScientificOperator(value);
      break;
    case 'paren':
      appendScientificParen(value);
      break;
    case 'constant':
      appendScientificConstant(value);
      break;
    case 'scientific-unary':
      applyScientificUnary(value);
      break;
    case 'negate':
      applyScientificUnary('negate');
      break;
    case 'backspace':
      scientificBackspace();
      break;
    case 'clear-entry':
      clearEntryScientific();
      break;
    case 'equals':
      evaluateScientificEquals();
      break;
    default:
      break;
  }
}

function appendScientificDigit(digit) {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    calc.justEvaluated = false;
  }
  if (needsImplicitMultiply(calc.expression)) {
    calc.expression += ' * ';
  }
  calc.expression += digit;
  calc.display = scientificDisplayFromExpression(calc.expression);
}

function clearEntryScientific() {
  const calc = state.scientific;
  calc.display = '0';
  calc.expression = '';
  calc.error = false;
  calc.justEvaluated = false;
}

function appendScientificDecimal() {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    calc.justEvaluated = false;
  }
  const token = lastScientificToken(calc.expression);
  if (token.includes('.')) {
    return;
  }
  if (needsImplicitMultiply(calc.expression)) {
    calc.expression += ' * ';
  }
  calc.expression += /\d$/.test(calc.expression) ? '.' : '0.';
  calc.display = scientificDisplayFromExpression(calc.expression);
}

function appendScientificOperator(operator) {
  const calc = state.scientific;
  calc.justEvaluated = false;
  const trimmed = calc.expression.trim();
  if (!trimmed && operator === '-') {
    calc.expression = '-';
    calc.display = '-';
    return;
  }
  if (!trimmed || /[+\-*/^(]$/.test(trimmed) || /mod$/.test(trimmed)) {
    return;
  }
  calc.expression = `${trimmed} ${operator} `;
}

function appendScientificParen(paren) {
  const calc = state.scientific;
  if (calc.justEvaluated && paren === '(') {
    calc.expression = '';
    calc.justEvaluated = false;
  }
  if (paren === '(') {
    if (needsImplicitMultiply(calc.expression)) {
      calc.expression += ' * ';
    }
    calc.expression += '(';
  } else if (canCloseScientificParen(calc.expression)) {
    calc.expression += ')';
  }
}

function appendScientificConstant(name) {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    calc.justEvaluated = false;
  }
  if (needsImplicitMultiply(calc.expression)) {
    calc.expression += ' * ';
  }
  calc.expression += name;
  calc.display = name === 'pi' ? formatNumber(Math.PI) : formatNumber(Math.E);
}

function applyScientificUnary(action) {
  const calc = state.scientific;
  const current = parseDisplayNumber(calc.display === '-' ? '0' : calc.display);
  let result;
  try {
    result = scientificUnary(action, current, calc.angle);
  } catch (error) {
    calc.display = error.message || 'Invalid input';
    calc.error = true;
    return;
  }
  const expression = unaryExpressionLabel(action, current);
  calc.expression = expression;
  calc.display = formatScientificDisplay(result);
  calc.justEvaluated = true;
  pushHistory(expression, calc.display, 'scientific');
}

function scientificBackspace() {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    calc.display = '0';
    calc.justEvaluated = false;
    return;
  }
  calc.expression = calc.expression.trimEnd();
  if (calc.expression.endsWith('mod')) {
    calc.expression = calc.expression.slice(0, -3);
  } else {
    calc.expression = calc.expression.slice(0, -1);
  }
  calc.expression = calc.expression.replace(/\s+$/, '');
  calc.display = scientificDisplayFromExpression(calc.expression) || '0';
}

function evaluateScientificEquals() {
  const calc = state.scientific;
  const expression = calc.expression.trim() || calc.display;
  try {
    const result = evaluateScientificExpression(expression, { angle: calc.angle });
    calc.display = formatScientificDisplay(result);
    calc.expression = expression;
    calc.justEvaluated = true;
    pushHistory(expression, calc.display, 'scientific');
  } catch (error) {
    calc.display = error.message || 'Invalid input';
    calc.error = true;
  }
}

function handleProgrammerAction(action, value) {
  const calc = state.programmer;
  if (action === 'clear-all') {
    state.programmer = createProgrammerState();
    return;
  }
  if (action === 'set-base') {
    setProgrammerBase(value);
    return;
  }
  if (action === 'set-word-size') {
    setProgrammerWordSize(value);
    return;
  }
  if (action === 'toggle-bit-panel') {
    calc.isBitFlipChecked = !calc.isBitFlipChecked;
    return;
  }
  if (action === 'set-programmer-view') {
    calc.isBitFlipChecked = value === 'bitflip';
    return;
  }
  if (action === 'cycle-word-size') {
    cycleProgrammerWordSize();
    return;
  }
  if (action === 'flip-bit') {
    flipProgrammerBit(Number(value));
    return;
  }
  if (calc.error && !['clear-all', 'clear-entry'].includes(action)) {
    state.programmer = createProgrammerState();
  }
  switch (action) {
    case 'digit':
      inputProgrammerDigit(value);
      break;
    case 'operator':
      queueProgrammerOperator(value);
      break;
    case 'programmer-unary':
      applyProgrammerUnary(value);
      break;
    case 'negate':
      negateProgrammer();
      break;
    case 'backspace':
      backspaceProgrammer();
      break;
    case 'clear-entry':
      state.programmer.display = '0';
      state.programmer.waitingForOperand = false;
      break;
    case 'equals':
      evaluateProgrammerEquals();
      break;
    default:
      break;
  }
}

function inputProgrammerDigit(digit) {
  const calc = state.programmer;
  if (!isProgrammerDigitAllowed(digit, calc.base)) {
    return;
  }
  if (calc.waitingForOperand || calc.justEvaluated) {
    calc.display = normalizeProgrammerDisplay(digit);
    calc.waitingForOperand = false;
    calc.justEvaluated = false;
    return;
  }
  calc.display = normalizeProgrammerDisplay(calc.display === '0' ? digit : `${calc.display}${digit}`);
}

function queueProgrammerOperator(operator) {
  const calc = state.programmer;
  const inputValue = getProgrammerCurrentValue();
  if (calc.operator && !calc.waitingForOperand) {
    const result = computeProgrammerBinary(calc.accumulator ?? 0n, inputValue, calc.operator);
    if (result == null) {
      return;
   }
    calc.accumulator = normalizeProgrammerValue(result);
    calc.display = formatBigInt(calc.accumulator, calc.base);
  } else {
    calc.accumulator = inputValue;
  }
  calc.operator = operator;
  calc.expression = `${formatBigInt(calc.accumulator, calc.base)} ${operatorLabel(operator)}`;
  calc.waitingForOperand = true;
  calc.justEvaluated = false;
}

function applyProgrammerUnary(action) {
  if (action !== 'not') {
    return;
  }
  const calc = state.programmer;
  const value = getProgrammerCurrentValue();
  const result = normalizeProgrammerValue(~value);
  calc.display = formatBigInt(result, calc.base);
  calc.expression = `NOT ${formatBigInt(value, calc.base)}`;
  calc.justEvaluated = true;
  pushHistory(calc.expression, calc.display, 'programmer');
}

function negateProgrammer() {
  const calc = state.programmer;
  const value = getProgrammerCurrentValue();
  calc.display = formatBigInt(normalizeProgrammerValue(-value), calc.base);
}

function backspaceProgrammer() {
  const calc = state.programmer;
  if (calc.waitingForOperand || calc.justEvaluated) {
    return;
  }
  calc.display = calc.display.length > 1 ? calc.display.slice(0, -1) : '0';
  if (calc.display === '-') {
    calc.display = '0';
  }
}

function evaluateProgrammerEquals() {
  const calc = state.programmer;
  if (!calc.operator || calc.accumulator == null) {
    return;
  }
  const right = getProgrammerCurrentValue();
  const result = computeProgrammerBinary(calc.accumulator, right, calc.operator);
  if (result == null) {
    return;
  }
  pushHistory(`${formatBigInt(calc.accumulator, calc.base)} ${operatorLabel(calc.operator)} ${formatBigInt(right, calc.base)}`, formatBigInt(result, calc.base), 'programmer');
  calc.display = formatBigInt(normalizeProgrammerValue(result), calc.base);
  calc.expression = `${formatBigInt(calc.accumulator, calc.base)} ${operatorLabel(calc.operator)} ${formatBigInt(right, calc.base)}`;
  calc.accumulator = normalizeProgrammerValue(result);
  calc.operator = null;
  calc.waitingForOperand = true;
  calc.justEvaluated = true;
}

function computeProgrammerBinary(left, right, operator) {
  try {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/':
        if (right === 0n) {
          setProgrammerError('Cannot divide by zero');
          return null;
        }
        return left / right;
      case 'mod':
        if (right === 0n) {
          setProgrammerError('Cannot modulo by zero');
          return null;
        }
        return left % right;
      case 'and': return left & right;
      case 'or': return left | right;
      case 'xor': return left ^ right;
      case 'lsh': return left << Number(right);
      case 'rsh': return left >> Number(right);
      default: return right;
    }
  } catch {
    setProgrammerError('Invalid programmer operation');
    return null;
  }
}

function setProgrammerBase(base) {
  const value = getProgrammerCurrentValue();
  state.programmer.base = base;
  state.programmer.display = formatBigInt(value, base);
}

function setProgrammerWordSize(wordSize) {
  const value = getProgrammerCurrentValue();
  state.programmer.wordSize = wordSize;
  state.programmer.display = formatBigInt(normalizeProgrammerValue(value), state.programmer.base);
  if (state.programmer.accumulator != null) {
    state.programmer.accumulator = normalizeProgrammerValue(state.programmer.accumulator);
  }
}

function cycleProgrammerWordSize() {
  const order = ['QWORD', 'DWORD', 'WORD', 'BYTE'];
  const currentIndex = order.indexOf(state.programmer.wordSize);
  const nextWordSize = order[(currentIndex + 1) % order.length];
  setProgrammerWordSize(nextWordSize);
}

function flipProgrammerBit(index) {
  if (!Number.isInteger(index) || index < 0 || index >= getProgrammerWordSizeBits()) {
    return;
  }
  const unsignedValue = toUnsignedProgrammerValue(getProgrammerCurrentValue());
  const toggled = unsignedValue ^ (1n << BigInt(index));
  state.programmer.display = formatBigInt(normalizeProgrammerValue(toggled), state.programmer.base);
  state.programmer.justEvaluated = false;
  state.programmer.waitingForOperand = false;
}

function setProgrammerError(message) {
  state.programmer.display = message;
  state.programmer.error = true;
  state.programmer.accumulator = null;
  state.programmer.operator = null;
}

export function handleMemoryOperation(operation) {
  const current = getCurrentDisplayNumericValue();
  if (current == null) {
    return;
  }
  if (operation === 'mc') {
    state.memory = [];
  } else if (operation === 'mr') {
    recallMemory(0);
    return;
  } else if (operation === 'ms') {
    state.memory.unshift({ value: formatStoredMemoryValue(current) });
  } else if (operation === 'm+' || operation === 'm-') {
    const existing = Number(state.memory[0]?.value || 0);
    const next = operation === 'm+' ? existing + Number(current) : existing - Number(current);
    state.memory[0] = { value: formatNumber(next) };
  }
  state.memory = state.memory.slice(0, 20);
  persistCollections();
}

export function recallMemory(index) {
  const item = state.memory[index];
  if (!item) {
    return;
  }
  if (state.mode === 'programmer') {
    const value = BigInt(Math.trunc(Number(item.value)));
    state.programmer.display = formatBigInt(value, state.programmer.base);
    state.programmer.waitingForOperand = false;
  } else if (state.mode === 'scientific') {
    state.scientific.display = item.value;
    state.scientific.expression = item.value;
    state.scientific.justEvaluated = true;
  } else {
    state.standard.display = item.value;
    state.standard.waitingForOperand = false;
  }
}

export function recallHistory(index) {
  const entry = state.history[index];
  if (!entry) {
    return;
  }
  if (state.mode === 'programmer') {
    const parsed = parseBigIntFlexible(entry.result);
    state.programmer.display = formatBigInt(parsed, state.programmer.base);
  } else if (state.mode === 'scientific') {
    state.scientific.expression = entry.expression;
    state.scientific.display = entry.result;
    state.scientific.justEvaluated = true;
  } else {
    state.standard.display = entry.result;
    state.standard.expression = entry.expression;
    state.standard.justEvaluated = true;
  }
}

function pushHistory(expression, result, mode) {
  state.history.unshift({ expression, result, mode, modeLabel: MODE_META[mode].label });
  state.history = state.history.slice(0, 60);
  persistCollections();
}

function getCurrentDisplayNumericValue() {
  if (state.mode === 'programmer') {
    return Number(getProgrammerCurrentValue());
  }
  if (state.mode === 'scientific') {
    const parsed = Number(state.scientific.display);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(state.standard.display);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatStoredMemoryValue(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return formatNumber(Number(value));
}

export function isCalculatorMode(mode) {
  return ['standard', 'scientific', 'programmer'].includes(mode);
}

export function isSidePanelVisible() {
  return isCalculatorMode(state.mode) && state.historyOpen;
}

function operatorLabel(operator) {
  return {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
    '^': '^',
    mod: 'mod',
    and: 'AND',
    or: 'OR',
    xor: 'XOR',
    lsh: '<<',
    rsh: '>>'
  }[operator] ?? operator;
}

function parseDisplayNumber(value) {
  return Number(String(value).replace(/,/g, ''));
}

function scientificUnary(action, value, angle) {
  const radians = angleToRadians(value, angle);
  switch (action) {
    case 'square': return value ** 2;
    case 'cube': return value ** 3;
    case 'pow2': return 2 ** value;
    case 'powe': return Math.exp(value);
    case 'pow10': return 10 ** value;
    case 'abs': return Math.abs(value);
    case 'floor': return Math.floor(value);
    case 'ceil': return Math.ceil(value);
    case 'degrees': return dmsToDegrees(value);
    case 'dms': return degreesToDms(value);
    case 'sqrt':
      if (value < 0) throw new Error('Invalid input');
      return Math.sqrt(value);
    case 'cbrt': return Math.cbrt(value);
    case 'factorial':
      if (value < 0 || !Number.isInteger(value)) throw new Error('Invalid input');
      return factorial(value);
    case 'sin': return Math.sin(radians);
    case 'cos': return Math.cos(radians);
    case 'tan': return Math.tan(radians);
    case 'sec': return reciprocalOf(Math.cos(radians));
    case 'csc': return reciprocalOf(Math.sin(radians));
    case 'cot': return reciprocalOf(Math.tan(radians));
    case 'asin': return radiansToAngle(Math.asin(clampUnitInterval(value)), angle);
    case 'acos': return radiansToAngle(Math.acos(clampUnitInterval(value)), angle);
    case 'atan': return radiansToAngle(Math.atan(value), angle);
    case 'asec':
      if (Math.abs(value) < 1) throw new Error('Invalid input');
      return radiansToAngle(Math.acos(1 / value), angle);
    case 'acsc':
      if (Math.abs(value) < 1) throw new Error('Invalid input');
      return radiansToAngle(Math.asin(1 / value), angle);
    case 'acot':
      return radiansToAngle(value === 0 ? Math.PI / 2 : Math.atan(1 / value), angle);
    case 'sinh': return Math.sinh(value);
    case 'cosh': return Math.cosh(value);
    case 'tanh': return Math.tanh(value);
    case 'sech': return reciprocalOf(Math.cosh(value));
    case 'csch': return reciprocalOf(Math.sinh(value));
    case 'coth': return reciprocalOf(Math.tanh(value));
    case 'asinh': return Math.asinh(value);
    case 'acosh':
      if (value < 1) throw new Error('Invalid input');
      return Math.acosh(value);
    case 'atanh':
      if (value <= -1 || value >= 1) throw new Error('Invalid input');
      return Math.atanh(value);
    case 'asech':
      if (value <= 0 || value > 1) throw new Error('Invalid input');
      return Math.acosh(1 / value);
    case 'acsch':
      if (value === 0) throw new Error('Invalid input');
      return Math.asinh(1 / value);
    case 'acoth':
      if (Math.abs(value) <= 1) throw new Error('Invalid input');
      return Math.atanh(1 / value);
    case 'ln':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log(value);
    case 'log':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log10(value);
    case 'exp': return Math.exp(value);
    case 'rand': return Math.random();
    case 'reciprocal':
      if (value === 0) throw new Error('Cannot divide by zero');
      return 1 / value;
    case 'negate': return -value;
    default: return value;
  }
}

function unaryExpressionLabel(action, value) {
  const formatted = formatNumber(value);
  return {
    square: `sqr(${formatted})`,
    cube: `cube(${formatted})`,
    pow2: `2^(${formatted})`,
    powe: `e^(${formatted})`,
    pow10: `10^(${formatted})`,
    abs: `abs(${formatted})`,
    floor: `floor(${formatted})`,
    ceil: `ceil(${formatted})`,
    degrees: `deg(${formatted})`,
    dms: `dms(${formatted})`,
    sqrt: `√(${formatted})`,
    cbrt: `∛(${formatted})`,
    factorial: `fact(${formatted})`,
    sin: `sin(${formatted})`,
    cos: `cos(${formatted})`,
    tan: `tan(${formatted})`,
    sec: `sec(${formatted})`,
    csc: `csc(${formatted})`,
    cot: `cot(${formatted})`,
    asin: `sin⁻¹(${formatted})`,
    acos: `cos⁻¹(${formatted})`,
    atan: `tan⁻¹(${formatted})`,
    asec: `sec⁻¹(${formatted})`,
    acsc: `csc⁻¹(${formatted})`,
    acot: `cot⁻¹(${formatted})`,
    sinh: `sinh(${formatted})`,
    cosh: `cosh(${formatted})`,
    tanh: `tanh(${formatted})`,
    sech: `sech(${formatted})`,
    csch: `csch(${formatted})`,
    coth: `coth(${formatted})`,
    asinh: `sinh⁻¹(${formatted})`,
    acosh: `cosh⁻¹(${formatted})`,
    atanh: `tanh⁻¹(${formatted})`,
    asech: `sech⁻¹(${formatted})`,
    acsch: `csch⁻¹(${formatted})`,
    acoth: `coth⁻¹(${formatted})`,
    ln: `ln(${formatted})`,
    log: `log(${formatted})`,
    exp: `exp(${formatted})`,
    rand: 'rand()',
    reciprocal: `1/(${formatted})`,
    negate: `negate(${formatted})`
  }[action] ?? formatted;
}

function scientificDisplayFromExpression(expression) {
  const token = lastScientificToken(expression);
  if (!token) {
    return '0';
  }
  if (token === 'pi') return formatScientificDisplay(Math.PI);
  if (token === 'e') return formatScientificDisplay(Math.E);
  return token;
}

function lastScientificToken(expression) {
  const matches = expression.match(/(pi|e|-?\d*\.?\d+)$/);
  return matches?.[0] ?? '';
}

function needsImplicitMultiply(expression) {
  const trimmed = expression.trim();
  return !!trimmed && /([\d)e]|pi)$/.test(trimmed);
}

function canCloseScientificParen(expression) {
  const opens = (expression.match(/\(/g) || []).length;
  const closes = (expression.match(/\)/g) || []).length;
  return opens > closes && !/[+\-*/^(\s]$/.test(expression.trim());
}

function evaluateScientificExpression(expression, context = {}) {
  const tokens = tokenize(expression);
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function consume(expected) {
    const token = tokens[index];
    if (expected && token?.value !== expected) {
      throw new Error('Invalid input');
    }
    index += 1;
    return token;
  }

  function parseExpression() {
    let value = parseTerm();
    while (peek() && ['+', '-'].includes(peek().value)) {
      const operator = consume().value;
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parsePower();
    while (peek() && ['*', '/', 'mod'].includes(peek().value)) {
      const operator = consume().value;
      const right = parsePower();
      if ((operator === '/' || operator === 'mod') && right === 0) {
        throw new Error('Cannot divide by zero');
      }
      if (operator === '*') value *= right;
      if (operator === '/') value /= right;
      if (operator === 'mod') value %= right;
    }
    return value;
  }

  function parsePower() {
    let value = parseUnary();
    while (peek() && ['^', 'root', 'logbase'].includes(peek().value)) {
      const operator = consume().value;
      const exponent = parseUnary();
      if (operator === '^') {
        value = value ** exponent;
      }
      if (operator === 'root') {
        if (value === 0) {
          throw new Error('Invalid input');
        }
        value = nthRoot(exponent, value);
      }
      if (operator === 'logbase') {
        value = logBase(value, exponent);
      }
    }
    return value;
  }

  function parseUnary() {
    if (peek()?.value === '+') {
      consume('+');
      return parseUnary();
    }
    if (peek()?.value === '-') {
      consume('-');
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) {
      throw new Error('Invalid input');
    }
    if (token.type === 'number') {
      consume();
      return Number(token.value);
    }
    if (token.type === 'identifier') {
      consume();
      if (token.value === 'pi') return Math.PI;
      if (token.value === 'e') return Math.E;
      if (token.value === 'x') return context.x ?? 0;
      if (peek()?.value === '(') {
        consume('(');
        const argument = parseExpression();
        consume(')');
        return scientificFunction(token.value, argument, context.angle || 'RAD');
      }
      throw new Error('Invalid input');
    }
    if (token.value === '(') {
      consume('(');
      const value = parseExpression();
      consume(')');
      return value;
    }
    throw new Error('Invalid input');
  }

  const result = parseExpression();
  if (index < tokens.length) {
    throw new Error('Invalid input');
  }
  if (!Number.isFinite(result)) {
    throw new Error('Overflow');
  }
  return result;
}

function tokenize(expression) {
  const tokens = [];
  const normalized = expression.replace(/\s+/g, ' ').trim();
  let i = 0;
  while (i < normalized.length) {
    const char = normalized[i];
    if (char === ' ') {
      i += 1;
      continue;
    }
    if ('()+-*/^'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i += 1;
      continue;
    }
    if (/\d|\./.test(char)) {
      let number = char;
      i += 1;
      while (i < normalized.length && /[\d.]/.test(normalized[i])) {
        number += normalized[i];
        i += 1;
      }
      tokens.push({ type: 'number', value: number });
      continue;
    }
    if (/[A-Za-z]/.test(char)) {
      let identifier = char;
      i += 1;
      while (i < normalized.length && /[A-Za-z]/.test(normalized[i])) {
        identifier += normalized[i];
        i += 1;
      }
      tokens.push({ type: 'identifier', value: identifier.toLowerCase() });
      continue;
    }
    throw new Error('Invalid input');
  }
  return tokens;
}

function scientificFunction(name, value, angle) {
  switch (name) {
    case 'sin':
    case 'cos':
    case 'tan':
    case 'sec':
    case 'csc':
    case 'cot':
    case 'asin':
    case 'acos':
    case 'atan':
    case 'asec':
    case 'acsc':
    case 'acot':
    case 'sinh':
    case 'cosh':
    case 'tanh':
    case 'sech':
    case 'csch':
    case 'coth':
    case 'asinh':
    case 'acosh':
    case 'atanh':
    case 'asech':
    case 'acsch':
    case 'acoth':
    case 'dms':
    case 'degrees':
    case 'rand':
      return scientificUnary(name, value, angle);
    case 'sqrt':
      if (value < 0) throw new Error('Invalid input');
      return Math.sqrt(value);
    case 'abs': return Math.abs(value);
    case 'floor': return Math.floor(value);
    case 'ceil': return Math.ceil(value);
    case 'log':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log10(value);
    case 'ln':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log(value);
    case 'exp': return Math.exp(value);
    default: throw new Error('Invalid input');
  }
}

function angleToRadians(value, angle) {
  if (angle === 'DEG') {
    return (value * Math.PI) / 180;
  }
  if (angle === 'GRAD') {
    return (value * Math.PI) / 200;
  }
  return value;
}

function radiansToAngle(value, angle) {
  if (angle === 'DEG') {
    return (value * 180) / Math.PI;
  }
  if (angle === 'GRAD') {
    return (value * 200) / Math.PI;
  }
  return value;
}

function reciprocalOf(value) {
  if (value === 0) {
    throw new Error('Cannot divide by zero');
  }
  return 1 / value;
}

function clampUnitInterval(value) {
  if (value < -1 || value > 1) {
    throw new Error('Invalid input');
  }
  return value;
}

function nthRoot(value, degree) {
  if (degree === 0) {
    throw new Error('Invalid input');
  }
  if (value < 0 && Math.abs(degree % 2) !== 1) {
    throw new Error('Invalid input');
  }
  return value < 0 ? -((-value) ** (1 / degree)) : value ** (1 / degree);
}

function logBase(base, value) {
  if (base <= 0 || base === 1 || value <= 0) {
    throw new Error('Invalid input');
  }
  return Math.log(value) / Math.log(base);
}

function degreesToDms(value) {
  const sign = Math.sign(value) || 1;
  const absolute = Math.abs(value);
  const degrees = Math.trunc(absolute);
  const totalMinutes = (absolute - degrees) * 60;
  const minutes = Math.trunc(totalMinutes);
  const seconds = (totalMinutes - minutes) * 60;
  return sign * (degrees + minutes / 100 + seconds / 10000);
}

function dmsToDegrees(value) {
  const sign = Math.sign(value) || 1;
  const absolute = Math.abs(value);
  const degrees = Math.trunc(absolute);
  const minuteBlock = (absolute - degrees) * 100;
  const minutes = Math.trunc(minuteBlock);
  const seconds = (minuteBlock - minutes) * 100;
  if (minutes >= 60 || seconds >= 60) {
    throw new Error('Invalid input');
  }
  return sign * (degrees + minutes / 60 + seconds / 3600);
}

function factorial(value) {
  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
}

export function isProgrammerDigitAllowed(digit, base) {
  const allowed = {
    BIN: ['0', '1'],
    OCT: ['0', '1', '2', '3', '4', '5', '6', '7'],
    DEC: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    HEX: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
  };
  return allowed[base].includes(digit.toUpperCase());
}

export function getProgrammerCurrentValue() {
  try {
    return normalizeProgrammerValue(parseBigIntFromBase(state.programmer.display, state.programmer.base));
  } catch {
    return 0n;
  }
}

function parseBigIntFromBase(display, base) {
  const bases = { BIN: 2, OCT: 8, DEC: 10, HEX: 16 };
  const radix = bases[base];
  const value = display.trim().toUpperCase();
  const sign = value.startsWith('-') ? -1n : 1n;
  const digits = value.replace(/^-/, '') || '0';
  let result = 0n;
  for (const digit of digits) {
    const parsed = parseInt(digit, radix);
    if (Number.isNaN(parsed)) {
      throw new Error('Invalid digit');
    }
    const numeric = BigInt(parsed);
    result = result * BigInt(radix) + numeric;
  }
  return result * sign;
}

function parseBigIntFlexible(value) {
  const trimmed = String(value).trim();
  if (/^-?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }
  return BigInt(Math.trunc(Number(trimmed)) || 0);
}

export function formatBigInt(value, base) {
  const sign = value < 0n ? '-' : '';
  const radix = { BIN: 2, OCT: 8, DEC: 10, HEX: 16 }[base];
  const raw = (value < 0n ? -value : value).toString(radix);
  return `${sign}${base === 'HEX' ? raw.toUpperCase() : raw}`;
}

export function getProgrammerWordSizeBits() {
  return {
    QWORD: 64,
    DWORD: 32,
    WORD: 16,
    BYTE: 8
  }[state.programmer.wordSize] ?? 64;
}

export function getProgrammerBitColumns() {
  const bits = getProgrammerWordSizeBits();
  const columns = [];
  for (let bit = bits - 1; bit >= 0; bit -= 1) {
    columns.push(bit);
  }
  return columns;
}

export function getProgrammerBitValue(bit) {
  return Number((toUnsignedProgrammerValue(getProgrammerCurrentValue()) >> BigInt(bit)) & 1n);
}

function getProgrammerWordMask() {
  const bits = BigInt(getProgrammerWordSizeBits());
  return (1n << bits) - 1n;
}

function toUnsignedProgrammerValue(value) {
  return BigInt.asUintN(getProgrammerWordSizeBits(), value) & getProgrammerWordMask();
}

function normalizeProgrammerValue(value) {
  return BigInt.asIntN(getProgrammerWordSizeBits(), BigInt(value));
}

function normalizeProgrammerDisplay(display) {
  return formatBigInt(normalizeProgrammerValue(parseBigIntFromBase(display, state.programmer.base)), state.programmer.base);
}

function formatScientificDisplay(value, fallback = '0') {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (!state.scientific.isExponentialFormat) {
    return formatNumber(value);
  }
  return value.toExponential(12).replace(/\.?0+e/, 'e').toUpperCase();
}

function getDateParts(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function computeDateResults() {
  if (state.date.mode === 'difference') {
    const from = getDateParts(state.date.from);
    const to = getDateParts(state.date.to);
    const forward = to >= from;
    const start = forward ? from : to;
    const end = forward ? to : from;
    let years = end.getUTCFullYear() - start.getUTCFullYear();
    let months = end.getUTCMonth() - start.getUTCMonth();
    let days = end.getUTCDate() - start.getUTCDate();
    if (days < 0) {
      const prevMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
      days += prevMonth.getUTCDate();
      months -= 1;
    }
    if (months < 0) {
      months += 12;
      years -= 1;
    }
    const totalDays = Math.round((end - start) / 86400000);
    state.date.result = {
      totalDays,
      summary: `${years} years, ${months} months, ${days} days`,
      direction: totalDays === 0 ? 'Same day' : forward ? 'Forward' : 'Backward'
    };
  } else {
    const base = getDateParts(state.date.baseDate);
    const factor = state.date.operation === 'add' ? 1 : -1;
    const result = new Date(base);
    result.setUTCFullYear(result.getUTCFullYear() + Number(state.date.years || 0) * factor);
    result.setUTCMonth(result.getUTCMonth() + Number(state.date.months || 0) * factor);
    result.setUTCDate(result.getUTCDate() + Number(state.date.days || 0) * factor);
    state.date.result = {
      summary: result.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    };
  }
}

export function getUnitsForCategory(category) {
  return UNIT_CATEGORIES[category] || UNIT_CATEGORIES.Length;
}

export function resetConverterUnits() {
  const units = getUnitsForCategory(state.converter.category);
  state.converter.fromUnit = units[0].name;
  state.converter.toUnit = units[Math.min(1, units.length - 1)].name;
  state.converter.fromValue = state.converter.category === 'Currency' ? '0' : '1';
  state.converter.toValue = '';
  state.converter.lastEdited = 'from';
}

export function syncConverterValues(source) {
  const units = getUnitsForCategory(state.converter.category);
  const from = units.find((item) => item.name === state.converter.fromUnit) || units[0];
  const to = units.find((item) => item.name === state.converter.toUnit) || units[1] || units[0];
  const normalizedSource = source === 'to' ? 'to' : 'from';
  const numeric = Number(normalizeConverterValue(normalizedSource === 'from' ? state.converter.fromValue : state.converter.toValue));
  if (!Number.isFinite(numeric)) {
    if (normalizedSource === 'from') {
      state.converter.toValue = 'Invalid input';
    } else {
      state.converter.fromValue = 'Invalid input';
    }
    return;
  }
  if (normalizedSource === 'from') {
    const baseValue = from.toBase(numeric);
    state.converter.toValue = formatNumber(to.fromBase(baseValue));
    return;
  }

  const baseValue = to.toBase(numeric);
  state.converter.fromValue = formatNumber(from.fromBase(baseValue));
}

export function setConverterActiveField(field) {
  if (field === 'from' || field === 'to') {
    state.converter.lastEdited = field;
  }
}

export function handleConverterKeypad(action, value = '') {
  const activeField = state.converter.lastEdited === 'to' ? 'to' : 'from';
  const key = activeField === 'from' ? 'fromValue' : 'toValue';
  const currentRaw = String(state.converter[key] || '0');
  const allowNegative = state.converter.category !== 'Currency';
  const current = currentRaw === 'Invalid input' ? '0' : normalizeConverterValue(currentRaw, allowNegative);

  if (action === 'clear') {
    state.converter[key] = '0';
    syncConverterValues(activeField);
    return;
  }

  if (action === 'backspace') {
    const next = current.length > 1 ? current.slice(0, -1) : '0';
    state.converter[key] = normalizeConverterEntry(next, allowNegative);
    syncConverterValues(activeField);
    return;
  }

  if (action === 'digit') {
    const next = current === '0' ? value : `${current}${value}`;
    state.converter[key] = normalizeConverterEntry(next, allowNegative);
    syncConverterValues(activeField);
    return;
  }

  if (action === 'decimal') {
    if (current.includes('.')) {
      return;
    }
    state.converter[key] = normalizeConverterEntry(`${current}.`, allowNegative);
    syncConverterValues(activeField);
    return;
  }

  if (action === 'toggle-sign' && allowNegative) {
    if (Number(current) === 0) {
      state.converter[key] = '0';
    } else {
      state.converter[key] = current.startsWith('-') ? current.slice(1) : `-${current}`;
    }
    syncConverterValues(activeField);
  }
}

export function handleCurrencyKeypad(action, value = '') {
  handleConverterKeypad(action, value);
}

export function getConverterDisplayValue(field) {
  const raw = field === 'to' ? state.converter.toValue : state.converter.fromValue;
  if (raw === 'Invalid input') {
    return raw;
  }
  if (state.converter.category === 'Currency') {
    return String(raw || '0').replace(/\./g, ',');
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return String(raw || '0').replace(/\./g, ',');
  }

  let formatted;
  if (Number.isInteger(numeric)) {
    formatted = numeric.toString();
  } else if (Math.abs(numeric) >= 1) {
    formatted = String(Number(numeric.toPrecision(6)));
  } else {
    formatted = String(Number(numeric.toFixed(6)));
  }

  return formatted.replace(/\./g, ',');
}

function normalizeConverterEntry(value, allowNegative = state.converter.category !== 'Currency') {
  const normalized = normalizeConverterValue(value, allowNegative);
  if (normalized === '' || normalized === '-') {
    return '0';
  }
  return normalized;
}

function normalizeConverterValue(value, allowNegative = state.converter.category !== 'Currency') {
  return String(value || '')
    .replace(/,/g, '.')
    .replace(allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, '')
    .replace(allowNegative ? /(?!^)-/g : /-/g, '')
    .replace(/(\..*)\./g, '$1');
}

export function selectGraphExpression(index) {
  if (state.graphing.expressions[index]) {
    state.graphing.activeExpressionIndex = index;
  }
}

export function setGraphExpression(index, value) {
  const expression = state.graphing.expressions[index];
  if (!expression) {
    return;
  }
  expression.value = value;
  expression.error = false;
  state.graphing.activeExpressionIndex = index;
}

export function insertGraphToken(token) {
  const expression = state.graphing.expressions[state.graphing.activeExpressionIndex] || state.graphing.expressions[0];
  if (!expression) {
    return;
  }
  expression.value = `${expression.value}${token}`;
  expression.error = false;
}

export function backspaceGraphExpression() {
  const expression = state.graphing.expressions[state.graphing.activeExpressionIndex] || state.graphing.expressions[0];
  if (!expression) {
    return;
  }
  expression.value = expression.value.slice(0, -1);
  expression.error = false;
}

export function clearGraphExpression() {
  const expression = state.graphing.expressions[state.graphing.activeExpressionIndex] || state.graphing.expressions[0];
  if (!expression) {
    return;
  }
  expression.value = '';
  expression.error = false;
}

export function setGraphMobileView(view) {
  if (view === 'graph' || view === 'editor') {
    state.graphing.mobileView = view;
  }
}

export function zoomGraph(action) {
  const viewport = state.graphing.viewport;
  if (action === 'reset') {
    viewport.xMin = -24;
    viewport.xMax = 24;
    viewport.yMin = -15;
    viewport.yMax = 15;
    return;
  }

  const factor = action === 'in' ? 0.8 : 1.25;
  const centerX = (viewport.xMin + viewport.xMax) / 2;
  const centerY = (viewport.yMin + viewport.yMax) / 2;
  const halfWidth = ((viewport.xMax - viewport.xMin) / 2) * factor;
  const halfHeight = ((viewport.yMax - viewport.yMin) / 2) * factor;

  viewport.xMin = centerX - halfWidth;
  viewport.xMax = centerX + halfWidth;
  viewport.yMin = centerY - halfHeight;
  viewport.yMax = centerY + halfHeight;
}

export function updateGraph() {
  const activeExpressions = state.graphing.expressions.filter((expression) => expression.value.trim());
  let hasError = false;

  for (const expression of state.graphing.expressions) {
    if (!expression.value.trim()) {
      expression.error = false;
      continue;
    }

    try {
      evaluateScientificExpression(normalizeGraphExpression(expression.value), { x: 1, angle: state.scientific.angle });
      expression.error = false;
    } catch {
      expression.error = true;
      hasError = true;
    }
  }

  if (hasError) {
    state.graphing.status = 'Check the highlighted expression';
  } else if (activeExpressions.length) {
    state.graphing.status = `Plotting ${activeExpressions.length} expression${activeExpressions.length === 1 ? '' : 's'}`;
  } else {
    state.graphing.status = 'Enter an expression';
  }

  drawGraph();
}

export function drawGraph() {
  const canvas = document.getElementById('graph-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = Math.max(320, Math.round(canvas.clientWidth || 1200));
  const cssHeight = Math.max(240, Math.round(canvas.clientHeight || 640));

  if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { xMin, xMax, yMin, yMax } = state.graphing.viewport;
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const toScreenX = (value) => ((value - xMin) / xRange) * cssWidth;
  const toScreenY = (value) => cssHeight - (((value - yMin) / yRange) * cssHeight);
  const xAxisY = toScreenY(0);
  const yAxisX = toScreenX(0);

  ctx.fillStyle = '#f8f7f6';
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  for (let x = Math.floor(xMin); x <= Math.ceil(xMax); x += 1) {
    const screenX = toScreenX(x);
    ctx.beginPath();
    ctx.strokeStyle = x % 5 === 0 ? 'rgba(124, 124, 124, 0.28)' : 'rgba(124, 124, 124, 0.12)';
    ctx.lineWidth = x % 5 === 0 ? 1 : 0.8;
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, cssHeight);
    ctx.stroke();
  }

  for (let y = Math.floor(yMin); y <= Math.ceil(yMax); y += 1) {
    const screenY = toScreenY(y);
    ctx.beginPath();
    ctx.strokeStyle = y % 5 === 0 ? 'rgba(124, 124, 124, 0.28)' : 'rgba(124, 124, 124, 0.12)';
    ctx.lineWidth = y % 5 === 0 ? 1 : 0.8;
    ctx.moveTo(0, screenY);
    ctx.lineTo(cssWidth, screenY);
    ctx.stroke();
  }

  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1.2;
  if (yAxisX >= 0 && yAxisX <= cssWidth) {
    ctx.beginPath();
    ctx.moveTo(yAxisX, cssHeight);
    ctx.lineTo(yAxisX, 0);
    ctx.stroke();
  }
  if (xAxisY >= 0 && xAxisY <= cssHeight) {
    ctx.beginPath();
    ctx.moveTo(0, xAxisY);
    ctx.lineTo(cssWidth, xAxisY);
    ctx.stroke();
  }

  drawAxisDecorations(ctx, cssWidth, cssHeight, xAxisY, yAxisX, toScreenX, toScreenY, xMin, xMax, yMin, yMax);

  for (const expression of state.graphing.expressions) {
    if (!expression.value.trim() || expression.error) {
      continue;
    }

    ctx.beginPath();
    ctx.strokeStyle = expression.color;
    ctx.lineWidth = 2.2;
    let started = false;
    let previousY = null;

    for (let px = 0; px <= cssWidth; px += 1) {
      const x = xMin + ((px / cssWidth) * xRange);
      let y;
      try {
        y = evaluateScientificExpression(normalizeGraphExpression(expression.value), { x, angle: state.scientific.angle });
      } catch {
        expression.error = true;
        started = false;
        continue;
      }

      const py = toScreenY(y);
      if (!Number.isFinite(py) || py < -cssHeight * 3 || py > cssHeight * 4) {
        started = false;
        previousY = null;
        continue;
      }

      if (!started || (previousY != null && Math.abs(py - previousY) > cssHeight * 0.5)) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
      previousY = py;
    }

    ctx.stroke();
  }
}

function normalizeGraphExpression(expression) {
  return String(expression || '').replace(/,/g, '.').trim() || '0';
}

function drawAxisDecorations(ctx, width, height, xAxisY, yAxisX, toScreenX, toScreenY, xMin, xMax, yMin, yMax) {
  ctx.fillStyle = '#5b5b5b';
  ctx.strokeStyle = '#5b5b5b';
  ctx.font = 'italic 12px "Segoe UI", sans-serif';

  if (xAxisY >= 0 && xAxisY <= height) {
    ctx.beginPath();
    ctx.moveTo(width - 8, xAxisY - 5);
    ctx.lineTo(width, xAxisY);
    ctx.lineTo(width - 8, xAxisY + 5);
    ctx.stroke();
    ctx.fillText('x', width - 10, Math.min(height - 6, xAxisY + 16));
  }

  if (yAxisX >= 0 && yAxisX <= width) {
    ctx.beginPath();
    ctx.moveTo(yAxisX - 5, 8);
    ctx.lineTo(yAxisX, 0);
    ctx.lineTo(yAxisX + 5, 8);
    ctx.stroke();
    ctx.fillText('y', Math.max(6, yAxisX - 14), 12);
  }

  ctx.font = 'italic 11px "Segoe UI", sans-serif';
  for (let x = Math.ceil(xMin / 5) * 5; x <= xMax; x += 5) {
    if (x === 0) {
      continue;
    }
    const screenX = toScreenX(x);
    if (screenX < 18 || screenX > width - 18) {
      continue;
    }
    ctx.fillText(String(x), screenX - 7, Math.min(height - 8, xAxisY + 16));
  }

  for (let y = Math.ceil(yMin / 5) * 5; y <= yMax; y += 5) {
    if (y === 0) {
      continue;
    }
    const screenY = toScreenY(y);
    if (screenY < 14 || screenY > height - 10) {
      continue;
    }
    ctx.fillText(String(y), Math.max(4, yAxisX - 18), screenY + 4);
  }

  if (xAxisY >= 0 && xAxisY <= height && yAxisX >= 0 && yAxisX <= width) {
    ctx.fillText('0', yAxisX - 10, xAxisY + 15);
  }
}
