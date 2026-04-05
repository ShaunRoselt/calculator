export function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return 'Overflow';
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  const normalized = Number(value.toPrecision(12)).toString();
  return normalized.includes('e') ? value.toString() : normalized;
}


export function formatExpressionForDisplay(expression) {
  return escapeHtml(String(expression || '')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/\blogbase\b/g, 'logᵧ')
    .replace(/\broot\b/g, 'ʸ√')
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
    .replace(/\bacot\(/g, 'cot⁻¹('));
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
