const fs = require('fs');
const path = require('path');
const enPath = path.join(__dirname, '..', 'assets', 'i18n', 'en.json');
const arPath = path.join(__dirname, '..', 'assets', 'i18n', 'ar.json');

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('PARSE_ERROR', p, e.message);
    process.exit(2);
  }
}

function extractPlaceholders(s) {
  if (typeof s !== 'string') return new Set();
  const m = s.match(/\{[^}]+\}/g);
  return new Set((m||[]).map(x => x));
}

function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }

let en = readJSON(enPath);
let ar = readJSON(arPath);

let report = {
  addedKeys: 0,
  removedKeys: 0,
  replacedEmpty: 0,
  replacedPlaceholderMismatch: 0,
  replacedCorrupt: 0
};

function ensureKeys(enNode, arNode, pathArr) {
  for (const k of Object.keys(enNode)) {
    const enVal = enNode[k];
    if (!(k in arNode)) {
      // copy from en
      arNode[k] = enVal;
      report.addedKeys++;
      continue;
    }
    const arVal = arNode[k];
    if (isObject(enVal) && isObject(arVal)) {
      ensureKeys(enVal, arVal, pathArr.concat(k));
    } else if (typeof enVal === 'string') {
      // arVal should be string
      if (typeof arVal !== 'string') {
        arNode[k] = enVal; report.replacedCorrupt++;
        continue;
      }
      if (arVal.trim() === '') {
        arNode[k] = enVal; report.replacedEmpty++; continue;
      }
      if (arVal.includes('PH_')) { arNode[k] = enVal; report.replacedCorrupt++; continue; }
      const phEn = extractPlaceholders(enVal);
      const phAr = extractPlaceholders(arVal);
      const same = (phEn.size === phAr.size) && [...phEn].every(x => phAr.has(x));
      if (!same) {
        // replace with english value to guarantee placeholders
        arNode[k] = enVal; report.replacedPlaceholderMismatch++;
      }
    } else {
      // non-string leaf (number/boolean) - copy if types differ
      if (typeof enVal !== typeof arVal) { arNode[k] = enVal; report.replacedCorrupt++; }
    }
  }
}

function removeExtra(arNode, enNode) {
  for (const k of Object.keys(arNode)) {
    if (!(k in enNode)) {
      delete arNode[k]; report.removedKeys++; continue;
    }
    const a = arNode[k];
    const e = enNode[k];
    if (isObject(a) && isObject(e)) removeExtra(a, e);
    // if types mismatch and en doesn't have object, leave replaced earlier
  }
}

ensureKeys(en, ar, []);
removeExtra(ar, en);

if (report.addedKeys || report.removedKeys || report.replacedEmpty || report.replacedPlaceholderMismatch || report.replacedCorrupt) {
  fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + '\n', 'utf8');
}

console.log('RESULT', JSON.stringify(report));
