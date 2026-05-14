import { CURRENCY_DETAILS, CURRENCY_OPTIONS, DEFAULT_CURRENCY_RATES, UNIT_CATEGORIES, getModeMeta, getUnitLabel, isConverterMode } from './config.js';
import { getDefaultCurrencyUnits } from './currencyLocale.js';
import { getCurrentLocale, t } from './i18n.js';
import {
  createProgrammerState,
  createScientificState,
  createStandardState,
  getHistoryCollection,
  getMemoryCollection,
  persistCollections,
  replaceHistoryCollection,
  replaceMemoryCollection,
  state
} from './state.js';
import {
  solveGraphDerivativeWithCas,
  solveGraphExpressionWithCas
} from './graphAnalysisCas.js';
import { getGraphPaletteForSelection } from './themes.js';
import { formatExpressionText, formatNumber } from './utils.js';

function invalidInputMessage() {
  return t('errors.invalidInput');
}

function cannotDivideByZeroMessage() {
  return t('errors.cannotDivideByZero');
}

function cannotModuloByZeroMessage() {
  return t('errors.cannotModuloByZero');
}

function invalidProgrammerOperationMessage() {
  return t('errors.invalidProgrammerOperation');
}

function localizeRuntimeErrorMessage(message) {
  if (message === 'Invalid input') {
    return invalidInputMessage();
  }
  if (message === 'Cannot divide by zero') {
    return cannotDivideByZeroMessage();
  }
  if (message === 'Overflow') {
    return t('errors.overflow');
  }
  return message || invalidInputMessage();
}

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
    if (calc.justEvaluated && !calc.operator) {
      resetStandardReplay(calc);
    }
    clearStandardPendingPercent(calc);
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
    if (calc.justEvaluated && !calc.operator) {
      resetStandardReplay(calc);
    }
    clearStandardPendingPercent(calc);
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
  if (calc.operator && (!calc.waitingForOperand || calc.pendingPercentValue != null)) {
    const operand = getStandardOperand(calc);
    const result = computeStandardBinary(calc.accumulator ?? 0, operand, calc.operator);
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
  calc.lastOperand = null;
  calc.lastOperator = null;
  clearStandardPendingPercent(calc);
  calc.waitingForOperand = true;
  calc.justEvaluated = false;
}

function evaluateStandardEquals() {
  const calc = state.standard;
  if (!calc.operator || calc.accumulator == null) {
    if (!state.settings.repeatEquals || !calc.justEvaluated || !calc.lastOperator || calc.lastOperand == null) {
      return;
    }

    const left = parseDisplayNumber(calc.display);
    const result = computeStandardBinary(left, calc.lastOperand, calc.lastOperator);
    if (result == null) {
      return;
    }

    pushHistory(`${formatNumber(left)} ${operatorLabel(calc.lastOperator)} ${formatNumber(calc.lastOperand)}`, formatNumber(result), 'standard');
    calc.display = formatNumber(result);
    calc.expression = `${formatNumber(left)} ${operatorLabel(calc.lastOperator)} ${formatNumber(calc.lastOperand)}`;
    calc.accumulator = result;
    clearStandardPendingPercent(calc);
    calc.waitingForOperand = true;
    calc.justEvaluated = true;
    return;
  }

  const operand = getStandardOperand(calc);
  const rawPercentValue = calc.pendingPercentValue;
  const result = computeStandardBinary(calc.accumulator, operand, calc.operator);
  if (result == null) {
    return;
  }
  const expression = rawPercentValue != null
    ? `${formatNumber(calc.accumulator)} ${operatorLabel(calc.operator)} ${formatNumber(rawPercentValue)}%`
    : `${formatNumber(calc.accumulator)} ${operatorLabel(calc.operator)} ${formatNumber(operand)}`;
  pushHistory(expression, formatNumber(result), 'standard');
  calc.display = formatNumber(result);
  calc.expression = expression;
  calc.accumulator = result;
  calc.lastOperand = operand;
  calc.lastOperator = calc.operator;
  calc.operator = null;
  clearStandardPendingPercent(calc);
  calc.waitingForOperand = true;
  calc.justEvaluated = true;
}

function negateStandard() {
  const calc = state.standard;
  if (calc.display === '0') {
    return;
  }
  if (calc.justEvaluated && !calc.operator) {
    resetStandardReplay(calc);
  }
  clearStandardPendingPercent(calc);
  calc.display = calc.display.startsWith('-') ? calc.display.slice(1) : `-${calc.display}`;
}

function applyStandardPercent() {
  const calc = state.standard;
  if (calc.accumulator == null || !calc.operator) {
    return;
  }
  calc.pendingPercentValue = parseDisplayNumber(calc.display);
  calc.expression = `${formatNumber(calc.accumulator)} ${operatorLabel(calc.operator)} ${formatNumber(calc.pendingPercentValue)}%`;
  calc.waitingForOperand = true;
  calc.justEvaluated = false;
  calc.lastOperand = null;
  calc.lastOperator = null;
}

