import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { detectUserCurrencyCode } from '../scripts/currencyLocale.js';
import {
  solveGraphDerivativeWithCas,
  solveGraphExpressionWithCas
} from '../scripts/graphAnalysisCas.js';

before(async () => {
  const bundle = new URL('../assets/vendor/nerdamer/bundle.js', import.meta.url);
  const browser = {};
  runInNewContext(await readFile(bundle, 'utf8'), browser, { filename: bundle.pathname });
  globalThis.nerdamer = browser.nerdamer;
});

test('the bundled graph solver returns sorted numeric roots for an irrational solution', () => {
  const roots = solveGraphExpressionWithCas('x^2-2');
  assert.equal(roots.length, 2);
  assert.ok(Math.abs(roots[0] + Math.SQRT2) < 1e-12);
  assert.ok(Math.abs(roots[1] - Math.SQRT2) < 1e-12);
});

test('the graph solver filters complex roots and keeps repeated real roots', () => {
  assert.deepEqual(solveGraphExpressionWithCas('x^3-8'), [2]);
  assert.deepEqual(solveGraphExpressionWithCas('x^2+1'), []);
  assert.deepEqual(solveGraphExpressionWithCas('(x-100)^2'), [100]);
});

test('the graph solver finds stationary and inflection point inputs', () => {
  assert.deepEqual(solveGraphDerivativeWithCas('x^3-3*x'), [-1, 1]);
  assert.deepEqual(solveGraphDerivativeWithCas('x^3-3*x', 2), [0]);
});

test('the currency map selects the Caribbean guilder for both issuing territories', () => {
  assert.equal(detectUserCurrencyCode(['nl-CW']), 'XCG');
  assert.equal(detectUserCurrencyCode(['en-SX']), 'XCG');
});
