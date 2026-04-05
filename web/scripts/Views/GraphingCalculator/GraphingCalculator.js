import { state } from '../../state.js';
import { escapeHtml } from '../../utils.js';

export function renderGraphingCalculatorView() {
  return `
    <div class="form-section">
      <div class="section-header">
        <div>
          <div class="subtitle">A lightweight graphing companion</div>
          <h3>Graphing calculator</h3>
        </div>
      </div>
      <div class="info-banner">Use x in your expression, for example <strong>sin(x)</strong>, <strong>x^2</strong>, or <strong>sqrt(abs(x))</strong>.</div>
      <div class="graph-form">
        <input type="text" name="graph-expression" value="${escapeHtml(state.graphing.expression)}" />
        <button class="graph-button" data-graph-plot="true">Plot</button>
      </div>
      <p class="helper-text">${escapeHtml(state.graphing.status)}</p>
      <canvas id="graph-canvas" class="graph-canvas" width="1200" height="640" aria-label="Graph canvas"></canvas>
    </div>
  `;
}