function applyStandardUnary(action) {
  const calc = state.standard;
  if (calc.justEvaluated && !calc.operator) {
    resetStandardReplay(calc);
  }
  clearStandardPendingPercent(calc);
  const current = parseDisplayNumber(calc.display);
  let result;
  let expression;
  if (action === 'reciprocal') {
    if (current === 0) {
      setStandardError(cannotDivideByZeroMessage());
      return;
    }
    result = 1 / current;
    expression = `1/(${formatNumber(current)})`;
  } else if (action === 'square') {
    result = current ** 2;
    expression = `sqr(${formatNumber(current)})`;
  } else if (action === 'sqrt') {
    if (current < 0) {
      setStandardError(invalidInputMessage());
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
  state.standard.lastOperand = null;
  state.standard.lastOperator = null;
  clearStandardPendingPercent(state.standard);
}

function setStandardError(message) {
  state.standard.display = message;
  state.standard.error = true;
  state.standard.operator = null;
  state.standard.accumulator = null;
  state.standard.lastOperand = null;
  state.standard.lastOperator = null;
  clearStandardPendingPercent(state.standard);
  state.standard.waitingForOperand = false;
}

function resetStandardReplay(calc) {
  calc.expression = '';
  calc.accumulator = null;
  calc.lastOperand = null;
  calc.lastOperator = null;
  calc.operator = null;
  clearStandardPendingPercent(calc);
}

function clearStandardPendingPercent(calc) {
  calc.pendingPercentValue = null;
}

function getStandardOperand(calc) {
  const value = calc.waitingForOperand
    ? (calc.pendingPercentValue ?? calc.lastOperand ?? parseDisplayNumber(calc.display))
    : parseDisplayNumber(calc.display);

  if (calc.pendingPercentValue == null) {
    return value;
  }

  if (calc.operator === '*' || calc.operator === '/') {
    return value / 100;
  }

  return ((calc.accumulator ?? 0) * value) / 100;
}

function computeStandardBinary(left, right, operator) {
  if (operator === '/' && right === 0) {
    setStandardError(cannotDivideByZeroMessage());
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
    clearScientificReplay(calc);
    calc.justEvaluated = false;
  }
  if (needsImplicitMultiplyBeforeScientificNumericToken(calc.expression)) {
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
  clearScientificReplay(calc);
  calc.justEvaluated = false;
}

function appendScientificDecimal() {
  const calc = state.scientific;
  if (calc.justEvaluated) {
    calc.expression = '';
    clearScientificReplay(calc);
    calc.justEvaluated = false;
  }
  const token = lastScientificToken(calc.expression);
  if (token.includes('.')) {
    return;
  }
  if (needsImplicitMultiplyBeforeScientificNumericToken(calc.expression)) {
    calc.expression += ' * ';
  }
  calc.expression += /\d$/.test(calc.expression) ? '.' : '0.';
  calc.display = scientificDisplayFromExpression(calc.expression);
}

function appendScientificOperator(operator) {
  const calc = state.scientific;
  calc.justEvaluated = false;
  clearScientificReplay(calc);
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
    clearScientificReplay(calc);
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
    clearScientificReplay(calc);
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
  clearScientificReplay(calc);
  const current = parseDisplayNumber(calc.display === '-' ? '0' : calc.display);
  let result;
  try {
    result = scientificUnary(action, current, calc.angle);
  } catch (error) {
    calc.display = localizeRuntimeErrorMessage(error.message);
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
    clearScientificReplay(calc);
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
  if (state.settings.repeatEquals && calc.justEvaluated && calc.lastOperator && calc.lastOperand != null) {
    const left = parseDisplayNumber(calc.display);

    try {
      const result = computeScientificBinary(left, calc.lastOperand, calc.lastOperator);
      const expression = `${formatScientificDisplay(left)} ${operatorLabel(calc.lastOperator)} ${formatScientificDisplay(calc.lastOperand)}`;
      calc.display = formatScientificDisplay(result);
      calc.expression = expression;
      calc.justEvaluated = true;
      pushHistory(expression, calc.display, 'scientific');
    } catch (error) {
      calc.display = localizeRuntimeErrorMessage(error.message);
      calc.error = true;
    }
    return;
  }

  const expression = calc.expression.trim() || calc.display;
  try {
    const result = evaluateScientificExpression(expression, { angle: calc.angle });
    calc.display = formatScientificDisplay(result);
    calc.expression = expression;
    applyScientificReplayState(calc, expression);
    calc.justEvaluated = true;
    pushHistory(expression, calc.display, 'scientific');
  } catch (error) {
    calc.display = localizeRuntimeErrorMessage(error.message);
    calc.error = true;
  }
}

function clearScientificReplay(calc) {
  calc.lastOperand = null;
  calc.lastOperator = null;
}

function applyScientificReplayState(calc, expression) {
  const replay = extractScientificReplayOperation(expression, calc.angle);
  if (!replay) {
    clearScientificReplay(calc);
    return;
  }

  calc.lastOperator = replay.operator;
  calc.lastOperand = replay.operand;
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
      clearEntryProgrammer();
      break;
    case 'equals':
      evaluateProgrammerEquals();
      break;
    default:
      break;
  }
}

function clearEntryProgrammer() {
  const calc = state.programmer;
  calc.display = '0';
  calc.error = false;
  calc.waitingForOperand = false;
  calc.justEvaluated = false;
  clearProgrammerReplay(calc);
  if (!calc.operator) {
    calc.expression = '';
  }
}

function inputProgrammerDigit(digit) {
  const calc = state.programmer;
  if (!isProgrammerDigitAllowed(digit, calc.base)) {
    return;
  }
  if (calc.waitingForOperand || calc.justEvaluated) {
    if (calc.justEvaluated && !calc.operator) {
      clearProgrammerReplay(calc);
    }
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
  clearProgrammerReplay(calc);
  calc.waitingForOperand = true;
  calc.justEvaluated = false;
}

function applyProgrammerUnary(action) {
  if (action !== 'not') {
    return;
  }
  const calc = state.programmer;
  clearProgrammerReplay(calc);
  const value = getProgrammerCurrentValue();
  const result = normalizeProgrammerValue(~value);
  calc.display = formatBigInt(result, calc.base);
  calc.expression = `NOT ${formatBigInt(value, calc.base)}`;
  calc.justEvaluated = true;
  pushHistory(calc.expression, calc.display, 'programmer');
}

function negateProgrammer() {
  const calc = state.programmer;
  if (calc.justEvaluated && !calc.operator) {
    clearProgrammerReplay(calc);
  }
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
    if (!state.settings.repeatEquals || !calc.justEvaluated || !calc.lastOperator || calc.lastOperand == null) {
      return;
    }

    const left = getProgrammerCurrentValue();
    const result = computeProgrammerBinary(left, calc.lastOperand, calc.lastOperator);
    if (result == null) {
      return;
    }

    const expression = `${formatBigInt(left, calc.base)} ${operatorLabel(calc.lastOperator)} ${formatBigInt(calc.lastOperand, calc.base)} =`;
    pushHistory(expression, formatBigInt(result, calc.base), 'programmer');
    calc.display = formatBigInt(normalizeProgrammerValue(result), calc.base);
    calc.expression = expression;
    calc.accumulator = normalizeProgrammerValue(result);
    calc.waitingForOperand = true;
    calc.justEvaluated = true;
    return;
  }
  const right = getProgrammerCurrentValue();
  const result = computeProgrammerBinary(calc.accumulator, right, calc.operator);
  if (result == null) {
    return;
  }
  const expression = `${formatBigInt(calc.accumulator, calc.base)} ${operatorLabel(calc.operator)} ${formatBigInt(right, calc.base)} =`;
  pushHistory(expression, formatBigInt(result, calc.base), 'programmer');
  calc.display = formatBigInt(normalizeProgrammerValue(result), calc.base);
  calc.expression = expression;
  calc.accumulator = normalizeProgrammerValue(result);
  calc.lastOperand = right;
  calc.lastOperator = calc.operator;
  calc.operator = null;
  calc.waitingForOperand = true;
  calc.justEvaluated = true;
}

function clearProgrammerReplay(calc) {
  calc.lastOperand = null;
  calc.lastOperator = null;
}

function computeProgrammerBinary(left, right, operator) {
  try {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/':
        if (right === 0n) {
          setProgrammerError(cannotDivideByZeroMessage());
          return null;
        }
        return left / right;
      case 'mod':
        if (right === 0n) {
          setProgrammerError(cannotModuloByZeroMessage());
          return null;
        }
        return left % right;
      case 'and': return left & right;
      case 'or': return left | right;
      case 'xor': return left ^ right;
      case 'lsh': return left << right;
      case 'rsh': return left >> right;
      default: return right;
    }
  } catch {
    setProgrammerError(invalidProgrammerOperationMessage());
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
  clearProgrammerReplay(state.programmer);
}

export function handleMemoryOperation(operation) {
  const current = getCurrentDisplayNumericValue();
  const memory = [...getMemoryCollection()];
  if (current == null) {
    return;
  }
  if (operation === 'mc') {
    replaceMemoryCollection([]);
  } else if (operation === 'mr') {
    recallMemory(0);
    return;
  } else if (operation === 'ms') {
    memory.unshift({ value: formatStoredMemoryValue(current) });
  } else if (operation === 'm+' || operation === 'm-') {
    if (state.mode === 'programmer') {
      const existing = parseBigIntFlexible(memory[0]?.value || '0');
      const next = operation === 'm+' ? existing + current : existing - current;
      memory[0] = { value: formatStoredMemoryValue(next) };
    } else {
      const existing = Number(memory[0]?.value || 0);
      const next = operation === 'm+' ? existing + Number(current) : existing - Number(current);
      memory[0] = { value: formatNumber(next) };
    }
  }
  replaceMemoryCollection(memory);
  persistCollections();
}

export function recallMemory(index) {
  const item = getMemoryCollection()[index];
  if (!item) {
    return;
  }
  if (state.mode === 'programmer') {
    const value = parseBigIntFlexible(item.value);
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

export function updateMemoryItem(index, operation) {
  const current = getCurrentDisplayNumericValue();
  const memory = [...getMemoryCollection()];
  const item = memory[index];

  if (!item) {
    return;
  }

  if (operation === 'clear') {
    memory.splice(index, 1);
    replaceMemoryCollection(memory);
    persistCollections();
    return;
  }

  if (current == null) {
    return;
  }

  if (state.mode === 'programmer') {
    const existing = parseBigIntFlexible(item.value || '0');
    const next = operation === 'add' ? existing + current : existing - current;
    memory[index] = { value: formatStoredMemoryValue(next) };
  } else {
    const existing = Number(item.value || 0);
    const next = operation === 'add' ? existing + Number(current) : existing - Number(current);
    memory[index] = { value: formatNumber(next) };
  }

  replaceMemoryCollection(memory);
  persistCollections();
}

export function recallHistory(index) {
  const entry = getHistoryCollection()[index];
  if (!entry) {
    return;
  }
  if (isConverterMode(state.mode)) {
    if (!entry.converterState) {
      return;
    }

    state.converter = {
      ...state.converter,
      ...entry.converterState,
      openConverterMenu: null,
      converterKeyboardField: entry.converterState.lastEdited || 'from'
    };
    syncConverterValues(entry.converterState.lastEdited || 'from');
  } else if (state.mode === 'date') {
    if (!entry.dateState) {
      return;
    }

    state.date = {
      ...state.date,
      ...entry.dateState,
      openModeMenu: false,
      openPicker: null,
      pickerMonth: getDateHistoryAnchorMonth(entry.dateState)
    };
    computeDateResults();
  } else if (state.mode === 'programmer') {
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

export function commitDateHistory() {
  const { expression, result } = getDateHistoryEntry();
  if (!result) {
    return;
  }

  pushHistory(expression, result, 'date', {
    dateState: {
      mode: state.date.mode,
      from: state.date.from,
      to: state.date.to,
      baseDate: state.date.baseDate,
      operation: state.date.operation,
      years: state.date.years,
      months: state.date.months,
      days: state.date.days
    }
  });
}

export function commitConverterHistory() {
  if (!isConverterMode(state.mode)) {
    return;
  }

  const entry = getConverterHistoryEntry();
  if (!entry) {
    return;
  }

  pushHistory(entry.expression, entry.result, state.mode, {
    converterState: {
      category: state.converter.category,
      fromUnit: state.converter.fromUnit,
      toUnit: state.converter.toUnit,
      fromValue: state.converter.fromValue,
      toValue: state.converter.toValue,
      lastEdited: state.converter.lastEdited
    }
  });
}

function pushHistory(expression, result, mode, extra = {}) {
  const history = getHistoryCollection(mode);
  const nextEntry = {
    expression,
    result,
    mode,
    modeLabel: getModeMeta(mode)?.label ?? mode,
    ...extra
  };

  if (history[0]?.expression === nextEntry.expression && history[0]?.result === nextEntry.result) {
    return;
  }

  replaceHistoryCollection([
    nextEntry,
    ...history
  ], mode);
  persistCollections();
}

function getCurrentDisplayNumericValue() {
  if (state.mode === 'programmer') {
    return getProgrammerCurrentValue();
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

export function supportsHistoryPanelMode(mode) {
  return ['standard', 'scientific', 'programmer', 'date'].includes(mode) || isConverterMode(mode);
}

export function supportsMemoryPanelMode(mode) {
  return ['standard', 'scientific', 'programmer'].includes(mode);
}

export function isSidePanelVisible() {
  return supportsHistoryPanelMode(state.mode) && (shouldAutoShowSidePanel() || state.historyOpen);
}

function shouldAutoShowSidePanel() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return width >= 980 || (width >= 900 && height <= 560);
}

function getConverterHistoryEntry() {
  const { fromValue, toValue, fromUnit, toUnit, category } = state.converter;
  if (!fromUnit || !toUnit) {
    return null;
  }

  const normalizedFromValue = String(fromValue ?? '').trim();
  const normalizedToValue = String(toValue ?? '').trim();
  if (!normalizedFromValue || !normalizedToValue || normalizedFromValue === invalidInputMessage() || normalizedToValue === invalidInputMessage()) {
    return null;
  }

  const fromLabel = getConverterHistoryUnitLabel(category, fromUnit);
  const toLabel = getConverterHistoryUnitLabel(category, toUnit);

  return {
    expression: `${formatConverterHistoryValue(normalizedFromValue)} ${fromLabel}`,
    result: `${formatConverterHistoryValue(normalizedToValue)} ${toLabel}`
  };
}

function getConverterHistoryUnitLabel(category, unitName) {
  if (category === 'Currency') {
    return CURRENCY_DETAILS[unitName]?.code ?? unitName;
  }

  return getUnitLabel(unitName);
}

function formatConverterHistoryValue(value) {
  const numeric = Number(String(value).replace(/,/g, '.'));
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return formatNumber(numeric).replace(/\./g, ',');
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

function needsImplicitMultiplyBeforeScientificNumericToken(expression) {
  const trimmed = expression.trim();
  return !!trimmed && /(?:\)|pi|e)$/.test(trimmed);
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

function isScientificReplayBinaryOperator(token, previousToken) {
  if (!token) {
    return false;
  }

  if (token.value === 'mod') {
    return true;
  }

  if (!['+', '-', '*', '/', '^'].includes(token.value)) {
    return false;
  }

  if (!previousToken) {
    return false;
  }

  return !['(', '+', '-', '*', '/', '^', 'mod'].includes(previousToken.value);
}

function tokensToScientificExpression(tokens) {
  return tokens.map((token) => token.value).join(' ');
}

function extractScientificReplayOperation(expression, angle) {
  const tokens = tokenize(expression);
  let depth = 0;
  let operatorIndex = -1;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.value === '(') {
      depth += 1;
      continue;
    }
    if (token.value === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && isScientificReplayBinaryOperator(token, tokens[index - 1])) {
      operatorIndex = index;
    }
  }

  if (operatorIndex <= 0 || operatorIndex >= tokens.length - 1) {
    return null;
  }

  const operandExpression = tokensToScientificExpression(tokens.slice(operatorIndex + 1));
  if (!operandExpression) {
    return null;
  }

  return {
    operator: tokens[operatorIndex].value,
    operand: evaluateScientificExpression(operandExpression, { angle })
  };
}

function computeScientificBinary(left, right, operator) {
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/':
      if (right === 0) {
        throw new Error('Cannot divide by zero');
      }
      return left / right;
    case '^': return left ** right;
    case 'mod':
      if (right === 0) {
        throw new Error('Cannot divide by zero');
      }
      return left % right;
    default: return right;
  }
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
  return withImplicitMultiplication(tokens);
}

const SCIENTIFIC_INFIX_IDENTIFIERS = new Set(['mod', 'root', 'logbase']);
const SCIENTIFIC_FUNCTION_IDENTIFIERS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'asin', 'acos', 'atan', 'asec', 'acsc', 'acot',
  'sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth',
  'asinh', 'acosh', 'atanh', 'asech', 'acsch', 'acoth',
  'dms', 'degrees', 'rand',
  'sqrt', 'abs', 'floor', 'ceil', 'log', 'ln', 'exp'
]);

function withImplicitMultiplication(tokens) {
  if (tokens.length < 2) {
    return tokens;
  }

  const expanded = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];
    expanded.push(current);

    if (!next || !shouldInsertImplicitMultiplication(current, next)) {
      continue;
    }

    expanded.push({ type: 'operator', value: '*' });
  }

  return expanded;
}

function shouldInsertImplicitMultiplication(left, right) {
  if (!tokenCanEndImplicitProduct(left) || !tokenCanStartImplicitProduct(right)) {
    return false;
  }

  return !(left.type === 'identifier'
    && SCIENTIFIC_FUNCTION_IDENTIFIERS.has(left.value)
    && right.value === '(');
}

function tokenCanEndImplicitProduct(token) {
  if (token.type === 'number' || token.value === ')') {
    return true;
  }

  return token.type === 'identifier'
    && !SCIENTIFIC_INFIX_IDENTIFIERS.has(token.value)
    && !SCIENTIFIC_FUNCTION_IDENTIFIERS.has(token.value);
}

function tokenCanStartImplicitProduct(token) {
  if (token.type === 'number' || token.value === '(') {
    return true;
  }

  return token.type === 'identifier' && !SCIENTIFIC_INFIX_IDENTIFIERS.has(token.value);
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
  const value = display.replace(/\s+/g, '').trim().toUpperCase();
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
  const trimmed = String(value).replace(/\s+/g, '').trim();
  if (/^-?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }
  return BigInt(Math.trunc(Number(trimmed)) || 0);
}

export function formatBigInt(value, base) {
  const sign = value < 0n ? '-' : '';
  const radix = { BIN: 2, OCT: 8, DEC: 10, HEX: 16 }[base];
  const raw = (value < 0n ? -value : value).toString(radix);
  const normalized = base === 'HEX' ? raw.toUpperCase() : raw;
  const groupSize = { BIN: 4, OCT: 3, DEC: 3, HEX: 4 }[base] ?? 3;
  const grouped = normalized.replace(new RegExp(`\\B(?=(?:.{${groupSize}})+(?!.))`, 'g'), ' ');
  return `${sign}${grouped}`;
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
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    const totalDays = Math.round((end - start) / 86400000);
    const years = getDateDifferenceYears(start, end);
    const afterYears = addDateDuration(start, { years });
    const months = getDateDifferenceMonths(afterYears, end);
    const afterMonths = addDateDuration(afterYears, { months });
    const remainingDays = Math.round((end - afterMonths) / 86400000);
    const weeks = Math.floor(remainingDays / 7);
    const days = remainingDays % 7;
    const parts = [];
    if (years > 0) {
      parts.push(formatDateUnit(years, 'year'));
    }
    if (months > 0) {
      parts.push(formatDateUnit(months, 'month'));
    }
    if (weeks > 0) {
      parts.push(formatDateUnit(weeks, 'week'));
    }
    if (days > 0) {
      parts.push(formatDateUnit(days, 'day'));
    }
    state.date.result = {
      totalDays,
      summary: totalDays === 0 ? t('date.results.sameDates') : (parts.length ? parts.join(', ') : formatDateUnit(totalDays, 'day')),
      detail: totalDays === 0 || (years === 0 && months === 0 && weeks === 0) ? '' : formatDateUnit(totalDays, 'day')
    };
  } else {
    const base = getDateParts(state.date.baseDate);
    const offset = {
      years: Number(state.date.years || 0),
      months: Number(state.date.months || 0),
      days: Number(state.date.days || 0)
    };
    const result = state.date.operation === 'add'
      ? addDateDuration(base, offset)
      : subtractDateDuration(base, offset);
    state.date.result = {
      summary: formatLongDate(result)
    };
  }
}

function getDateDifferenceYears(start, end) {
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  while (years > 0 && addDateDuration(start, { years }) > end) {
    years -= 1;
  }
  return years;
}

function getDateDifferenceMonths(start, end) {
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  while (months > 0 && addDateDuration(start, { months }) > end) {
    months -= 1;
  }
  return months;
}

function addDateDuration(baseDate, { years = 0, months = 0, days = 0 }) {
  const result = new Date(baseDate);
  if (years) {
    result.setUTCFullYear(result.getUTCFullYear() + years);
  }
  if (months) {
    result.setUTCMonth(result.getUTCMonth() + months);
  }
  if (days) {
    result.setUTCDate(result.getUTCDate() + days);
  }
  return result;
}

function subtractDateDuration(baseDate, { years = 0, months = 0, days = 0 }) {
  const result = new Date(baseDate);
  if (days) {
    result.setUTCDate(result.getUTCDate() - days);
  }
  if (months) {
    result.setUTCMonth(result.getUTCMonth() - months);
  }
  if (years) {
    result.setUTCFullYear(result.getUTCFullYear() - years);
  }
  return result;
}

function formatDateUnit(value, unit) {
  const pluralKey = value === 1 ? 'one' : 'other';
  return t(`date.duration.${unit}.${pluralKey}`, { count: value });
}

function getDateHistoryEntry() {
  if (state.date.mode === 'difference') {
    return {
      expression: t('date.history.differenceBetween', {
        from: formatHistoryDate(state.date.from),
        to: formatHistoryDate(state.date.to)
      }),
      result: state.date.result?.detail
        ? `${state.date.result.summary} (${state.date.result.detail})`
        : (state.date.result?.summary ?? '')
    };
  }

  const offsets = [
    formatDateDurationPart(state.date.years, 'year'),
    formatDateDurationPart(state.date.months, 'month'),
    formatDateDurationPart(state.date.days, 'day')
  ].filter(Boolean);

  return {
    expression: t(
      state.date.operation === 'subtract' ? 'date.history.subtractFrom' : 'date.history.addTo',
      {
        duration: offsets.length ? offsets.join(', ') : formatDateUnit(0, 'day'),
        date: formatHistoryDate(state.date.baseDate)
      }
    ),
    result: state.date.result?.summary ?? ''
  };
}

function formatHistoryDate(value) {
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateDurationPart(value, unit) {
  const numericValue = Number(value || 0);
  if (!numericValue) {
    return '';
  }

  return formatDateUnit(numericValue, unit);
}

function getDateHistoryAnchorMonth(dateState) {
  const anchor = dateState.mode === 'difference' ? dateState.from : dateState.baseDate;
  return anchor?.slice(0, 7) ?? state.date.pickerMonth;
}

function formatLongDate(value) {
  const formatter = new Intl.DateTimeFormat(getCurrentLocale(), {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
  const parts = formatter.formatToParts(value);
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const remainder = parts
    .filter((part) => part.type !== 'weekday' && part.type !== 'literal')
    .map((part) => part.value)
    .join(' ')
    .trim();
  return remainder ? `${weekday}, ${remainder}` : formatter.format(value);
}

export function getUnitsForCategory(category) {
  if (category === 'Currency') {
    return CURRENCY_OPTIONS.map((currency) => {
      const unitsPerUsd = getCurrencyRate(currency.name);
      return {
        name: currency.name,
        symbol: currency.code,
        toBase: (value) => value / unitsPerUsd,
        fromBase: (value) => value * unitsPerUsd
      };
    });
  }

  return UNIT_CATEGORIES[category] || UNIT_CATEGORIES.Length;
}

function getCurrencyRate(name) {
  const activeRate = Number(state.converter.currencyRates?.[name]);
  if (Number.isFinite(activeRate) && activeRate > 0) {
    return activeRate;
  }

  const fallbackRate = Number(DEFAULT_CURRENCY_RATES[name]);
  return Number.isFinite(fallbackRate) && fallbackRate > 0 ? fallbackRate : 1;
}

export function resetConverterUnits() {
  const units = getUnitsForCategory(state.converter.category);
  if (state.converter.category === 'Currency') {
    const unitNames = new Set(units.map((unit) => unit.name));
    const { fromUnit, toUnit } = getDefaultCurrencyUnits();
    const fallbackFromUnit = units[0]?.name || '';
    const fallbackToUnit = units[Math.min(1, units.length - 1)]?.name || fallbackFromUnit;

    state.converter.fromUnit = unitNames.has(fromUnit) ? fromUnit : fallbackFromUnit;
    state.converter.toUnit = unitNames.has(toUnit) ? toUnit : fallbackToUnit;
  } else {
    state.converter.fromUnit = units[0].name;
    state.converter.toUnit = units[Math.min(1, units.length - 1)].name;
  }

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
      state.converter.toValue = invalidInputMessage();
    } else {
      state.converter.fromValue = invalidInputMessage();
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
  const current = currentRaw === invalidInputMessage() ? '0' : normalizeConverterValue(currentRaw, allowNegative);

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
  if (raw === invalidInputMessage()) {
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

function createGraphExpression(index) {
  const colors = ['#107c10', '#0063b1', '#e81123', '#8a8886'];
  return {
    color: colors[index % colors.length],
    value: '',
    plottedValue: '',
    error: false,
    visible: true,
    lineStyle: 'solid'
  };
}

function ensureTrailingGraphExpression() {
  if (!state.graphing.expressions.length) {
    state.graphing.expressions.push(createGraphExpression(0));
    state.graphing.activeExpressionIndex = 0;
    return;
  }

  const lastExpression = state.graphing.expressions[state.graphing.expressions.length - 1];
  if (lastExpression.plottedValue.trim()) {
    state.graphing.expressions.push(createGraphExpression(state.graphing.expressions.length));
  }
}

export function commitGraphExpression(index) {
  const expression = state.graphing.expressions[index];
  if (!expression) {
    return;
  }

  expression.plottedValue = expression.value;
  expression.error = false;

  if (expression.plottedValue.trim()) {
    ensureTrailingGraphExpression();
  }
}

export function setGraphExpression(index, value) {
  const expression = state.graphing.expressions[index];
  if (!expression) {
    return;
  }
  expression.value = value;
  expression.error = false;
  if (state.graphing.analysisExpressionIndex === index) {
    state.graphing.analysisData = null;
  }
  state.graphing.activeExpressionIndex = index;
}

function getActiveGraphExpressionSelection(expression) {
  const start = Number.isInteger(state.graphing.activeExpressionSelectionStart)
    ? state.graphing.activeExpressionSelectionStart
    : expression.value.length;
  const end = Number.isInteger(state.graphing.activeExpressionSelectionEnd)
    ? state.graphing.activeExpressionSelectionEnd
    : start;
  const boundedStart = Math.max(0, Math.min(start, expression.value.length));
  const boundedEnd = Math.max(boundedStart, Math.min(end, expression.value.length));
  return { start: boundedStart, end: boundedEnd };
}

export function insertGraphToken(token) {
  const expression = state.graphing.expressions[state.graphing.activeExpressionIndex] || state.graphing.expressions[0];
  if (!expression) {
    return;
  }
  const { start, end } = getActiveGraphExpressionSelection(expression);
  expression.value = `${expression.value.slice(0, start)}${token}${expression.value.slice(end)}`;
  const nextCursor = start + token.length;
  state.graphing.activeExpressionSelectionStart = nextCursor;
  state.graphing.activeExpressionSelectionEnd = nextCursor;
  expression.error = false;
}

export function backspaceGraphExpression() {
  const expression = state.graphing.expressions[state.graphing.activeExpressionIndex] || state.graphing.expressions[0];
  if (!expression) {
    return;
  }
  const { start, end } = getActiveGraphExpressionSelection(expression);
  if (start !== end) {
    expression.value = `${expression.value.slice(0, start)}${expression.value.slice(end)}`;
    state.graphing.activeExpressionSelectionStart = start;
    state.graphing.activeExpressionSelectionEnd = start;
  } else if (start > 0) {
    const nextCursor = start - 1;
    expression.value = `${expression.value.slice(0, nextCursor)}${expression.value.slice(end)}`;
    state.graphing.activeExpressionSelectionStart = nextCursor;
    state.graphing.activeExpressionSelectionEnd = nextCursor;
  }
  expression.error = false;
}

export function clearGraphExpression() {
  const expression = state.graphing.expressions[state.graphing.activeExpressionIndex] || state.graphing.expressions[0];
  if (!expression) {
    return;
  }
  expression.value = '';
  state.graphing.activeExpressionSelectionStart = 0;
  state.graphing.activeExpressionSelectionEnd = 0;
  expression.error = false;
}

export function toggleGraphExpressionVisibility(index) {
  const expression = state.graphing.expressions[index];
  if (!expression || !expression.plottedValue.trim()) {
    return;
  }

  expression.visible = expression.visible === false ? true : false;
}

export function removeGraphExpression(index) {
  if (index < 0 || index >= state.graphing.expressions.length) {
    return;
  }

  const expression = state.graphing.expressions[index];
  const isTrailingEmptyRow = index === state.graphing.expressions.length - 1 && !expression.plottedValue.trim();
  if (isTrailingEmptyRow) {
    return;
  }

  state.graphing.expressions.splice(index, 1);
  ensureTrailingGraphExpression();

  if (state.graphing.stylePanelExpressionIndex === index) {
    state.graphing.stylePanelExpressionIndex = null;
  } else if (typeof state.graphing.stylePanelExpressionIndex === 'number' && state.graphing.stylePanelExpressionIndex > index) {
    state.graphing.stylePanelExpressionIndex -= 1;
  }

  if (state.graphing.analysisExpressionIndex === index) {
    state.graphing.analysisExpressionIndex = null;
    state.graphing.analysisData = null;
  } else if (typeof state.graphing.analysisExpressionIndex === 'number' && state.graphing.analysisExpressionIndex > index) {
    state.graphing.analysisExpressionIndex -= 1;
  }

  if (state.graphing.activeExpressionIndex >= state.graphing.expressions.length) {
    state.graphing.activeExpressionIndex = Math.max(0, state.graphing.expressions.length - 1);
  } else if (state.graphing.activeExpressionIndex > index) {
    state.graphing.activeExpressionIndex -= 1;
  }
}

export function setGraphExpressionColor(index, color) {
  const expression = state.graphing.expressions[index];
  if (!expression || !color) {
    return;
  }

  expression.color = color;
}

export function setGraphExpressionLineStyle(index, lineStyle) {
  const expression = state.graphing.expressions[index];
  if (!expression) {
    return;
  }

  expression.lineStyle = ['solid', 'dash', 'dot'].includes(lineStyle) ? lineStyle : 'solid';
}

export function openGraphExpressionAnalysis(index) {
  const expression = state.graphing.expressions[index];
  if (!expression) {
    return;
  }

  if (expression.value !== expression.plottedValue) {
    commitGraphExpression(index);
  }

  if (!expression.plottedValue.trim()) {
    return;
  }

  state.graphing.analysisExpressionIndex = index;
  state.graphing.analysisData = buildGraphAnalysisPayload(expression.plottedValue, state.graphing.angle);
  state.graphing.activeExpressionIndex = index;
  state.graphing.mobileView = 'editor';
  state.graphing.stylePanelExpressionIndex = null;
  state.graphing.settingsOpen = false;
  state.graphing.openMenu = null;
}

export function closeGraphExpressionAnalysis() {
  state.graphing.analysisExpressionIndex = null;
  state.graphing.analysisData = null;
}

export function setGraphMobileView(view) {
  if (view === 'graph' || view === 'editor') {
    state.graphing.mobileView = view;
  }
}

export function resetGraphViewport() {
  state.graphing.viewport.xMin = -10;
  state.graphing.viewport.xMax = 10;
  state.graphing.viewport.yMin = -10;
  state.graphing.viewport.yMax = 10;
  state.graphing.isManualAdjustment = false;
}

export function zoomGraph(action, anchor = null) {
  const viewport = state.graphing.viewport;
  if (action === 'reset') {
    resetGraphViewport();
    return;
  }

  state.graphing.isManualAdjustment = true;

  const factor = action === 'in' ? 0.8 : 1.25;
  const width = viewport.xMax - viewport.xMin;
  const height = viewport.yMax - viewport.yMin;
  const nextWidth = width * factor;
  const nextHeight = height * factor;

  if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y) && width > 0 && height > 0) {
    const anchorRatioX = (anchor.x - viewport.xMin) / width;
    const anchorRatioY = (anchor.y - viewport.yMin) / height;

    viewport.xMin = anchor.x - (anchorRatioX * nextWidth);
    viewport.xMax = viewport.xMin + nextWidth;
    viewport.yMin = anchor.y - (anchorRatioY * nextHeight);
    viewport.yMax = viewport.yMin + nextHeight;
    return;
  }

  const centerX = (viewport.xMin + viewport.xMax) / 2;
  const centerY = (viewport.yMin + viewport.yMax) / 2;
  const halfWidth = nextWidth / 2;
  const halfHeight = nextHeight / 2;

  viewport.xMin = centerX - halfWidth;
  viewport.xMax = centerX + halfWidth;
  viewport.yMin = centerY - halfHeight;
  viewport.yMax = centerY + halfHeight;
}

export function panGraph(deltaX, deltaY) {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    return;
  }

  state.graphing.isManualAdjustment = true;
  state.graphing.viewport.xMin += deltaX;
  state.graphing.viewport.xMax += deltaX;
  state.graphing.viewport.yMin += deltaY;
  state.graphing.viewport.yMax += deltaY;
}

export function updateGraph() {
  const activeExpressions = state.graphing.expressions.filter((expression) => expression.plottedValue.trim());
  let hasError = false;

  for (const expression of state.graphing.expressions) {
    if (!expression.plottedValue.trim()) {
      expression.error = false;
      continue;
    }

    try {
      expression.error = !canEvaluateGraphExpression(normalizeGraphExpression(expression.plottedValue), state.graphing.angle);
      if (expression.error) {
        hasError = true;
      }
    } catch {
      expression.error = true;
      hasError = true;
    }
  }

  if (hasError) {
    state.graphing.status = t('graph.checkHighlightedExpression');
  } else if (activeExpressions.length) {
    state.graphing.status = t('graph.plottingExpressions', { count: activeExpressions.length });
  } else {
    state.graphing.status = t('graph.enterExpression');
  }

  drawGraph();
}

function canEvaluateGraphExpression(expression, angle) {
  const probeValues = [0, 1, -1, 2, -2, 0.5, -0.5, Math.PI, -Math.PI];

  for (const x of probeValues) {
    try {
      const value = evaluateScientificExpression(expression, { x, angle });
      if (Number.isFinite(value)) {
        return true;
      }
    } catch {
      // Continue probing until a finite sample succeeds.
    }
  }

  return false;
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
  const palette = getGraphPalette();

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  for (let x = Math.floor(xMin); x <= Math.ceil(xMax); x += 1) {
    const screenX = toScreenX(x);
    ctx.beginPath();
    ctx.strokeStyle = x % 5 === 0 ? palette.gridMajor : palette.gridMinor;
    ctx.lineWidth = x % 5 === 0 ? 1 : 0.8;
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, cssHeight);
    ctx.stroke();
  }

  for (let y = Math.floor(yMin); y <= Math.ceil(yMax); y += 1) {
    const screenY = toScreenY(y);
    ctx.beginPath();
    ctx.strokeStyle = y % 5 === 0 ? palette.gridMajor : palette.gridMinor;
    ctx.lineWidth = y % 5 === 0 ? 1 : 0.8;
    ctx.moveTo(0, screenY);
    ctx.lineTo(cssWidth, screenY);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.axis;
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

  drawAxisDecorations(ctx, cssWidth, cssHeight, xAxisY, yAxisX, toScreenX, toScreenY, xMin, xMax, yMin, yMax, palette.label);

  for (const expression of state.graphing.expressions) {
    if (!expression.plottedValue.trim() || expression.error || expression.visible === false) {
      continue;
    }

    ctx.beginPath();
    ctx.strokeStyle = expression.color;
    ctx.lineWidth = Number(state.graphing.lineThickness) || 2;
    ctx.setLineDash(getGraphLineDash(expression.lineStyle));
    let started = false;
    let previousY = null;

    for (let px = 0; px <= cssWidth; px += 1) {
      const x = xMin + ((px / cssWidth) * xRange);
      let y;
      try {
        y = evaluateScientificExpression(normalizeGraphExpression(expression.plottedValue), { x, angle: state.graphing.angle });
      } catch {
        started = false;
        previousY = null;
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
    ctx.setLineDash([]);
  }
}

function getGraphLineDash(lineStyle) {
  if (lineStyle === 'dash') {
    return [10, 6];
  }
  if (lineStyle === 'dot') {
    return [2, 6];
  }
  return [];
}

function normalizeGraphExpression(expression) {
  return String(expression || '').replace(/,/g, '.').trim() || '0';
}

const GRAPH_ANALYSIS_STRINGS = {
  get title() { return t('graph.analysis.title'); },
  get domain() { return t('graph.analysis.domain'); },
  get range() { return t('graph.analysis.range'); },
  get xIntercept() { return t('graph.analysis.xIntercept'); },
  get yIntercept() { return t('graph.analysis.yIntercept'); },
  get minima() { return t('graph.analysis.minima'); },
  get maxima() { return t('graph.analysis.maxima'); },
  get inflectionPoints() { return t('graph.analysis.inflectionPoints'); },
  get verticalAsymptotes() { return t('graph.analysis.verticalAsymptotes'); },
  get horizontalAsymptotes() { return t('graph.analysis.horizontalAsymptotes'); },
  get obliqueAsymptotes() { return t('graph.analysis.obliqueAsymptotes'); },
  get parity() { return t('graph.analysis.parity'); },
  get period() { return t('graph.analysis.period'); },
  get monotonicity() { return t('graph.analysis.monotonicity'); },
  get domainNone() { return t('graph.analysis.domainNone'); },
  get rangeNone() { return t('graph.analysis.rangeNone'); },
  get xInterceptNone() { return t('graph.analysis.xInterceptNone'); },
  get yInterceptNone() { return t('graph.analysis.yInterceptNone'); },
  get minimaNone() { return t('graph.analysis.minimaNone'); },
  get maximaNone() { return t('graph.analysis.maximaNone'); },
  get inflectionNone() { return t('graph.analysis.inflectionNone'); },
  get verticalAsymptotesNone() { return t('graph.analysis.verticalAsymptotesNone'); },
  get horizontalAsymptotesNone() { return t('graph.analysis.horizontalAsymptotesNone'); },
  get obliqueAsymptotesNone() { return t('graph.analysis.obliqueAsymptotesNone'); },
  get parityUnknown() { return t('graph.analysis.parityUnknown'); },
  get parityOdd() { return t('graph.analysis.parityOdd'); },
  get parityEven() { return t('graph.analysis.parityEven'); },
  get parityNeither() { return t('graph.analysis.parityNeither'); },
  get periodicityUnknown() { return t('graph.analysis.periodicityUnknown'); },
  get periodicityNotPeriodic() { return t('graph.analysis.periodicityNotPeriodic'); },
  get monotonicityConstant() { return t('graph.analysis.monotonicityConstant'); },
  get monotonicityIncreasing() { return t('graph.analysis.monotonicityIncreasing'); },
  get monotonicityDecreasing() { return t('graph.analysis.monotonicityDecreasing'); },
  get monotonicityUnknown() { return t('graph.analysis.monotonicityUnknown'); },
  get monotonicityError() { return t('graph.analysis.monotonicityError'); },
  get featureTooComplexPlural() { return t('graph.analysis.featureTooComplexPlural'); },
  get analysisCouldNotBePerformed() { return t('graph.analysis.analysisCouldNotBePerformed'); },
  get analysisNotSupported() { return t('graph.analysis.analysisNotSupported'); },
  get variableIsNotX() { return t('graph.analysis.variableIsNotX'); }
};

function buildGraphAnalysisPayload(expressionText, angle) {
  const normalizedExpression = normalizeGraphExpression(expressionText);

  if (!normalizedExpression || /[<>]=?|=/.test(normalizedExpression)) {
    return {
      expressionDisplay: formatExpressionText(expressionText),
      error: GRAPH_ANALYSIS_STRINGS.analysisNotSupported,
      items: []
    };
  }

  try {
    tokenize(normalizedExpression);
  } catch {
    return {
      expressionDisplay: formatExpressionText(expressionText),
      error: GRAPH_ANALYSIS_STRINGS.analysisCouldNotBePerformed,
      items: []
    };
  }

  const variableNames = getGraphAnalysisVariables(normalizedExpression);
  if (variableNames.some((name) => name !== 'x')) {
    return {
      expressionDisplay: formatExpressionText(expressionText),
      error: GRAPH_ANALYSIS_STRINGS.variableIsNotX,
      items: []
    };
  }

  if (!variableNames.length) {
    return buildConstantGraphAnalysis(normalizedExpression, angle);
  }

  const exactAnalysis = buildExactElementaryGraphAnalysis(normalizedExpression);
  if (exactAnalysis) {
    return exactAnalysis;
  }

  const exactTrigAnalysis = buildExactTransformedTrigonometricGraphAnalysis(normalizedExpression, angle)
    ?? buildExactBaseTrigonometricGraphAnalysis(normalizedExpression, angle);
  if (exactTrigAnalysis) {
    return exactTrigAnalysis;
  }

  return buildNumericGraphAnalysis(normalizedExpression, angle);
}

function getGraphAnalysisVariables(expression) {
  const tokens = tokenize(expression);
  const variables = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'identifier') {
      continue;
    }

    if (['pi', 'e'].includes(token.value)) {
      continue;
    }

    if (tokens[index + 1]?.value === '(') {
      continue;
    }

    variables.add(token.value);
  }

  return Array.from(variables);
}

function buildConstantGraphAnalysis(expression, angle) {
  let constantValue;

  try {
    constantValue = evaluateScientificExpression(expression, { x: 0, angle });
  } catch {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: GRAPH_ANALYSIS_STRINGS.analysisCouldNotBePerformed,
      items: []
    };
  }

  const displayExpression = formatExpressionText(expression);
  const xIntercept = Math.abs(constantValue) <= 1e-9 ? 'x ∈ ℝ' : '∅';

  return {
    expressionDisplay: displayExpression,
    error: null,
    items: [
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: ['x ∈ ℝ'] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: [`y ∈ {${displayExpression}}`] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [xIntercept] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: [`y = ${displayExpression}`] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.minima, values: [GRAPH_ANALYSIS_STRINGS.minimaNone] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [GRAPH_ANALYSIS_STRINGS.maximaNone] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [GRAPH_ANALYSIS_STRINGS.inflectionNone] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.verticalAsymptotesNone] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [`y = ${displayExpression}`] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [GRAPH_ANALYSIS_STRINGS.parityEven] },
      { kind: 'grid', title: GRAPH_ANALYSIS_STRINGS.monotonicity, rows: [{ expression: '(-∞, ∞)', direction: GRAPH_ANALYSIS_STRINGS.monotonicityConstant }] }
    ]
  };
}

