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

function toFiniteNumber(expression) {
  try {
    if (!expression.isImaginary()) {
      return Number(expression.evaluate().text({ decimal: true, precision: 16 }));
    }
  } catch {
    // A single unevaluable solution should not hide the other roots.
  }
  return NaN;
}

function uniqueSortedValues(values, tolerance = 1e-7) {
  const result = [];

  for (const value of values.filter(Number.isFinite).sort((left, right) => left - right)) {
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
    const roots = nerdamer.solve(casExpression, 'x').toArray();
    return uniqueSortedValues(roots.map(toFiniteNumber));
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
    let derivative = nerdamer(normalizeGraphExpressionForCas(expression));
    for (let index = 0; index < order; index += 1) {
      derivative = derivative.diff('x');
    }

    return solveCasExpression(derivative);
  } catch {
    return [];
  }
}
