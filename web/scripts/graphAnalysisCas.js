const UNSAFE_CAS_SOLVER_PATTERN = /\b(?:sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|asin|acos|atan|asec|acsc|acot|asinh|acosh|atanh|abs|floor|ceil)\(/;

function getNerdamer() {
  return globalThis.nerdamer ?? null;
}

function normalizeGraphExpressionForCas(expression) {
  return String(expression || '')
    .replace(/\bln\(/g, '__CAS_NATURAL_LOG__(')
    .replace(/\blog\(/g, 'log10(')
    .replace(/__CAS_NATURAL_LOG__\(/g, 'log(');
}

function isFiniteRealCasExpression(expression) {
  const raw = expression?.toString?.() ?? '';
  return raw && !/(^|[^A-Za-z])i([^A-Za-z]|$)/.test(raw);
}

function toFiniteNumber(expression) {
  const nerdamer = getNerdamer();
  if (!nerdamer || !isFiniteRealCasExpression(expression)) {
    return null;
  }

  try {
    const value = Number(nerdamer(expression.toString()).evaluate().text());
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function uniqueSortedValues(values, tolerance = 1e-7) {
  const result = [];

  for (const value of values.sort((left, right) => left - right)) {
    if (!Number.isFinite(value)) {
      continue;
    }

    if (result.some((existing) => Math.abs(existing - value) <= tolerance)) {
      continue;
    }

    result.push(value);
  }

  return result;
}

function solveCasExpression(casExpression) {
  const nerdamer = getNerdamer();
  if (!nerdamer) {
    return [];
  }

  try {
    const result = nerdamer.solve(casExpression, 'x');
    const elements = Array.isArray(result?.symbol?.elements)
      ? result.symbol.elements
      : result?.symbol
        ? [result.symbol]
        : [];

    return uniqueSortedValues(elements.map(toFiniteNumber).filter(Number.isFinite));
  } catch {
    return [];
  }
}

export function canUseGraphAnalysisCasSolver(expression) {
  return !!getNerdamer() && !UNSAFE_CAS_SOLVER_PATTERN.test(String(expression || ''));
}

export function solveGraphExpressionWithCas(expression) {
  if (!canUseGraphAnalysisCasSolver(expression)) {
    return [];
  }

  return solveCasExpression(normalizeGraphExpressionForCas(expression));
}

export function solveGraphDerivativeWithCas(expression, order = 1) {
  if (!canUseGraphAnalysisCasSolver(expression)) {
    return [];
  }

  const nerdamer = getNerdamer();
  if (!nerdamer) {
    return [];
  }

  try {
    let derivative = normalizeGraphExpressionForCas(expression);
    for (let index = 0; index < order; index += 1) {
      derivative = nerdamer(`diff(${derivative},x)`).toString();
    }

    return solveCasExpression(derivative);
  } catch {
    return [];
  }
}