function buildExactElementaryGraphAnalysis(expression) {
  if (expression === 'log(x)' || expression === 'ln(x)') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: ['x ∈ (0, ∞)'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: ['y ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: ['x = 1'] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: [GRAPH_ANALYSIS_STRINGS.yInterceptNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.minima, values: [GRAPH_ANALYSIS_STRINGS.minimaNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [GRAPH_ANALYSIS_STRINGS.maximaNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [GRAPH_ANALYSIS_STRINGS.inflectionNone] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: ['x = 0'] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [GRAPH_ANALYSIS_STRINGS.parityUnknown] },
        { kind: 'grid', title: GRAPH_ANALYSIS_STRINGS.monotonicity, rows: [{ expression: '(0, ∞)', direction: GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing }] }
      ]
    };
  }

  return null;
}

function buildExactTransformedTrigonometricGraphAnalysis(expression, angle) {
  const family = extractGraphExactTrigonometricFamily(expression);
  if (!family) {
    return null;
  }

  const units = getGraphTrigUnits(angle);
  const amplitude = Math.abs(family.amplitude);
  const yIntercept = evaluateGraphAnalysisValue(expression, 0, angle);
  const parity = detectExactGraphTrigParity(family, units);

  if (family.func === 'sin') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: ['x ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: [formatExactTrigBoundedRange(-amplitude, amplitude)] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [formatExactTrigSolvedFamily(units.halfFamily, family, angle)] },
        { kind: Number.isFinite(yIntercept) ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: Number.isFinite(yIntercept) ? [formatGraphEquality('y', yIntercept)] : [GRAPH_ANALYSIS_STRINGS.yInterceptNone] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.minima, values: [formatExactTrigPoint(family.amplitude > 0 ? units.threeQuarterValue : units.quarterValue, units.fullFamily, family, angle, -amplitude)] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [formatExactTrigPoint(family.amplitude > 0 ? units.quarterValue : units.threeQuarterValue, units.fullFamily, family, angle, amplitude)] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [formatExactTrigPoint(null, units.halfFamily, family, angle, 0)] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.verticalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [parity] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${formatExactTrigPeriod(units.fullValue, family, angle)}`] },
        { kind: 'grid', title: GRAPH_ANALYSIS_STRINGS.monotonicity, rows: buildExactSinMonotonicityRows(family, units, angle) }
      ]
    };
  }

  if (family.func === 'cos') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: ['x ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: [formatExactTrigBoundedRange(-amplitude, amplitude)] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [formatExactTrigSolvedFamily(units.quarterValue, units.halfFamily, family, angle)] },
        { kind: Number.isFinite(yIntercept) ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: Number.isFinite(yIntercept) ? [formatGraphEquality('y', yIntercept)] : [GRAPH_ANALYSIS_STRINGS.yInterceptNone] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.minima, values: [formatExactTrigPoint(family.amplitude > 0 ? units.halfValue : null, units.fullFamily, family, angle, -amplitude)] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [formatExactTrigPoint(family.amplitude > 0 ? null : units.halfValue, units.fullFamily, family, angle, amplitude)] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [formatExactTrigPoint(units.quarterValue, units.halfFamily, family, angle, 0)] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.verticalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [parity] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${formatExactTrigPeriod(units.fullValue, family, angle)}`] },
        { kind: 'grid', title: GRAPH_ANALYSIS_STRINGS.monotonicity, rows: buildExactCosMonotonicityRows(family, units, angle) }
      ]
    };
  }

  if (family.func === 'tan') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: [`x ≠ ${formatExactTrigSolvedFamily(units.quarterValue, units.halfFamily, family, angle)}`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: ['y ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [formatExactTrigSolvedFamily(units.halfFamily, family, angle)] },
        { kind: Number.isFinite(yIntercept) ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: Number.isFinite(yIntercept) ? [formatGraphEquality('y', yIntercept)] : [GRAPH_ANALYSIS_STRINGS.yInterceptNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.minima, values: [GRAPH_ANALYSIS_STRINGS.minimaNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [GRAPH_ANALYSIS_STRINGS.maximaNone] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [formatExactTrigPoint(null, units.halfFamily, family, angle, 0)] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [formatExactTrigSolvedFamily(units.quarterValue, units.halfFamily, family, angle)] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [parity] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${formatExactTrigPeriod(units.halfValue, family, angle)}`] },
        { kind: 'grid', title: GRAPH_ANALYSIS_STRINGS.monotonicity, rows: buildExactTanMonotonicityRows(family, units, angle) }
      ]
    };
  }

  if (family.func === 'cot') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: [`x ≠ ${formatExactTrigSolvedFamily(units.halfFamily, family, angle)}`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: ['y ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [formatExactTrigSolvedFamily(units.quarterValue, units.halfFamily, family, angle)] },
        { kind: Number.isFinite(yIntercept) ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: Number.isFinite(yIntercept) ? [formatGraphEquality('y', yIntercept)] : [GRAPH_ANALYSIS_STRINGS.yInterceptNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.minima, values: [GRAPH_ANALYSIS_STRINGS.minimaNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [GRAPH_ANALYSIS_STRINGS.maximaNone] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [formatExactTrigPoint(units.quarterValue, units.halfFamily, family, angle, 0)] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [formatExactTrigSolvedFamily(units.halfFamily, family, angle)] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [parity] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${formatExactTrigPeriod(units.halfValue, family, angle)}`] },
        { kind: 'grid', title: GRAPH_ANALYSIS_STRINGS.monotonicity, rows: buildExactCotMonotonicityRows(family, units, angle) }
      ]
    };
  }

  if (family.func === 'sec') {
    return buildExactTransformedReciprocalTrigonometricAnalysis(expression, family, units, angle, {
      domain: formatExactTrigSolvedFamily(units.quarterValue, units.halfFamily, family, angle),
      minima: formatExactTrigPoint(family.amplitude > 0 ? null : units.halfValue, units.fullFamily, family, angle, amplitude),
      maxima: formatExactTrigPoint(family.amplitude > 0 ? units.halfValue : null, units.fullFamily, family, angle, -amplitude),
      parity,
      period: formatExactTrigPeriod(units.fullValue, family, angle)
    });
  }

  if (family.func === 'csc') {
    return buildExactTransformedReciprocalTrigonometricAnalysis(expression, family, units, angle, {
      domain: formatExactTrigSolvedFamily(units.halfFamily, family, angle),
      minima: formatExactTrigPoint(family.amplitude > 0 ? units.quarterValue : units.threeQuarterValue, units.fullFamily, family, angle, amplitude),
      maxima: formatExactTrigPoint(family.amplitude > 0 ? units.threeQuarterValue : units.quarterValue, units.fullFamily, family, angle, -amplitude),
      parity,
      period: formatExactTrigPeriod(units.fullValue, family, angle)
    });
  }

  return null;
}

