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
  if (action === 'clear-all') {
    state.scientific = createScientificState();
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
      state.scientific = createScientificState();
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
    case 'pow10': return 10 ** value;
    case 'abs': return Math.abs(value);
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
    case 'ln':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log(value);
    case 'log':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log10(value);
    case 'exp': return Math.exp(value);
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
    pow10: `10^(${formatted})`,
    abs: `abs(${formatted})`,
    sqrt: `√(${formatted})`,
    cbrt: `∛(${formatted})`,
    factorial: `fact(${formatted})`,
    sin: `sin(${formatted})`,
    cos: `cos(${formatted})`,
    tan: `tan(${formatted})`,
    ln: `ln(${formatted})`,
    log: `log(${formatted})`,
    exp: `exp(${formatted})`,
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
    while (peek() && peek().value === '^') {
      consume('^');
      const exponent = parseUnary();
      value = value ** exponent;
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
  const radians = angleToRadians(value, angle);
  switch (name) {
    case 'sin': return Math.sin(radians);
    case 'cos': return Math.cos(radians);
    case 'tan': return Math.tan(radians);
    case 'sqrt':
      if (value < 0) throw new Error('Invalid input');
      return Math.sqrt(value);
    case 'abs': return Math.abs(value);
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
  state.converter.fromValue = '1';
}

export function syncConverterValues(source) {
  const units = getUnitsForCategory(state.converter.category);
  const from = units.find((item) => item.name === state.converter.fromUnit) || units[0];
  const to = units.find((item) => item.name === state.converter.toUnit) || units[1] || units[0];
  const numeric = Number(state.converter.fromValue || 0);
  if (!Number.isFinite(numeric)) {
    state.converter.toValue = 'Invalid input';
    return;
  }
  const baseValue = from.toBase(numeric);
  state.converter.toValue = `${formatNumber(to.fromBase(baseValue))} ${to.symbol}`;
}

export function updateGraph() {
  try {
    evaluateScientificExpression(state.graphing.expression, { x: 1, angle: state.scientific.angle });
    state.graphing.status = `Plotting y = ${state.graphing.expression}`;
  } catch (error) {
    state.graphing.status = error.message || 'Invalid graph expression';
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
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#12151a';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += width / 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += height / 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.strokeStyle = '#4cc2ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  let hasGraphError = false;
  for (let px = 0; px <= width; px += 2) {
    const x = ((px / width) * 20) - 10;
    let y;
    try {
      y = evaluateScientificExpression(state.graphing.expression || '0', { x, angle: state.scientific.angle });
    } catch {
      hasGraphError = true;
      break;
    }
    const py = height / 2 - y * (height / 20);
    if (!Number.isFinite(py)) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  if (hasGraphError) {
    state.graphing.status = 'Invalid graph expression';
  }
}
