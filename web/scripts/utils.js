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
    .replace(/\//g, '÷'));
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
