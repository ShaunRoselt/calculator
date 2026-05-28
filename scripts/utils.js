export function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return 'Overflow';
  }

  const groupDigits = (intStr) => {
    return String(intStr).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  };

  if (Number.isInteger(value)) {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    return sign + groupDigits(String(abs));
  }

  const normalized = Number(value.toPrecision(12)).toString();
  if (normalized.includes('e')) {
    return value.toString();
  }

  const sign = normalized.startsWith('-') ? '-' : '';
  const absStr = sign ? normalized.slice(1) : normalized;
  const [intPart, fracPart] = absStr.split('.');
  const groupedInt = groupDigits(intPart || '0');
  return sign + groupedInt + (fracPart ? '.' + fracPart : '');
}

export function formatExpressionText(expression) {
  let formatted = String(expression || '')
    .replace(/\blogbase\b/g, 'logᵧ')
    .replace(/\broot\b/g, 'ʸ√')
    .replace(/\bpi\b/g, 'π')
    .replace(/\basinh\(/g, 'sinh⁻¹(')
    .replace(/\bacosh\(/g, 'cosh⁻¹(')
    .replace(/\batanh\(/g, 'tanh⁻¹(')
    .replace(/\basech\(/g, 'sech⁻¹(')
    .replace(/\bacsch\(/g, 'csch⁻¹(')
    .replace(/\bacoth\(/g, 'coth⁻¹(')
    .replace(/\basin\(/g, 'sin⁻¹(')
    .replace(/\bacos\(/g, 'cos⁻¹(')
    .replace(/\batan\(/g, 'tan⁻¹(')
    .replace(/\basec\(/g, 'sec⁻¹(')
    .replace(/\bacsc\(/g, 'csc⁻¹(')
    .replace(/\bacot\(/g, 'cot⁻¹(')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷');

  formatted = formatted.replace(/\bsqrt\(([^()]+)\)/g, (_, inner) => {
    const trimmedInner = inner.trim();
    return /^(?:-?[\dA-Za-zπ]+)$/.test(trimmedInner) ? `√${trimmedInner}` : `√(${trimmedInner})`;
  });

  return formatted;
}


export function formatExpressionForDisplay(expression) {
  return escapeHtml(formatExpressionText(expression));
}


export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


export function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