function buildExactTransformedReciprocalTrigonometricAnalysis(expression, family, units, angle, config) {
  const amplitude = Math.abs(family.amplitude);
  const yIntercept = evaluateGraphAnalysisValue(expression, 0, angle);

  return {
    expressionDisplay: formatExpressionText(expression),
    error: null,
    items: [
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: [`x ≠ ${config.domain}`] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: [`y ∈ (-∞, ${formatGraphAnalysisNumber(-amplitude)}] ∪ [${formatGraphAnalysisNumber(amplitude)}, ∞)`] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [GRAPH_ANALYSIS_STRINGS.xInterceptNone] },
      { kind: Number.isFinite(yIntercept) ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: Number.isFinite(yIntercept) ? [formatGraphEquality('y', yIntercept)] : [GRAPH_ANALYSIS_STRINGS.yInterceptNone] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.minima, values: [config.minima] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [config.maxima] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [GRAPH_ANALYSIS_STRINGS.featureTooComplexPlural] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [config.domain] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [config.parity] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${config.period}`] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.monotonicity, values: [GRAPH_ANALYSIS_STRINGS.featureTooComplexPlural] }
    ]
  };
}

function extractGraphExactTrigonometricFamily(expression) {
  let ast;

  try {
    ast = parseScientificExpressionAst(expression);
  } catch {
    return null;
  }

  const terms = [];
  collectScientificAstTerms(ast, 1, terms);
  let offset = 0;
  let nonConstantNode = null;

  for (const term of terms) {
    const constantValue = tryGetScientificAstConstant(term.node);
    if (Number.isFinite(constantValue)) {
      offset += term.sign * constantValue;
      continue;
    }

    if (nonConstantNode) {
      return null;
    }

    nonConstantNode = term.sign === 1
      ? term.node
      : { type: 'unary', operator: '-', argument: term.node };
  }

  if (!nonConstantNode || Math.abs(offset) > 1e-10) {
    return null;
  }

  const scaledTrig = extractScaledScientificTrigTerm(nonConstantNode);
  if (!scaledTrig || Math.abs(scaledTrig.amplitude) <= 1e-10 || Math.abs(scaledTrig.linear.slope) <= 1e-10) {
    return null;
  }

  return scaledTrig;
}

function collectScientificAstTerms(node, sign, terms) {
  if (!node) {
    return;
  }

  if (node.type === 'binary' && node.operator === '+') {
    collectScientificAstTerms(node.left, sign, terms);
    collectScientificAstTerms(node.right, sign, terms);
    return;
  }

  if (node.type === 'binary' && node.operator === '-') {
    collectScientificAstTerms(node.left, sign, terms);
    collectScientificAstTerms(node.right, -sign, terms);
    return;
  }

  if (node.type === 'unary' && node.operator === '-') {
    collectScientificAstTerms(node.argument, -sign, terms);
    return;
  }

  terms.push({ node, sign });
}

function extractScaledScientificTrigTerm(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'call' && ['sin', 'cos', 'tan', 'cot', 'sec', 'csc'].includes(node.name)) {
    const linear = extractScientificLinearTerm(node.argument);
    if (!linear || Math.abs(linear.slope) <= 1e-10) {
      return null;
    }

    return {
      func: node.name,
      amplitude: 1,
      linear
    };
  }

  if (node.type === 'unary' && (node.operator === '+' || node.operator === '-')) {
    const inner = extractScaledScientificTrigTerm(node.argument);
    if (!inner) {
      return null;
    }

    return {
      ...inner,
      amplitude: node.operator === '-' ? -inner.amplitude : inner.amplitude
    };
  }

  if (node.type === 'binary' && node.operator === '*') {
    const leftConstant = tryGetScientificAstConstant(node.left);
    const rightConstant = tryGetScientificAstConstant(node.right);

    if (Number.isFinite(leftConstant)) {
      const inner = extractScaledScientificTrigTerm(node.right);
      if (!inner) {
        return null;
      }

      return {
        ...inner,
        amplitude: inner.amplitude * leftConstant
      };
    }

    if (Number.isFinite(rightConstant)) {
      const inner = extractScaledScientificTrigTerm(node.left);
      if (!inner) {
        return null;
      }

      return {
        ...inner,
        amplitude: inner.amplitude * rightConstant
      };
    }
  }

  if (node.type === 'binary' && node.operator === '/') {
    const denominator = tryGetScientificAstConstant(node.right);
    if (Number.isFinite(denominator) && Math.abs(denominator) > 1e-10) {
      const inner = extractScaledScientificTrigTerm(node.left);
      if (!inner) {
        return null;
      }

      return {
        ...inner,
        amplitude: inner.amplitude / denominator
      };
    }
  }

  return null;
}

function extractScientificLinearTerm(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'variable') {
    return { slope: 1, intercept: 0 };
  }

  const constantValue = tryGetScientificAstConstant(node);
  if (Number.isFinite(constantValue)) {
    return { slope: 0, intercept: constantValue };
  }

  if (node.type === 'unary' && (node.operator === '+' || node.operator === '-')) {
    const inner = extractScientificLinearTerm(node.argument);
    if (!inner) {
      return null;
    }

    return node.operator === '-'
      ? { slope: -inner.slope, intercept: -inner.intercept }
      : inner;
  }

  if (node.type === 'binary' && (node.operator === '+' || node.operator === '-')) {
    const left = extractScientificLinearTerm(node.left);
    const right = extractScientificLinearTerm(node.right);
    if (!left || !right) {
      return null;
    }

    return node.operator === '+'
      ? { slope: left.slope + right.slope, intercept: left.intercept + right.intercept }
      : { slope: left.slope - right.slope, intercept: left.intercept - right.intercept };
  }

  if (node.type === 'binary' && node.operator === '*') {
    const leftConstant = tryGetScientificAstConstant(node.left);
    const rightConstant = tryGetScientificAstConstant(node.right);

    if (Number.isFinite(leftConstant)) {
      const right = extractScientificLinearTerm(node.right);
      return right ? { slope: leftConstant * right.slope, intercept: leftConstant * right.intercept } : null;
    }

    if (Number.isFinite(rightConstant)) {
      const left = extractScientificLinearTerm(node.left);
      return left ? { slope: rightConstant * left.slope, intercept: rightConstant * left.intercept } : null;
    }
  }

  if (node.type === 'binary' && node.operator === '/') {
    const denominator = tryGetScientificAstConstant(node.right);
    if (Number.isFinite(denominator) && Math.abs(denominator) > 1e-10) {
      const numerator = extractScientificLinearTerm(node.left);
      return numerator ? { slope: numerator.slope / denominator, intercept: numerator.intercept / denominator } : null;
    }
  }

  return null;
}

function tryGetScientificAstConstant(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'number') {
    return node.value;
  }

  if (node.type === 'constant') {
    return node.name === 'pi' ? Math.PI : node.name === 'e' ? Math.E : null;
  }

  if (node.type === 'unary' && (node.operator === '+' || node.operator === '-')) {
    const value = tryGetScientificAstConstant(node.argument);
    return Number.isFinite(value) ? (node.operator === '-' ? -value : value) : null;
  }

  if (node.type === 'binary') {
    const left = tryGetScientificAstConstant(node.left);
    const right = tryGetScientificAstConstant(node.right);
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return null;
    }

    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return Math.abs(right) <= 1e-10 ? null : left / right;
    if (node.operator === '^') return left ** right;
  }

  if (node.type === 'call') {
    const argument = tryGetScientificAstConstant(node.argument);
    if (!Number.isFinite(argument)) {
      return null;
    }

    try {
      const value = scientificFunction(node.name, argument, 'RAD');
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  return null;
}

function parseScientificExpressionAst(expression) {
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
    let node = parseTerm();
    while (peek() && ['+', '-'].includes(peek().value)) {
      const operator = consume().value;
      node = { type: 'binary', operator, left: node, right: parseTerm() };
    }
    return node;
  }

  function parseTerm() {
    let node = parsePower();
    while (peek() && ['*', '/', 'mod'].includes(peek().value)) {
      const operator = consume().value;
      node = { type: 'binary', operator, left: node, right: parsePower() };
    }
    return node;
  }

  function parsePower() {
    let node = parseUnary();
    while (peek() && ['^', 'root', 'logbase'].includes(peek().value)) {
      const operator = consume().value;
      node = { type: 'binary', operator, left: node, right: parseUnary() };
    }
    return node;
  }

  function parseUnary() {
    if (peek()?.value === '+' || peek()?.value === '-') {
      const operator = consume().value;
      return { type: 'unary', operator, argument: parseUnary() };
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
      return { type: 'number', value: Number(token.value) };
    }

    if (token.type === 'identifier') {
      consume();
      if (token.value === 'pi' || token.value === 'e') {
        return { type: 'constant', name: token.value };
      }
      if (token.value === 'x') {
        return { type: 'variable', name: 'x' };
      }
      if (peek()?.value === '(') {
        consume('(');
        const argument = parseExpression();
        consume(')');
        return { type: 'call', name: token.value, argument };
      }
      throw new Error('Invalid input');
    }

    if (token.value === '(') {
      consume('(');
      const node = parseExpression();
      consume(')');
      return node;
    }

    throw new Error('Invalid input');
  }

  const ast = parseExpression();
  if (index < tokens.length) {
    throw new Error('Invalid input');
  }

  return ast;
}

function detectExactGraphTrigParity(family, units) {
  const halfTurns = family.linear.intercept / units.halfValue;
  const isHalfTurnShift = Number.isFinite(halfTurns) && Math.abs(halfTurns - Math.round(halfTurns)) <= 1e-8;
  if (!isHalfTurnShift) {
    return GRAPH_ANALYSIS_STRINGS.parityUnknown;
  }

  if (['sin', 'tan', 'cot', 'csc'].includes(family.func)) {
    return GRAPH_ANALYSIS_STRINGS.parityOdd;
  }

  if (['cos', 'sec'].includes(family.func)) {
    return GRAPH_ANALYSIS_STRINGS.parityEven;
  }

  return GRAPH_ANALYSIS_STRINGS.parityUnknown;
}

function buildExactSinMonotonicityRows(family, units, angle) {
  const rows = [
    createExactTrigIntervalRow(-units.quarterValue, units.quarterValue, units.fullFamily, family, angle, GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing),
    createExactTrigIntervalRow(units.quarterValue, units.threeQuarterValue, units.fullFamily, family, angle, GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing)
  ];

  return family.amplitude * family.linear.slope > 0 ? rows : rows.map((row) => ({ ...row, direction: row.direction === GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing ? GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing : GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing }));
}

function buildExactCosMonotonicityRows(family, units, angle) {
  const rows = [
    createExactTrigIntervalRow(0, units.halfValue, units.fullFamily, family, angle, GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing),
    createExactTrigIntervalRow(units.halfValue, units.fullValue, units.fullFamily, family, angle, GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing)
  ];

  return family.amplitude * family.linear.slope > 0 ? rows : rows.map((row) => ({ ...row, direction: row.direction === GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing ? GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing : GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing }));
}

function buildExactTanMonotonicityRows(family, units, angle) {
  return [createExactTrigIntervalRow(-units.quarterValue, units.quarterValue, units.halfFamily, family, angle, family.amplitude * family.linear.slope > 0 ? GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing : GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing)];
}

function buildExactCotMonotonicityRows(family, units, angle) {
  return [createExactTrigIntervalRow(0, units.halfValue, units.halfFamily, family, angle, family.amplitude * family.linear.slope > 0 ? GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing : GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing)];
}

function createExactTrigIntervalRow(startValue, endValue, repeatFamily, family, angle, direction) {
  const start = solveExactTrigTarget(startValue, formatExactTrigRepeatedTarget(startValue, repeatFamily, family.angleUnits ?? getGraphTrigUnits(angle)), family, angle);
  const end = solveExactTrigTarget(endValue, formatExactTrigRepeatedTarget(endValue, repeatFamily, family.angleUnits ?? getGraphTrigUnits(angle)), family, angle);
  return {
    expression: start.numeric <= end.numeric
      ? formatGraphInterval(start.display, end.display, '(', ')', true)
      : formatGraphInterval(end.display, start.display, '(', ')', true),
    direction
  };
}

function solveExactTrigTarget(targetValue, targetDisplay, family, angle) {
  const numeric = (targetValue - family.linear.intercept) / family.linear.slope;
  return {
    numeric,
    display: formatExactTrigSolvedDisplay(targetDisplay, family, angle)
  };
}

function formatExactTrigPoint(offsetValue, repeatFamily, family, angle, yValue) {
  const xDisplay = offsetValue == null
    ? formatExactTrigSolvedFamily(repeatFamily, family, angle)
    : formatExactTrigSolvedFamily(offsetValue, repeatFamily, family, angle);
  return `(${xDisplay}, ${formatGraphAnalysisNumber(yValue)})`;
}

function formatExactTrigSolvedFamily(offsetOrFamily, maybeFamilyOrConfig, maybeAngleOrFamily, maybeAngle) {
  if (typeof offsetOrFamily === 'string') {
    return formatExactTrigSolvedDisplay(offsetOrFamily, maybeFamilyOrConfig, maybeAngleOrFamily);
  }

  return formatExactTrigSolvedDisplay(formatGraphPeriodicOffset(formatGraphAngleValue(offsetOrFamily, maybeAngle), maybeFamilyOrConfig), maybeAngleOrFamily, maybeAngle);
}

function formatExactTrigSolvedDisplay(targetDisplay, family, angle) {
  const slope = family.linear.slope;
  const phase = family.linear.intercept;
  const absoluteSlope = Math.abs(slope);
  let numerator = slope > 0
    ? formatExactTrigDifference(targetDisplay, phase, angle)
    : formatExactTrigDifference(formatGraphAngleValue(phase, angle), targetDisplay, angle, true);

  if (Math.abs(absoluteSlope - 1) <= 1e-10) {
    return numerator;
  }

  return `(${numerator})/${formatGraphAnalysisNumber(absoluteSlope)}`;
}

function formatExactTrigDifference(leftDisplay, rightValueOrDisplay, angle, rightIsDisplay = false) {
  if (rightIsDisplay) {
    if (!rightValueOrDisplay || rightValueOrDisplay === '0') {
      return leftDisplay;
    }
    return `${leftDisplay} − ${rightValueOrDisplay}`;
  }

  const rightValue = rightValueOrDisplay;
  if (!Number.isFinite(rightValue) || Math.abs(rightValue) <= 1e-10) {
    return leftDisplay;
  }

  const rightDisplay = formatGraphAngleValue(Math.abs(rightValue), angle);
  return `${leftDisplay} ${rightValue >= 0 ? '−' : '+'} ${rightDisplay}`;
}

function formatExactTrigRepeatedTarget(offsetValue, familyDisplay, units) {
  if (Math.abs(offsetValue) <= 1e-10) {
    return familyDisplay;
  }

  return formatGraphPeriodicOffset(formatGraphAngleValue(offsetValue, units.mode), familyDisplay);
}

function formatExactTrigBoundedRange(minValue, maxValue) {
  return `y ∈ [${formatGraphAnalysisNumber(minValue)}, ${formatGraphAnalysisNumber(maxValue)}]`;
}

function formatExactTrigPeriod(basePeriod, family, angle) {
  return formatGraphAngleValue(basePeriod / Math.abs(family.linear.slope), angle);
}

function buildExactBaseTrigonometricGraphAnalysis(expression, angle) {
  const units = getGraphTrigUnits(angle);

  if (expression === 'sin(x)') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: ['x ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: ['y ∈ [-1, 1]'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [`x = ${units.halfFamily}`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: ['y = 0'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.minima, values: [`(${formatGraphPeriodicOffset(units.threeQuarter, units.fullFamily)}, -1)`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [`(${formatGraphPeriodicOffset(units.quarter, units.fullFamily)}, 1)`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [`(${units.halfFamily}, 0)`] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.verticalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [GRAPH_ANALYSIS_STRINGS.parityOdd] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${units.full}`] },
        {
          kind: 'grid',
          title: GRAPH_ANALYSIS_STRINGS.monotonicity,
          rows: [
            { expression: `(${formatGraphPeriodicOffset(units.negativeQuarter, units.fullFamily)}, ${formatGraphPeriodicOffset(units.quarter, units.fullFamily)})`, direction: GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing },
            { expression: `(${formatGraphPeriodicOffset(units.quarter, units.fullFamily)}, ${formatGraphPeriodicOffset(units.threeQuarter, units.fullFamily)})`, direction: GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing }
          ]
        }
      ]
    };
  }

  if (expression === 'cos(x)') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: ['x ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: ['y ∈ [-1, 1]'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [`x = ${formatGraphPeriodicOffset(units.quarter, units.halfFamily)}`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: ['y = 1'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.minima, values: [`(${formatGraphPeriodicOffset(units.half, units.fullFamily)}, -1)`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [`(${units.fullFamily}, 1)`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [`(${formatGraphPeriodicOffset(units.quarter, units.halfFamily)}, 0)`] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.verticalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [GRAPH_ANALYSIS_STRINGS.parityEven] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${units.full}`] },
        {
          kind: 'grid',
          title: GRAPH_ANALYSIS_STRINGS.monotonicity,
          rows: [
            { expression: `(${units.fullFamily}, ${formatGraphPeriodicOffset(units.half, units.fullFamily)})`, direction: GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing },
            { expression: `(${formatGraphPeriodicOffset(units.half, units.fullFamily)}, ${formatGraphPeriodicOffset(units.full, units.fullFamily)})`, direction: GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing }
          ]
        }
      ]
    };
  }

  if (expression === 'tan(x)') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: [`x ≠ ${formatGraphPeriodicOffset(units.quarter, units.halfFamily)}`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: ['y ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [`x = ${units.halfFamily}`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: ['y = 0'] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.minima, values: [GRAPH_ANALYSIS_STRINGS.minimaNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [GRAPH_ANALYSIS_STRINGS.maximaNone] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [`(${units.halfFamily}, 0)`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [`x = ${formatGraphPeriodicOffset(units.quarter, units.halfFamily)}`] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [GRAPH_ANALYSIS_STRINGS.parityOdd] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${units.half}`] },
        {
          kind: 'grid',
          title: GRAPH_ANALYSIS_STRINGS.monotonicity,
          rows: [
            { expression: `(${formatGraphPeriodicOffset(units.negativeQuarter, units.halfFamily)}, ${formatGraphPeriodicOffset(units.quarter, units.halfFamily)})`, direction: GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing }
          ]
        }
      ]
    };
  }

  if (expression === 'cot(x)') {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: null,
      items: [
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: [`x ≠ ${units.halfFamily}`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: ['y ∈ ℝ'] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [`x = ${formatGraphPeriodicOffset(units.quarter, units.halfFamily)}`] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: [GRAPH_ANALYSIS_STRINGS.yInterceptNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.minima, values: [GRAPH_ANALYSIS_STRINGS.minimaNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [GRAPH_ANALYSIS_STRINGS.maximaNone] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [`(${formatGraphPeriodicOffset(units.quarter, units.halfFamily)}, 0)`] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [`x = ${units.halfFamily}`] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
        { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [GRAPH_ANALYSIS_STRINGS.parityOdd] },
        { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${units.half}`] },
        {
          kind: 'grid',
          title: GRAPH_ANALYSIS_STRINGS.monotonicity,
          rows: [
            { expression: `(${units.halfFamily}, ${formatGraphPeriodicOffset(units.half, units.halfFamily)})`, direction: GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing }
          ]
        }
      ]
    };
  }

  if (expression === 'sec(x)') {
    return buildExactReciprocalTrigonometricAnalysis(expression, units, {
      domain: `x ≠ ${formatGraphPeriodicOffset(units.quarter, units.halfFamily)}`,
      range: 'y ∈ (-∞, -1] ∪ [1, ∞)',
      yIntercept: 'y = 1',
      minima: `(${units.fullFamily}, 1)`,
      maxima: `(${formatGraphPeriodicOffset(units.half, units.fullFamily)}, -1)`,
      verticalAsymptotes: `x = ${formatGraphPeriodicOffset(units.quarter, units.halfFamily)}`,
      parity: GRAPH_ANALYSIS_STRINGS.parityEven,
      period: units.full
    });
  }

  if (expression === 'csc(x)') {
    return buildExactReciprocalTrigonometricAnalysis(expression, units, {
      domain: `x ≠ ${units.halfFamily}`,
      range: 'y ∈ (-∞, -1] ∪ [1, ∞)',
      yIntercept: GRAPH_ANALYSIS_STRINGS.yInterceptNone,
      minima: `(${formatGraphPeriodicOffset(units.quarter, units.fullFamily)}, 1)`,
      maxima: `(${formatGraphPeriodicOffset(units.threeQuarter, units.fullFamily)}, -1)`,
      verticalAsymptotes: `x = ${units.halfFamily}`,
      parity: GRAPH_ANALYSIS_STRINGS.parityOdd,
      period: units.full
    });
  }

  return null;
}

function buildExactReciprocalTrigonometricAnalysis(expression, units, config) {
  return {
    expressionDisplay: formatExpressionText(expression),
    error: null,
    items: [
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: [config.domain] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: [config.range] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: [GRAPH_ANALYSIS_STRINGS.xInterceptNone] },
      { kind: config.yIntercept === GRAPH_ANALYSIS_STRINGS.yInterceptNone ? 'text' : 'math', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: [config.yIntercept] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.minima, values: [config.minima] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.maxima, values: [config.maxima] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: [GRAPH_ANALYSIS_STRINGS.featureTooComplexPlural] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: [config.verticalAsymptotes] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [config.parity] },
      { kind: 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [`T = ${config.period}`] },
      { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.monotonicity, values: [GRAPH_ANALYSIS_STRINGS.featureTooComplexPlural] }
    ]
  };
}

function getGraphTrigUnits(angle) {
  if (angle === 'DEG') {
    return {
      mode: angle,
      full: '360',
      fullValue: 360,
      half: '180',
      halfValue: 180,
      quarter: '90',
      quarterValue: 90,
      threeQuarter: '270',
      threeQuarterValue: 270,
      negativeQuarter: '-90',
      negativeQuarterValue: -90,
      fullFamily: '360n',
      halfFamily: '180n'
    };
  }

  if (angle === 'GRAD') {
    return {
      mode: angle,
      full: '400',
      fullValue: 400,
      half: '200',
      halfValue: 200,
      quarter: '100',
      quarterValue: 100,
      threeQuarter: '300',
      threeQuarterValue: 300,
      negativeQuarter: '-100',
      negativeQuarterValue: -100,
      fullFamily: '400n',
      halfFamily: '200n'
    };
  }

  return {
    mode: angle,
    full: '2π',
    fullValue: 2 * Math.PI,
    half: 'π',
    halfValue: Math.PI,
    quarter: 'π/2',
    quarterValue: Math.PI / 2,
    threeQuarter: '3π/2',
    threeQuarterValue: (3 * Math.PI) / 2,
    negativeQuarter: '-π/2',
    negativeQuarterValue: -Math.PI / 2,
    fullFamily: '2nπ',
    halfFamily: 'nπ'
  };
}

function formatGraphAngleValue(value, angle) {
  const normalized = Math.abs(value) <= 1e-10 ? 0 : value;
  if (angle === 'RAD') {
    const piFraction = approximateGraphPiFraction(normalized);
    if (piFraction) {
      return formatGraphPiFraction(piFraction.numerator, piFraction.denominator);
    }
  }

  return formatGraphAnalysisNumber(normalized);
}

function approximateGraphPiFraction(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const ratio = value / Math.PI;
  const denominators = [1, 2, 3, 4, 6, 8, 12, 16];
  for (const denominator of denominators) {
    const numerator = Math.round(ratio * denominator);
    if (Math.abs(ratio - numerator / denominator) > 1e-8) {
      continue;
    }

    const divisor = greatestCommonDivisor(Math.abs(numerator), denominator);
    return {
      numerator: numerator / divisor,
      denominator: denominator / divisor
    };
  }

  return null;
}

function formatGraphPiFraction(numerator, denominator) {
  if (numerator === 0) {
    return '0';
  }

  const sign = numerator < 0 ? '-' : '';
  const absoluteNumerator = Math.abs(numerator);
  if (denominator === 1) {
    return `${sign}${absoluteNumerator === 1 ? 'π' : `${absoluteNumerator}π`}`;
  }

  return `${sign}${absoluteNumerator === 1 ? 'π' : `${absoluteNumerator}π`}/${denominator}`;
}

function greatestCommonDivisor(left, right) {
  let a = Math.trunc(left);
  let b = Math.trunc(right);

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return Math.abs(a) || 1;
}

function formatGraphPeriodicOffset(offset, family) {
  return offset ? `${offset} + ${family}` : family;
}

function buildNumericGraphAnalysis(expression, angle) {
  const samples = sampleGraphFunction(expression, angle, -48, 48, 0.2);
  const finiteSamples = samples.filter((sample) => Number.isFinite(sample.y));

  if (finiteSamples.length < 8) {
    return {
      expressionDisplay: formatExpressionText(expression),
      error: GRAPH_ANALYSIS_STRINGS.analysisNotSupported,
      items: []
    };
  }

  const symbolicRoots = detectGraphSymbolicRoots(expression, angle);
  const roots = symbolicRoots.length ? symbolicRoots : detectGraphRoots(expression, angle, samples);
  const symbolicExtrema = detectGraphSymbolicExtrema(expression, angle);
  const minima = symbolicExtrema.minima.length ? symbolicExtrema.minima : detectGraphExtrema(samples, 'min');
  const maxima = symbolicExtrema.maxima.length ? symbolicExtrema.maxima : detectGraphExtrema(samples, 'max');
  const symbolicInflectionPoints = detectGraphSymbolicInflectionPoints(expression, angle);
  const inflectionPoints = symbolicInflectionPoints.length ? symbolicInflectionPoints : detectGraphInflectionPoints(samples);
  const verticalAsymptotes = detectGraphVerticalAsymptotes(expression, angle, samples);
  const domainIntervals = detectGraphDomainIntervals(samples);
  addGraphBoundaryAsymptotes(expression, angle, samples, domainIntervals, verticalAsymptotes);
  addGraphEndpointExtrema(samples, domainIntervals, verticalAsymptotes, minima, maxima);
  const horizontalAsymptotes = detectGraphHorizontalAsymptotes(expression, angle);
  const obliqueAsymptotes = detectGraphObliqueAsymptotes(expression, angle, horizontalAsymptotes.length > 0);
  const parity = detectGraphParity(expression, angle);
  const periodicity = detectGraphPeriodicity(expression, angle);
  const monotonicityRows = detectGraphMonotonicity(samples, minima, maxima, domainIntervals, verticalAsymptotes);
  const yIntercept = evaluateGraphAnalysisValue(expression, 0, angle);

  const rangeValues = [
    ...finiteSamples.map((sample) => sample.y),
    ...minima.map((point) => point.y),
    ...maxima.map((point) => point.y),
    ...inflectionPoints.map((point) => point.y).filter(Number.isFinite),
    Number.isFinite(yIntercept) ? yIntercept : null
  ].filter(Number.isFinite);
  const minRange = Math.min(...rangeValues);
  const maxRange = Math.max(...rangeValues);
  const { unboundedLow, unboundedHigh } = estimateGraphRangeBounds(expression, angle, finiteSamples, minRange, maxRange, verticalAsymptotes);

  const rangeLabel = shouldSplitGraphRangeAroundZero(verticalAsymptotes, horizontalAsymptotes, roots, finiteSamples)
    ? formatGraphSplitZeroRange(finiteSamples, minima, maxima, yIntercept)
    : formatGraphRange(minRange, maxRange, unboundedLow, unboundedHigh);
  const domainLabel = domainIntervals.length ? formatGraphDomain(domainIntervals, samples, verticalAsymptotes) : GRAPH_ANALYSIS_STRINGS.domainNone;

  const items = [
    { kind: domainLabel === GRAPH_ANALYSIS_STRINGS.domainNone ? 'text' : 'math', title: GRAPH_ANALYSIS_STRINGS.domain, values: [domainLabel] },
    { kind: rangeLabel === GRAPH_ANALYSIS_STRINGS.rangeNone ? 'text' : 'math', title: GRAPH_ANALYSIS_STRINGS.range, values: [rangeLabel] },
    { kind: roots.length ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.xIntercept, values: roots.length ? roots.map((root) => formatGraphEquality('x', root)) : [GRAPH_ANALYSIS_STRINGS.xInterceptNone] },
    { kind: Number.isFinite(yIntercept) ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.yIntercept, values: Number.isFinite(yIntercept) ? [formatGraphEquality('y', yIntercept)] : [GRAPH_ANALYSIS_STRINGS.yInterceptNone] },
    { kind: minima.length ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.minima, values: minima.length ? minima.map((point) => formatGraphPoint(point.x, point.y)) : [GRAPH_ANALYSIS_STRINGS.minimaNone] },
    { kind: maxima.length ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.maxima, values: maxima.length ? maxima.map((point) => formatGraphPoint(point.x, point.y)) : [GRAPH_ANALYSIS_STRINGS.maximaNone] },
    { kind: inflectionPoints.length ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.inflectionPoints, values: inflectionPoints.length ? inflectionPoints.map((point) => formatGraphPoint(point.x, point.y)) : [GRAPH_ANALYSIS_STRINGS.inflectionNone] },
    { kind: verticalAsymptotes.length ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.verticalAsymptotes, values: verticalAsymptotes.length ? verticalAsymptotes.map((value) => formatGraphEquality('x', value)) : [GRAPH_ANALYSIS_STRINGS.verticalAsymptotesNone] },
    { kind: horizontalAsymptotes.length ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.horizontalAsymptotes, values: horizontalAsymptotes.length ? horizontalAsymptotes : [GRAPH_ANALYSIS_STRINGS.horizontalAsymptotesNone] },
    { kind: obliqueAsymptotes.length ? 'math' : 'text', title: GRAPH_ANALYSIS_STRINGS.obliqueAsymptotes, values: obliqueAsymptotes.length ? obliqueAsymptotes : [GRAPH_ANALYSIS_STRINGS.obliqueAsymptotesNone] },
    { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.parity, values: [parity] }
  ];

  if (periodicity) {
    items.push({ kind: periodicity === GRAPH_ANALYSIS_STRINGS.periodicityNotPeriodic ? 'text' : 'math', title: GRAPH_ANALYSIS_STRINGS.period, values: [periodicity] });
  }

  items.push(
    monotonicityRows.length
      ? { kind: 'grid', title: GRAPH_ANALYSIS_STRINGS.monotonicity, rows: monotonicityRows }
      : { kind: 'text', title: GRAPH_ANALYSIS_STRINGS.monotonicity, values: [GRAPH_ANALYSIS_STRINGS.monotonicityError] }
  );

  return {
    expressionDisplay: formatExpressionText(expression),
    error: null,
    items
  };
}

function detectGraphSymbolicRoots(expression, angle) {
  return solveGraphExpressionWithCas(expression)
    .filter((value) => {
      const y = evaluateGraphAnalysisValue(expression, value, angle);
      return Number.isFinite(y) && Math.abs(y) <= 1e-6;
    })
    .sort((left, right) => left - right);
}

function detectGraphSymbolicExtrema(expression, angle) {
  const criticalPoints = solveGraphDerivativeWithCas(expression, 1);
  const minima = [];
  const maxima = [];

  for (const x of criticalPoints) {
    const point = createGraphAnalysisPoint(expression, angle, x);
    if (!point) {
      continue;
    }

    const classification = classifyGraphCriticalPoint(expression, angle, x);
    if (classification === 'min') {
      pushUniqueApproximatePoint(minima, point, 1e-5);
    }
    if (classification === 'max') {
      pushUniqueApproximatePoint(maxima, point, 1e-5);
    }
  }

  minima.sort((left, right) => left.x - right.x);
  maxima.sort((left, right) => left.x - right.x);

  return { minima, maxima };
}

function detectGraphSymbolicInflectionPoints(expression, angle) {
  const candidates = solveGraphDerivativeWithCas(expression, 2);
  const points = [];

  for (const x of candidates) {
    if (!isGraphInflectionPoint(expression, angle, x)) {
      continue;
    }

    const point = createGraphAnalysisPoint(expression, angle, x);
    if (point) {
      pushUniqueApproximatePoint(points, point, 1e-5);
    }
  }

  points.sort((left, right) => left.x - right.x);

  return points;
}

function createGraphAnalysisPoint(expression, angle, x) {
  const y = evaluateGraphAnalysisValue(expression, x, angle);
  if (!Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function classifyGraphCriticalPoint(expression, angle, x) {
  const delta = Math.max(1e-4, Math.min(1e-2, (Math.abs(x) * 1e-4) + 1e-4));
  const left = evaluateGraphAnalysisValue(expression, x - delta, angle);
  const middle = evaluateGraphAnalysisValue(expression, x, angle);
  const right = evaluateGraphAnalysisValue(expression, x + delta, angle);

  if (![left, middle, right].every(Number.isFinite)) {
    return null;
  }

  const leftSlope = middle - left;
  const rightSlope = right - middle;

  if (leftSlope < -1e-8 && rightSlope > 1e-8) {
    return 'min';
  }

  if (leftSlope > 1e-8 && rightSlope < -1e-8) {
    return 'max';
  }

  return null;
}

function isGraphInflectionPoint(expression, angle, x) {
  const delta = Math.max(5e-4, Math.min(2e-2, (Math.abs(x) * 2e-4) + 5e-4));
  const left = approximateGraphSecondDerivative(expression, angle, x - delta, delta / 2);
  const right = approximateGraphSecondDerivative(expression, angle, x + delta, delta / 2);

  return Number.isFinite(left)
    && Number.isFinite(right)
    && Math.sign(left) !== Math.sign(right)
    && Math.abs(left) > 1e-12
    && Math.abs(right) > 1e-12;
}

function approximateGraphSecondDerivative(expression, angle, x, delta) {
  const previous = evaluateGraphAnalysisValue(expression, x - delta, angle);
  const current = evaluateGraphAnalysisValue(expression, x, angle);
  const next = evaluateGraphAnalysisValue(expression, x + delta, angle);

  if (![previous, current, next].every(Number.isFinite)) {
    return null;
  }

  return previous - (2 * current) + next;
}

function sampleGraphFunction(expression, angle, start, end, step) {
  const samples = [];
  const sampleCount = Math.round((end - start) / step);
  for (let index = 0; index <= sampleCount; index += 1) {
    const x = Number((start + (index * step)).toFixed(12));
    samples.push({ x, y: evaluateGraphAnalysisValue(expression, x, angle) });
  }
  return samples;
}

function evaluateGraphAnalysisValue(expression, x, angle) {
  try {
    const value = evaluateScientificExpression(expression, { x, angle });
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function detectGraphDomainIntervals(samples) {
  const intervals = [];
  let startIndex = null;

  for (let index = 0; index < samples.length; index += 1) {
    const isValid = Number.isFinite(samples[index].y);
    if (isValid && startIndex == null) {
      startIndex = index;
    }

    const nextIsValid = index + 1 < samples.length ? Number.isFinite(samples[index + 1].y) : false;
    if (startIndex != null && (!isValid || !nextIsValid || index === samples.length - 1)) {
      const endIndex = isValid ? index : index - 1;
      if (endIndex >= startIndex) {
        intervals.push({ startIndex, endIndex });
      }
      startIndex = null;
    }
  }

  return intervals;
}

function formatGraphDomain(intervals, samples, asymptotes = []) {
  if (!intervals.length) {
    return GRAPH_ANALYSIS_STRINGS.domainNone;
  }

  if (intervals.length === 1 && intervals[0].startIndex === 0 && intervals[0].endIndex === samples.length - 1) {
    return 'x ∈ ℝ';
  }

  const lastIndex = samples.length - 1;
  const ranges = intervals.map((interval) => {
    const boundary = resolveGraphDomainIntervalBoundary(interval, samples, asymptotes);
    const start = interval.startIndex === 0 ? '-∞' : boundary.start.value;
    const end = interval.endIndex === lastIndex ? '∞' : boundary.end.value;
    const startBrace = interval.startIndex === 0 ? '(' : boundary.start.brace;
    const endBrace = interval.endIndex === lastIndex ? ')' : boundary.end.brace;
    return `${startBrace}${start}, ${end}${endBrace}`;
  });

  return `x ∈ ${ranges.join(' ∪ ')}`;
}

function resolveGraphDomainIntervalBoundary(interval, samples, asymptotes) {
  const step = samples.length > 1 ? Math.abs(samples[1].x - samples[0].x) : 0.2;
  const startSample = samples[interval.startIndex];
  const endSample = samples[interval.endIndex];
  const previousSample = samples[interval.startIndex - 1] ?? null;
  const nextSample = samples[interval.endIndex + 1] ?? null;
  const startAsymptote = previousSample && !Number.isFinite(previousSample.y)
    ? findNearestAsymptote((previousSample.x + startSample.x) / 2, asymptotes, step)
    : null;
  const endAsymptote = nextSample && !Number.isFinite(nextSample.y)
    ? findNearestAsymptote((endSample.x + nextSample.x) / 2, asymptotes, step)
    : null;

  return {
    start: startAsymptote != null
      ? { value: formatGraphAnalysisNumber(startAsymptote), number: startAsymptote, brace: '(', inclusive: false }
      : {
          value: formatGraphAnalysisNumber(startSample.x),
          number: startSample.x,
          brace: previousSample && !Number.isFinite(previousSample.y) ? '[' : '(',
          inclusive: true
        },
    end: endAsymptote != null
      ? { value: formatGraphAnalysisNumber(endAsymptote), number: endAsymptote, brace: ')', inclusive: false }
      : {
          value: formatGraphAnalysisNumber(endSample.x),
          number: endSample.x,
          brace: nextSample && !Number.isFinite(nextSample.y) ? ']' : ')',
          inclusive: true
        }
  };
}

function findNearestAsymptote(target, asymptotes, tolerance) {
  return asymptotes.find((value) => Math.abs(value - target) <= tolerance + 1e-8) ?? null;
}

function formatGraphRange(minValue, maxValue, unboundedLow, unboundedHigh) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return GRAPH_ANALYSIS_STRINGS.rangeNone;
  }

  if (unboundedLow && unboundedHigh) {
    return 'y ∈ ℝ';
  }

  const lower = unboundedLow ? '-∞' : formatGraphAnalysisNumber(minValue);
  const upper = unboundedHigh ? '∞' : formatGraphAnalysisNumber(maxValue);
  const startBrace = unboundedLow ? '(' : '[';
  const endBrace = unboundedHigh ? ')' : ']';
  return `y ∈ ${startBrace}${lower}, ${upper}${endBrace}`;
}

function estimateGraphRangeBounds(expression, angle, finiteSamples, minValue, maxValue, verticalAsymptotes) {
  const edgeSamples = [...finiteSamples.slice(0, 4), ...finiteSamples.slice(-4)];
  const upperTouchesEdge = edgeSamples.some((sample) => Math.abs(sample.y - maxValue) <= 1e-6);
  const lowerTouchesEdge = edgeSamples.some((sample) => Math.abs(sample.y - minValue) <= 1e-6);
  const asymptoteProbes = verticalAsymptotes.flatMap((asymptote) => {
    const offsets = [1e-1, 1e-2, 1e-4, 1e-6];
    return offsets.flatMap((offset) => [
      evaluateGraphAnalysisValue(expression, asymptote - offset, angle),
      evaluateGraphAnalysisValue(expression, asymptote + offset, angle)
    ]);
  }).filter(Number.isFinite);

  const asymptoteLow = asymptoteProbes.length ? Math.min(...asymptoteProbes) : null;
  const asymptoteHigh = asymptoteProbes.length ? Math.max(...asymptoteProbes) : null;
  const positiveInfinityProbes = [64, 128, 256, 512].map((x) => evaluateGraphAnalysisValue(expression, x, angle)).filter(Number.isFinite);
  const negativeInfinityProbes = [-64, -128, -256, -512].map((x) => evaluateGraphAnalysisValue(expression, x, angle)).filter(Number.isFinite);
  const positiveTrend = classifyGraphProbeTrend(positiveInfinityProbes);
  const negativeTrend = classifyGraphProbeTrend(negativeInfinityProbes);

  return {
    unboundedLow:
      (minValue < -10 && lowerTouchesEdge)
      || (Number.isFinite(asymptoteLow) && asymptoteLow < -4)
      || (positiveTrend === 'decreasing' && positiveInfinityProbes.at(-1) < minValue - 0.5 && Math.abs(positiveInfinityProbes.at(-1) - positiveInfinityProbes[0]) > 0.5)
      || (negativeTrend === 'decreasing' && negativeInfinityProbes.at(-1) < minValue - 0.5 && Math.abs(negativeInfinityProbes.at(-1) - negativeInfinityProbes[0]) > 0.5),
    unboundedHigh:
      (maxValue > 10 && upperTouchesEdge)
      || (Number.isFinite(asymptoteHigh) && asymptoteHigh > 4)
      || (positiveTrend === 'increasing' && positiveInfinityProbes.at(-1) > maxValue + 0.5 && Math.abs(positiveInfinityProbes.at(-1) - positiveInfinityProbes[0]) > 0.5)
      || (negativeTrend === 'increasing' && negativeInfinityProbes.at(-1) > maxValue + 0.5 && Math.abs(negativeInfinityProbes.at(-1) - negativeInfinityProbes[0]) > 0.5)
  };
}

function shouldSplitGraphRangeAroundZero(verticalAsymptotes, horizontalAsymptotes, roots, finiteSamples) {
  if (!verticalAsymptotes.length || roots.length) {
    return false;
  }

  const horizontalZero = horizontalAsymptotes.some((value) => /^y\s*[=≈]\s*0(?:\b|$)/.test(value));
  if (!horizontalZero) {
    return false;
  }

  return finiteSamples.some((sample) => sample.y > 1e-6) || finiteSamples.some((sample) => sample.y < -1e-6);
}

function formatGraphSplitZeroRange(finiteSamples, minima, maxima, yIntercept) {
  const hasPositive = finiteSamples.some((sample) => sample.y > 1e-6);
  const hasNegative = finiteSamples.some((sample) => sample.y < -1e-6);
  const parts = [];

  if (hasNegative) {
    const attainedNegativeUpper = [
      ...maxima.filter((point) => point.y < -1e-6).map((point) => point.y),
      ...(Number.isFinite(yIntercept) && yIntercept < -1e-6 ? [yIntercept] : [])
    ];

    if (attainedNegativeUpper.length) {
      parts.push(`(-∞, ${formatGraphAnalysisNumber(Math.max(...attainedNegativeUpper))}]`);
    } else {
      parts.push('(-∞, 0)');
    }
  }

  if (hasPositive) {
    const attainedPositiveLower = [
      ...minima.filter((point) => point.y > 1e-6).map((point) => point.y),
      ...(Number.isFinite(yIntercept) && yIntercept > 1e-6 ? [yIntercept] : [])
    ];

    if (attainedPositiveLower.length) {
      parts.push(`[${formatGraphAnalysisNumber(Math.min(...attainedPositiveLower))}, ∞)`);
    } else {
      parts.push('(0, ∞)');
    }
  }

  if (parts.length) {
    return `y ∈ ${parts.join(' ∪ ')}`;
  }

  return GRAPH_ANALYSIS_STRINGS.rangeNone;
}

function detectGraphRoots(expression, angle, samples) {
  const roots = [];

  for (let index = 0; index < samples.length; index += 1) {
    const current = samples[index];
    if (!Number.isFinite(current.y)) {
      continue;
    }

    if (Math.abs(current.y) <= 1e-4) {
      pushUniqueApproximateValue(roots, current.x, 0.2);
    }

    const next = samples[index + 1];
    if (!next || !Number.isFinite(next.y)) {
      continue;
    }

    if (current.y === 0 || next.y === 0 || Math.sign(current.y) === Math.sign(next.y)) {
      continue;
    }

    if (Math.min(Math.abs(current.y), Math.abs(next.y)) > 1 && Math.abs(current.y - next.y) > 4) {
      continue;
    }

    const root = refineGraphRoot(expression, angle, current.x, next.x);
    if (Number.isFinite(root)) {
      pushUniqueApproximateValue(roots, root, 0.2);
    }
  }

  return roots.sort((left, right) => left - right);
}

function refineGraphRoot(expression, angle, left, right) {
  let low = left;
  let high = right;
  let lowValue = evaluateGraphAnalysisValue(expression, low, angle);
  let highValue = evaluateGraphAnalysisValue(expression, high, angle);

  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) {
    return null;
  }

  for (let iteration = 0; iteration < 28; iteration += 1) {
    const mid = (low + high) / 2;
    const midValue = evaluateGraphAnalysisValue(expression, mid, angle);
    if (!Number.isFinite(midValue)) {
      return mid;
    }
    if (Math.abs(midValue) < 1e-7) {
      return mid;
    }
    if (Math.sign(lowValue) === Math.sign(midValue)) {
      low = mid;
      lowValue = midValue;
    } else {
      high = mid;
      highValue = midValue;
    }
  }

  return (low + high) / 2;
}

function detectGraphExtrema(samples, kind) {
  const points = [];

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];

    if (![previous.y, current.y, next.y].every(Number.isFinite)) {
      continue;
    }

    const leftSlope = current.y - previous.y;
    const rightSlope = next.y - current.y;

    if (kind === 'min' && leftSlope < -1e-3 && rightSlope > 1e-3) {
      pushUniqueApproximatePoint(points, current, 0.35);
    }

    if (kind === 'max' && leftSlope > 1e-3 && rightSlope < -1e-3) {
      pushUniqueApproximatePoint(points, current, 0.35);
    }
  }

  return points;
}

function addGraphEndpointExtrema(samples, domainIntervals, verticalAsymptotes, minima, maxima) {
  for (const interval of domainIntervals) {
    const boundary = resolveGraphDomainIntervalBoundary(interval, samples, verticalAsymptotes);
    if (interval.startIndex > 0) {
      addGraphEndpointExtremum(samples, interval.startIndex, interval.startIndex + 1, boundary.start, minima, maxima);
    }
    if (interval.endIndex < samples.length - 1) {
      addGraphEndpointExtremum(samples, interval.endIndex, interval.endIndex - 1, boundary.end, minima, maxima);
    }
  }
}

function addGraphEndpointExtremum(samples, boundaryIndex, neighborIndex, boundary, minima, maxima) {
  if (!boundary?.inclusive) {
    return;
  }

  const boundarySample = samples[boundaryIndex];
  const neighborSample = samples[neighborIndex];
  if (!boundarySample || !neighborSample || ![boundarySample.y, neighborSample.y].every(Number.isFinite)) {
    return;
  }

  if (Math.abs(boundary.number - boundarySample.x) > 1e-8) {
    return;
  }

  const delta = neighborSample.y - boundarySample.y;
  if (delta > 1e-3) {
    pushUniqueApproximatePoint(minima, boundarySample, 0.2);
  } else if (delta < -1e-3) {
    pushUniqueApproximatePoint(maxima, boundarySample, 0.2);
  }
}

function detectGraphInflectionPoints(samples) {
  const points = [];
  let lastSecondDerivative = null;

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];

    if (![previous.y, current.y, next.y].every(Number.isFinite)) {
      lastSecondDerivative = null;
      continue;
    }

    const secondDerivative = next.y - (2 * current.y) + previous.y;
    if (Math.abs(secondDerivative) < 1e-3) {
      continue;
    }

    if (lastSecondDerivative != null && Math.sign(lastSecondDerivative) !== Math.sign(secondDerivative)) {
      pushUniqueApproximatePoint(points, current, 0.4);
    }

    lastSecondDerivative = secondDerivative;
  }

  return points;
}

function detectGraphVerticalAsymptotes(expression, angle, samples) {
  const asymptotes = [];
  const step = samples.length > 1 ? Math.abs(samples[1].x - samples[0].x) : 0.2;

  for (let index = 0; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];

    if (!current || Number.isFinite(current.y)) {
      continue;
    }

    const hasFiniteLeft = Number.isFinite(previous?.y);
    const hasFiniteRight = Number.isFinite(next?.y);
    if (!hasFiniteLeft && !hasFiniteRight) {
      continue;
    }

    if (sideShowsAsymptoticGrowth(expression, angle, current.x, step, -1, hasFiniteLeft)
      || sideShowsAsymptoticGrowth(expression, angle, current.x, step, 1, hasFiniteRight)) {
      pushUniqueApproximateValue(asymptotes, current.x, step * 1.5);
    }
  }

  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = samples[index];
    const next = samples[index + 1];
    if (![current.y, next.y].every(Number.isFinite)) {
      continue;
    }

    if (Math.sign(current.y) === Math.sign(next.y)) {
      continue;
    }

    if (Math.min(Math.abs(current.y), Math.abs(next.y)) < 4 || Math.abs(current.y - next.y) < 8) {
      continue;
    }

    const candidate = (current.x + next.x) / 2;
    if (sideShowsAsymptoticGrowth(expression, angle, candidate, step, -1, true)
      || sideShowsAsymptoticGrowth(expression, angle, candidate, step, 1, true)) {
      pushUniqueApproximateValue(asymptotes, candidate, step * 1.5);
    }
  }

  return asymptotes.sort((left, right) => left - right);
}

function addGraphBoundaryAsymptotes(expression, angle, samples, domainIntervals, asymptotes) {
  const step = samples.length > 1 ? Math.abs(samples[1].x - samples[0].x) : 0.2;

  for (const interval of domainIntervals) {
    const previous = samples[interval.startIndex - 1];
    if (previous && !Number.isFinite(previous.y) && sideShowsAsymptoticGrowth(expression, angle, previous.x, step, 1, true)) {
      pushUniqueApproximateValue(asymptotes, previous.x, step * 1.5);
    }

    const next = samples[interval.endIndex + 1];
    if (next && !Number.isFinite(next.y) && sideShowsAsymptoticGrowth(expression, angle, next.x, step, -1, true)) {
      pushUniqueApproximateValue(asymptotes, next.x, step * 1.5);
    }
  }

  asymptotes.sort((left, right) => left - right);
}

function sideShowsAsymptoticGrowth(expression, angle, center, step, direction, enabled) {
  if (!enabled) {
    return false;
  }

  const offsets = [step / 2, step / 4, step / 10, step / 20].filter((offset) => offset > 1e-4);
  const values = offsets
    .map((offset) => evaluateGraphAnalysisValue(expression, center + (direction * offset), angle))
    .filter(Number.isFinite);

  if (values.length < 2) {
    return false;
  }

  const magnitudes = values.map((value) => Math.abs(value));
  const finalMagnitude = magnitudes[magnitudes.length - 1];
  const initialMagnitude = magnitudes[0];
  const monotoneGrowth = magnitudes.every((value, index) => index === 0 || value >= magnitudes[index - 1] - 1e-6);

  return monotoneGrowth && finalMagnitude >= 2 && (finalMagnitude >= initialMagnitude * 1.5 || finalMagnitude - initialMagnitude >= 0.75);
}

function classifyGraphProbeTrend(values) {
  if (values.length < 3) {
    return null;
  }

  let increasing = true;
  let decreasing = true;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[index - 1] - 1e-3) {
      increasing = false;
    }
    if (values[index] > values[index - 1] + 1e-3) {
      decreasing = false;
    }
  }

  if (increasing) {
    return 'increasing';
  }
  if (decreasing) {
    return 'decreasing';
  }
  return 'mixed';
}

function detectGraphHorizontalAsymptotes(expression, angle) {
  const sides = [
    { label: 'x → −∞', values: [-64, -128, -256, -512], farther: -1024 },
    { label: 'x → ∞', values: [64, 128, 256, 512], farther: 1024 }
  ];
  const asymptotes = [];

  for (const side of sides) {
    const ys = side.values.map((x) => evaluateGraphAnalysisValue(expression, x, angle)).filter(Number.isFinite);
    if (ys.length < 4) {
      continue;
    }

    const magnitudes = ys.map((value) => Math.abs(value));
    const trendsToZero = magnitudes.at(-1) < 0.1 && magnitudes.every((value, index) => index === 0 || value <= magnitudes[index - 1] + 1e-3);
    if (trendsToZero) {
      asymptotes.push({ label: side.label, value: 0 });
      continue;
    }

    const spread = Math.max(...ys) - Math.min(...ys);
    if (spread > 0.1) {
      continue;
    }

    const candidate = ys[ys.length - 1];
    const fartherValue = evaluateGraphAnalysisValue(expression, side.farther, angle);
    if (!Number.isFinite(fartherValue)) {
      continue;
    }

    if (Math.abs(fartherValue - candidate) > Math.max(0.05, Math.abs(candidate) * 0.05)) {
      continue;
    }

    asymptotes.push({ label: side.label, value: (candidate + fartherValue) / 2 });
  }

  if (!asymptotes.length) {
    return [];
  }

  if (asymptotes.length === 2 && Math.abs(asymptotes[0].value - asymptotes[1].value) <= 0.25) {
    return [formatGraphEquality('y', (asymptotes[0].value + asymptotes[1].value) / 2)];
  }

  return asymptotes.map((item) => `${formatGraphEquality('y', item.value)} as ${item.label}`);
}

function detectGraphObliqueAsymptotes(expression, angle, hasHorizontalAsymptote) {
  if (hasHorizontalAsymptote) {
    return [];
  }

  const sides = [
    { label: 'x → −∞', values: [-256, -128, -64] },
    { label: 'x → ∞', values: [64, 128, 256] }
  ];
  const lines = [];

  for (const side of sides) {
    const [x1, x2, x3] = side.values;
    const y1 = evaluateGraphAnalysisValue(expression, x1, angle);
    const y2 = evaluateGraphAnalysisValue(expression, x2, angle);
    const y3 = evaluateGraphAnalysisValue(expression, x3, angle);

    if (![y1, y2, y3].every(Number.isFinite)) {
      continue;
    }

    const slopeA = (y1 - y2) / (x1 - x2);
    const slopeB = (y2 - y3) / (x2 - x3);
    if (!Number.isFinite(slopeA) || !Number.isFinite(slopeB) || Math.abs(slopeA - slopeB) > 0.2 || Math.abs(slopeA) < 0.05) {
      continue;
    }

    const interceptA = y1 - (slopeA * x1);
    const interceptB = y2 - (slopeA * x2);
    if (Math.abs(interceptA - interceptB) > 1.5) {
      continue;
    }

    const intercept = (interceptA + interceptB) / 2;
    const fartherX = side.label.includes('−') ? -512 : 512;
    const fartherY = evaluateGraphAnalysisValue(expression, fartherX, angle);
    if (!Number.isFinite(fartherY)) {
      continue;
    }

    const fartherResidual = Math.abs(fartherY - ((slopeA * fartherX) + intercept));
    if (fartherResidual > Math.max(0.5, Math.abs(fartherY) * 0.05)) {
      continue;
    }

    lines.push(`${formatGraphLine(slopeA, intercept)} as ${side.label}`);
  }

  return lines;
}

function detectGraphParity(expression, angle) {
  let even = true;
  let odd = true;
  let comparisons = 0;

  for (let x = 1; x <= 16; x += 1) {
    const left = evaluateGraphAnalysisValue(expression, x, angle);
    const right = evaluateGraphAnalysisValue(expression, -x, angle);
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      continue;
    }

    comparisons += 1;
    if (Math.abs(left - right) > 1e-3) {
      even = false;
    }
    if (Math.abs(left + right) > 1e-3) {
      odd = false;
    }
  }

  if (!comparisons) {
    return GRAPH_ANALYSIS_STRINGS.parityUnknown;
  }
  if (even) {
    return GRAPH_ANALYSIS_STRINGS.parityEven;
  }
  if (odd) {
    return GRAPH_ANALYSIS_STRINGS.parityOdd;
  }
  return GRAPH_ANALYSIS_STRINGS.parityNeither;
}

function detectGraphPeriodicity(expression, angle) {
  if (!/\b(?:sin|cos|tan|sec|csc|cot)\(/.test(expression)) {
    return null;
  }

  const candidatePeriods = angle === 'DEG'
    ? [360, 180]
    : angle === 'GRAD'
      ? [400, 200]
      : [2 * Math.PI, Math.PI];

  for (const period of candidatePeriods) {
    let matches = 0;
    let total = 0;

    for (let x = -6; x <= 6; x += 1) {
      const left = evaluateGraphAnalysisValue(expression, x, angle);
      const right = evaluateGraphAnalysisValue(expression, x + period, angle);
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        continue;
      }
      total += 1;
      if (Math.abs(left - right) <= 1e-3) {
        matches += 1;
      }
    }

    if (total >= 6 && matches / total >= 0.85) {
      return formatGraphEquality('T', period);
    }
  }

  return GRAPH_ANALYSIS_STRINGS.periodicityNotPeriodic;
}

function detectGraphMonotonicity(samples, minima, maxima, domainIntervals, verticalAsymptotes = []) {
  const turningPoints = [...minima, ...maxima].map((point) => point.x).sort((left, right) => left - right);
  const rows = [];

  for (const interval of domainIntervals) {
    const boundary = resolveGraphDomainIntervalBoundary(interval, samples, verticalAsymptotes);
    const intervalStart = interval.startIndex === 0 ? -Infinity : boundary.start.number;
    const intervalEnd = interval.endIndex === samples.length - 1 ? Infinity : boundary.end.number;
    const intervalTurningPoints = turningPoints.filter((point) => point > intervalStart && point < intervalEnd);
    const segmentBoundaries = [
      { value: intervalStart, brace: interval.startIndex === 0 ? '(' : boundary.start.brace },
      ...intervalTurningPoints.map((point) => ({ value: point, brace: ')' })),
      { value: intervalEnd, brace: interval.endIndex === samples.length - 1 ? ')' : boundary.end.brace }
    ];

    for (let index = 0; index < segmentBoundaries.length - 1; index += 1) {
      const start = segmentBoundaries[index];
      const end = segmentBoundaries[index + 1];
      const startBrace = index === 0 ? start.brace : '(';
      const endBrace = index === segmentBoundaries.length - 2 ? end.brace : ')';
      const segment = samples.filter((sample) => {
        if (!Number.isFinite(sample.y)) {
          return false;
        }
        const afterStart = startBrace === '[' ? sample.x >= start.value : sample.x > start.value;
        const beforeEnd = endBrace === ']' ? sample.x <= end.value : sample.x < end.value;
        return afterStart && beforeEnd;
      });

      if (segment.length < 2) {
        continue;
      }

      const direction = getGraphSegmentDirection(segment);
      rows.push({
        expression: formatGraphInterval(start.value, end.value, startBrace, endBrace),
        direction
      });
    }
  }

  return rows;
}

function getGraphSegmentDirection(segment) {
  let increasing = true;
  let decreasing = true;
  let hasDelta = false;

  for (let index = 1; index < segment.length; index += 1) {
    const delta = segment[index].y - segment[index - 1].y;
    if (Math.abs(delta) <= 1e-3) {
      continue;
    }

    hasDelta = true;
    if (delta < 0) {
      increasing = false;
    }
    if (delta > 0) {
      decreasing = false;
    }
  }

  if (!hasDelta || (increasing && decreasing)) {
    return GRAPH_ANALYSIS_STRINGS.monotonicityConstant;
  }
  if (increasing) {
    return GRAPH_ANALYSIS_STRINGS.monotonicityIncreasing;
  }
  if (decreasing) {
    return GRAPH_ANALYSIS_STRINGS.monotonicityDecreasing;
  }
  return GRAPH_ANALYSIS_STRINGS.monotonicityUnknown;
}

function formatGraphInterval(start, end, startBrace = '(', endBrace = ')') {
  const startText = typeof start === 'string'
    ? start
    : Number.isFinite(start)
      ? formatGraphAnalysisNumber(start)
      : '-∞';
  const endText = typeof end === 'string'
    ? end
    : Number.isFinite(end)
      ? formatGraphAnalysisNumber(end)
      : '∞';
  return `${startBrace}${startText}, ${endText}${endBrace}`;
}

function formatGraphEquality(symbol, value) {
  const exact = isNearlyInteger(value, 1e-8);
  const operator = exact ? '=' : '≈';
  return `${symbol} ${operator} ${formatGraphAnalysisNumber(value)}`;
}

function formatGraphPoint(x, y) {
  return `(${formatGraphAnalysisNumber(x)}, ${formatGraphAnalysisNumber(y)})`;
}

function formatGraphLine(slope, intercept) {
  const slopeText = isNearlyInteger(slope, 1e-8) ? formatGraphAnalysisNumber(slope) : formatGraphAnalysisNumber(slope);
  const interceptText = formatGraphAnalysisNumber(Math.abs(intercept));

  if (Math.abs(intercept) <= 1e-8) {
    return `y ≈ ${slopeText}x`;
  }

  return `y ≈ ${slopeText}x ${intercept >= 0 ? '+' : '−'} ${interceptText}`;
}

function formatGraphAnalysisNumber(value) {
  const normalized = Math.abs(value) <= 1e-10 ? 0 : value;
  return formatNumber(Number(normalized.toFixed(8)));
}

function isNearlyInteger(value, tolerance = 1e-8) {
  return Math.abs(value - Math.round(value)) <= tolerance;
}

function pushUniqueApproximateValue(values, nextValue, tolerance) {
  if (values.some((value) => Math.abs(value - nextValue) <= tolerance)) {
    return;
  }
  values.push(nextValue);
}

function pushUniqueApproximatePoint(points, nextPoint, tolerance) {
  if (points.some((point) => Math.abs(point.x - nextPoint.x) <= tolerance)) {
    return;
  }
  points.push(nextPoint);
}

function getGraphPalette() {
  return getGraphPaletteForSelection(state.graphing.theme, document.documentElement.dataset.theme);
}

function drawAxisDecorations(ctx, width, height, xAxisY, yAxisX, toScreenX, toScreenY, xMin, xMax, yMin, yMax, labelColor) {
  ctx.fillStyle = labelColor;
  ctx.strokeStyle = labelColor;
  ctx.font = 'italic 12px "Calculator UI", "Segoe UI", sans-serif';

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

  ctx.font = 'italic 11px "Calculator UI", "Segoe UI", sans-serif';
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
