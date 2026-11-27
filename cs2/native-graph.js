import nerdamer from 'calculator-native-nerdamer';
import { t } from '../scripts/i18n.js';
import {
  analyzeGraphExpression, backspaceGraphExpression, clearGraphExpression, closeGraphExpressionAnalysis,
  commitGraphExpression, createGraphEvaluator, insertGraphToken, panGraph, removeGraphExpression,
  resetGraphViewport, selectGraphExpression, setGraphExpression, setGraphExpressionColor,
  setGraphExpressionLineStyle, setGraphMobileView, toggleGraphExpressionVisibility, zoomGraph,
} from '../scripts/logic.js';
import { state } from '../scripts/state.js';
import { formatExpressionText } from '../scripts/utils.js';
import {
  graphColors, graphColumns, graphGridSize, graphKeypad, graphListSize, graphRows,
  graphTraceZones, graphVectorLayers, graphVectorSegments, scienceMenu,
} from './layout-data.js';

const width = graphColumns * 2;
const height = graphRows * 4;
const brailleBits = [[1, 2, 4, 64], [8, 16, 32, 128]];
const angles = ['RAD', 'DEG', 'GRAD'];
const lineStyles = ['solid', 'dash', 'dot'];
const maxExpressionLength = 128;
const graphKeys = graphKeypad.flat();
const inequalityKeys = [['<', '<'], ['≤', '<='], ['=', '='], ['≥', '>='], ['>', '>']];
const solvesForX = (value) => /^\s*x\s*[<>=]/.test(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value) => Number(value.toPrecision(6)).toString();

function assignPoint(layer, x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const cell = Math.floor(y / 4) * graphColumns + Math.floor(x / 2);
  layer[cell] |= brailleBits[x % 2][y % 4];
}

function line(layer, from, to, style = 'solid', thickness = 1) {
  const steps = Math.max(1, Math.abs(from[0] - to[0]), Math.abs(from[1] - to[1]));
  for (let index = 0; index <= steps; index += 1) {
    const x = Math.round(from[0] + (to[0] - from[0]) * index / steps);
    const y = Math.round(from[1] + (to[1] - from[1]) * index / steps);
    const phase = (x + y) & 7;
    if ((style === 'dash' && phase > 4) || (style === 'dot' && (phase & 1))) continue;
    assignPoint(layer, x, y);
    if (thickness >= 2) assignPoint(layer, x, y + 1);
    if (thickness >= 3) assignPoint(layer, x + 1, y);
    if (thickness === 4) assignPoint(layer, x, y - 1);
  }
}

function parseCurve(source, angle) {
  const relation = /^\s*([xy])\s*(<=|>=|=|<|>)\s*(.+)$/.exec(source);
  const formula = relation?.[1] === 'x' ? relation[3].replace(/\by\b/g, 'x') : relation?.[3] ?? source;
  const evaluate = createGraphEvaluator(formula, angle);
  return { evaluate, axis: relation?.[1] ?? 'y', relation: relation?.[2] ?? '=' };
}

function renderGraphRaster(graph, trace, nativeExpressions) {
  const layers = new Map();
  const layer = (id) => {
    if (!layers.has(id)) layers.set(id, new Uint8Array(graphColumns * graphRows));
    return layers.get(id);
  };
  const { xMin, xMax, yMin, yMax } = graph.viewport;
  const projectX = (x) => Math.round((x - xMin) * (width - 1) / (xMax - xMin));
  const projectY = (y) => Math.round((yMax - y) * (height - 1) / (yMax - yMin));
  for (const expression of graph.expressions) {
    if (!expression.plottedValue || !expression.visible || nativeExpressions.has(expression)) continue;
    const curve = parseCurve(expression.plottedValue, graph.angle);
    const ink = layer(String(Math.max(0, graphColors.indexOf(expression.color))));
    const vertical = curve.axis === 'x';
    const count = vertical ? height : width;
    const range = vertical ? width : height;
    const above = vertical ? curve.relation[0] === '<' : curve.relation[0] === '>';
    const shading = curve.relation !== '=';
    let previous = null;
    let hasPoint = false;
    for (let index = 0; index < count; index += 1) {
      const input = vertical ? yMax - index * (yMax - yMin) / (height - 1) :
        xMin + index * (xMax - xMin) / (width - 1);
      const sample = curve.evaluate(input);
      if (sample === null) {
        previous = null;
        continue;
      }
      hasPoint = true;
      const pixel = vertical ? projectX(sample) : projectY(sample);
      const bounded = clamp(pixel, -range, range * 2);
      const point = vertical ? [bounded, index] : [index, bounded];
      if (previous && Math.abs(previous[vertical ? 0 : 1] - bounded) < range / 2) {
        line(ink, previous, point, curve.relation.length === 1 && shading ? 'dash' : expression.lineStyle, graph.lineThickness);
      } else assignPoint(ink, ...point);
      if (shading && index % 4 === 0) {
        const start = above ? 0 : bounded;
        const end = above ? bounded : range;
        for (let fill = Math.max(0, start); fill < Math.min(end, range); fill += 4) {
          assignPoint(ink, ...(vertical ? [fill, index] : [index, fill]));
        }
      }
      previous = point;
    }
    expression.error = !hasPoint;
  }
  if (trace !== null) {
    const value = graph.expressions[graph.activeExpressionIndex].plottedValue;
    if (solvesForX(value)) {
      const y = projectY(trace);
      line(layer('trace'), [0, y], [width - 1, y], 'dot');
    } else {
      const x = projectX(trace);
      line(layer('trace'), [x, 0], [x, height - 1], 'dot');
    }
  }
  return new Map([...layers].map(([id, cells]) => [
    id,
    Array.from({ length: graphRows }, (_, row) => {
      const start = row * graphColumns;
      return String.fromCodePoint(...Uint16Array.from(cells.subarray(start, start + graphColumns), (cell) => 0x2800 + cell));
    }),
  ]));
}

function setPlotClass(session, panel, slot, value) {
  const classes = session.plotClasses ??= new Map();
  const key = panel + ':' + slot;
  const previous = classes.get(key);
  if (previous === value) return;
  const { cls } = session.port;
  if (previous) cls(panel, previous, false);
  if (value) cls(panel, value, true);
  classes.set(key, value);
}

function plotPosition(axis, percent) {
  return 'Plot' + axis.toUpperCase() + clamp(Math.round(percent * 200), 0, 200);
}

function updateGrid(session, viewport) {
  const { cls, text } = session.port;
  for (const axis of ['x', 'y']) {
    const min = viewport[axis + 'Min'];
    const max = viewport[axis + 'Max'];
    const other = axis === 'x' ? 'y' : 'x';
    const otherMin = viewport[other + 'Min'];
    const otherMax = viewport[other + 'Max'];
    const zero = (0 - otherMin) / (otherMax - otherMin);
    const target = (max - min) / 20;
    const scale = 10 ** Math.floor(Math.log10(target));
    const step = [1, 2, 5, 10].find((value) => value * scale >= target) * scale;
    const start = Math.ceil(min / step);
    const end = Math.floor(max / step);
    for (let i = 0; i < graphGridSize; i += 1) {
      const id = `graph_grid_${axis}_${i}`;
      const label = `graph_tick_${axis}_${i}`;
      const tick = start + i;
      cls(id, 'Hidden', tick > end);
      const showTick = tick <= end && tick % 5 === 0 && tick > start && tick < end &&
        zero >= 0 && zero <= 1 && (tick !== 0 || axis === 'x');
      cls(label, 'Hidden', !showTick);
      if (tick > end) continue;
      const relative = (tick * step - min) / (max - min);
      const position = plotPosition(axis, axis === 'x' ? relative : 1 - relative);
      setPlotClass(session, id, axis, position);
      cls(id, 'Axis', tick === 0);
      cls(id, 'Major', tick % 5 === 0);
      if (showTick) {
        text(label, round(tick * step));
        setPlotClass(session, label, axis, position);
        setPlotClass(session, label, other, plotPosition(other, other === 'y' ? 1 - zero : zero));
      }
    }
  }
}

function updateNativeCurves(session, graph) {
  const { cls } = session.port;
  const { xMin, xMax, yMin, yMax } = graph.viewport;
  const layers = [];
  for (const expression of graph.expressions) {
    if (!expression.visible || !expression.plottedValue.trim()) continue;
    const curve = parseCurve(expression.plottedValue, graph.angle);
    if (curve.axis !== 'y' || curve.relation !== '=') continue;
    layers.push({ expression, curve });
    if (layers.length === graphVectorLayers) break;
  }
  for (let layer = 0; layer < graphVectorLayers; layer += 1) {
    const id = 'graph_curve_' + layer;
    const entry = layers[layer];
    cls(id, 'Hidden', !entry);
    if (!entry) continue;
    const { expression, curve } = entry;
    const color = Math.max(0, graphColors.indexOf(expression.color));
    setPlotClass(session, id, 'color', 'Color' + color);
    const sample = (index) => {
      const x = xMin + (xMax - xMin) * index / graphVectorSegments;
      const y = curve.evaluate(x);
      return y === null ? null : (yMax - y) / (yMax - yMin);
    };
    let previous = sample(0);
    let valid = previous !== null;
    for (let index = 0; index < graphVectorSegments; index += 1) {
      const current = sample(index + 1);
      const segment = `graph_segment_${layer}_${index}`;
      const show = previous !== null && current !== null &&
        Math.abs(current - previous) < 0.5 && Math.max(previous, current) >= 0 && Math.min(previous, current) <= 1 &&
        (expression.lineStyle !== 'dash' || index % 3 < 2) &&
        (expression.lineStyle !== 'dot' || index % 2 === 0);
      cls(segment, 'Hidden', !show);
      if (show) {
        const upper = clamp(Math.min(previous, current), 0, 1);
        const lower = clamp(Math.max(previous, current), 0, 1);
        const thickness = Math.round((lower - upper) * 200);
        setPlotClass(session, segment, 'y', plotPosition('y', upper));
        setPlotClass(session, segment, 'height', thickness ? 'Length' + thickness : '');
        setPlotClass(session, segment, 'slope', thickness ? (current < previous ? 'Rise' : 'Fall') : 'Level');
        cls(segment, 'Thick', graph.lineThickness >= 3);
      }
      valid ||= current !== null;
      previous = current;
    }
    expression.error = !valid;
  }
  return new Set(layers.map(({ expression }) => expression));
}

function graphFunctions(session, graph) {
  if (session.graphMenu === 'inequality') return inequalityKeys;
  if (session.graphMenu === 'function') return scienceMenu[4].slice(0, 3);
  return scienceMenu[Number(graph.trigShifted) + 2 * Number(graph.trigHyperbolic)];
}

export function updateGraphHud(session) {
  const graph = state.graphing;
  const { text, cls } = session.port;
  const showEditor = graph.mobileView === 'editor';
  cls('view_graphing', 'GraphEditorSelected', showEditor);
  cls('graph_view_graph', 'Selected', !showEditor);
  cls('graph_view_editor', 'Selected', showEditor);
  const active = graph.expressions[graph.activeExpressionIndex];
  const { xMin, xMax, yMin, yMax } = graph.viewport;
  const plotTheme = graph.theme === 'match-app' ? session.displayedTheme : graph.theme;
  if (plotTheme !== session.displayedPlotTheme) {
    if (session.displayedPlotTheme) cls('graph_canvas', 'PlotTheme_' + session.displayedPlotTheme, false);
    cls('graph_canvas', 'PlotTheme_' + plotTheme, true);
    session.displayedPlotTheme = plotTheme;
  }
  const signature = JSON.stringify([graph.viewport, graph.angle, graph.lineThickness, session.traceX, graph.activeExpressionIndex,
    graph.expressions.map(({ plottedValue, visible, color, lineStyle }) => [plottedValue, visible, color, lineStyle])]);

  if (signature !== session.graphSignature) {
    const raster = renderGraphRaster(graph, session.traceX, updateNativeCurves(session, graph));
    const viewportSignature = JSON.stringify(graph.viewport);
    if (viewportSignature !== session.viewportSignature) {
      updateGrid(session, graph.viewport);
      session.viewportSignature = viewportSignature;
    }
    for (const id of ['trace', ...graphColors.keys()]) {
      const rows = raster.get(String(id));
      cls('graph_layer_' + id, 'Hidden', !rows);
      rows?.forEach((value, row) => text(`graph_pixels_${id}_${row}`, value));
    }
    session.graphSignature = signature;
  }

  const badgeColors = session.badgeColors ??= [];
  for (let index = 0; index < graphListSize; index += 1) {
    const expression = graph.expressions[index];
    cls('graph_row_' + index, 'Hidden', !expression);
    cls('graph_row_' + index, 'Active', index === graph.activeExpressionIndex);
    cls('graph_styling_' + index, 'Hidden', !expression || session.graphStyle !== index);
    if (!expression) continue;
    const hasPlot = !!expression.plottedValue.trim();
    const badge = 'graph_visibility_' + index;
    const color = 'Color' + Math.max(0, graphColors.indexOf(expression.color));
    if (badgeColors[index] !== color) {
      if (badgeColors[index]) cls(badge, badgeColors[index], false);
      cls(badge, color, true);
      badgeColors[index] = color;
    }
    cls(badge, 'EmptyBadge', !hasPlot);
    cls(badge, 'Inactive', !expression.visible);
    cls('graph_actions_' + index, 'Hidden', !hasPlot);
    cls('graph_row_' + index, 'Invalid', expression.error);
    text('graph_line_' + index + '_label', t('graph.lineStyle.' + expression.lineStyle));
    const cursor = graph.activeExpressionSelectionStart;
    const editing = index === graph.activeExpressionIndex && expression.value !== expression.plottedValue;
    const content = editing
      ? formatExpressionText(expression.value.slice(0, cursor)) + '│' + formatExpressionText(expression.value.slice(cursor))
      : formatExpressionText(expression.value);
    cls('graph_entry_' + index, 'Placeholder', !content);
    text('graph_entry_' + index + '_label', content || t('graph.enterExpression'));
  }
  text('graph_options_title', t('graph.options'));
  cls('graph_options_panel', 'Hidden', !graph.settingsOpen);
  cls('graph_trace_zones', 'Hidden', !graph.tracingEnabled);
  cls('graph_trace_toggle', 'Selected', graph.tracingEnabled);
  for (const [bound, value] of Object.entries({ xMin, xMax, yMin, yMax })) {
    text('graph_bound_' + bound + '_label', `${t('graph.' + bound)}   ${round(value)}`);
  }
  text('graph_angle_label', graph.angle);
  text('graph_thickness_label', `${t('graph.lineThickness')}  ${graph.lineThickness}`);
  text('graph_theme_label', t('graph.theme') + ' ▾');
  for (const [id, term] of [['trig', 'trigonometry'], ['inequality', 'inequalities'], ['function', 'function']]) {
    text('graph_group_' + id + '_label', t('graph.groups.' + term) + ' ▾');
  }
  cls('graph_menu', 'Hidden', !session.graphMenu);
  cls('graph_hyp', 'Hidden', session.graphMenu !== 'trig');
  cls('graph_hyp', 'Selected', graph.trigHyperbolic);
  cls('graph_key_0', 'Selected', graph.trigShifted);
  const functions = graphFunctions(session, graph);
  for (let index = 0; index < 6; index += 1) {
    cls('graph_function_' + index, 'Hidden', !functions[index]);
    text('graph_function_' + index + '_label', functions[index]?.[0] ?? '');
  }
  const curve = session.traceX !== null && active.visible && active.plottedValue
    ? parseCurve(active.plottedValue, graph.angle) : null;
  const traceValue = curve?.evaluate(session.traceX) ?? null;
  const [x, y] = curve?.axis === 'x' ? [traceValue, session.traceX] : [session.traceX, traceValue];
  text('graph_trace', traceValue === null ? '' : `x = ${round(x)}    y = ${round(y)}`);
  cls('graph_trace', 'Hidden', traceValue === null);
  cls('graph_analysis', 'Hidden', !graph.analysisData);
  cls('graph_editor_controls', 'Hidden', !!graph.analysisData);
  text('graph_analysis_close_label', t('graph.backToFunctionList'));
  if (graph.analysisData) {
    const data = graph.analysisData;
    text('graph_analysis_title', data.expressionDisplay ?? formatExpressionText(active.value));
    text('graph_analysis_error', data.error ?? '');
    for (let index = 0; index < 13; index += 1) {
      const item = data.items?.[index];
      const values = item?.rows?.map(({ expression, direction }) => `${expression}: ${direction}`) ?? item?.values;
      cls('graph_analysis_row_' + index, 'Hidden', !item);
      text('graph_analysis_row_' + index, item ? `${item.title}    ${values?.join('  ·  ') ?? ''}` : '');
    }
  }
}

function select(index) {
  selectGraphExpression(clamp(index, 0, state.graphing.expressions.length - 1));
  const expression = state.graphing.expressions[state.graphing.activeExpressionIndex];
  state.graphing.activeExpressionSelectionStart = expression.value.length;
  state.graphing.activeExpressionSelectionEnd = expression.value.length;
  closeGraphExpressionAnalysis();
}

function graphKey(value) {
  const graph = state.graphing;
  const expression = graph.expressions[graph.activeExpressionIndex];
  if (value === 'plot') {
    commitGraphExpression(graph.activeExpressionIndex);
    if (graph.expressions.length > graphListSize) graph.expressions.pop();
  } else if (value === 'clear') clearGraphExpression();
  else if (value === 'backspace') backspaceGraphExpression();
  else if (value === ')' && expression.value[graph.activeExpressionSelectionStart] === ')') moveCursor(1);
  else if (expression.value.length + value.length <= maxExpressionLength) {
    insertGraphToken(value);
  }
  closeGraphExpressionAnalysis();
}

function moveCursor(direction) {
  const graph = state.graphing;
  const length = graph.expressions[graph.activeExpressionIndex].value.length;
  const cursor = clamp((graph.activeExpressionSelectionStart ?? length) + direction, 0, length);
  graph.activeExpressionSelectionStart = cursor;
  graph.activeExpressionSelectionEnd = cursor;
}

export function plotGraphExpression(source) {
  if (!source.trim() || source.length > maxExpressionLength) return;
  setGraphExpression(state.graphing.activeExpressionIndex, source.trim());
  graphKey('plot');
  select(state.graphing.activeExpressionIndex);
}

export function clickGraph(session, id) {
  const graph = state.graphing;
  const { xMin, xMax, yMin, yMax } = graph.viewport;
  const row = /^graph_(entry|visibility|remove|color|style|line|analyze|cursor_left|cursor_right)_(\d+)$/.exec(id);
  const key = /^graph_key_(\d+)$/.exec(id);
  const fn = /^graph_function_(\d+)$/.exec(id);
  const zone = /^graph_trace_zone_(\d+)$/.exec(id);
  if (id === 'graph_view_graph' || id === 'graph_view_editor') {
    setGraphMobileView(id.slice(11));
  } else if (row) {
    const action = row[1];
    const index = Number(row[2]);
    const expression = graph.expressions[index];
    if (!expression) return;
    if (index !== graph.activeExpressionIndex || action === 'entry') select(index);
    if (action === 'visibility' && expression.plottedValue.trim()) toggleGraphExpressionVisibility(index);
    else if (action === 'remove') {
      removeGraphExpression(index);
      session.graphStyle = null;
    } else if (action === 'color') {
      setGraphExpressionColor(index, graphColors[(graphColors.indexOf(expression.color) + 1) % graphColors.length]);
    } else if (action === 'style') session.graphStyle = session.graphStyle === index ? null : index;
    else if (action === 'line') {
      setGraphExpressionLineStyle(index, lineStyles[(lineStyles.indexOf(expression.lineStyle) + 1) % lineStyles.length]);
    } else if (action === 'analyze' && expression.value.trim()) {
      graphKey('plot');
      const source = expression.plottedValue.replace(/^\s*y\s*=\s*/, '');
      globalThis.nerdamer = nerdamer;
      graph.analysisData = analyzeGraphExpression(source, graph.angle);
      graph.analysisExpressionIndex = index;
      setGraphMobileView('editor');
    } else if (action === 'cursor_left' || action === 'cursor_right') moveCursor(action.endsWith('left') ? -1 : 1);
  } else if (key && graphKeys[Number(key[1])]) {
    const value = graphKeys[Number(key[1])].value;
    if (value === 'shift') graph.trigShifted = !graph.trigShifted;
    else graphKey(value);
  } else if (fn) {
    const token = graphFunctions(session, graph)[Number(fn[1])]?.[1];
    if (token) graphKey(session.graphMenu === 'inequality' ? token : token + '()');
    session.graphMenu = null;
  } else if (id.startsWith('graph_group_')) {
    const group = id.slice(12);
    session.graphMenu = session.graphMenu === group ? null : group;
  } else if (id === 'graph_hyp') graph.trigHyperbolic = !graph.trigHyperbolic;
  else if (id === 'graph_options') graph.settingsOpen = !graph.settingsOpen;
  else if (id === 'graph_trace_toggle') {
    graph.tracingEnabled = !graph.tracingEnabled;
    session.traceX = null;
  } else if (zone && graph.tracingEnabled) {
    const ratio = clamp(Number(zone[1]) / (graphTraceZones - 1), 0, 1);
    session.traceX = xMin + (xMax - xMin) * ratio;
  } else if (id === 'graph_thickness') graph.lineThickness = graph.lineThickness % 4 + 1;
  else if (id === 'graph_angle') graph.angle = angles[(angles.indexOf(graph.angle) + 1) % angles.length];
  else if (id === 'graph_analysis_close') closeGraphExpressionAnalysis();
  else if (id === 'graph_reset') {
    resetGraphViewport();
    session.traceX = null;
  } else if (id === 'graph_zoom_in' && xMax - xMin > 0.001) zoomGraph('in');
  else if (id === 'graph_zoom_out' && xMax - xMin < 1000000) zoomGraph('out');
  else if (id === 'graph_left') panGraph((xMin - xMax) / 5, 0);
  else if (id === 'graph_right') panGraph((xMax - xMin) / 5, 0);
  else if (id === 'graph_up') panGraph(0, (yMax - yMin) / 5);
  else if (id === 'graph_down') panGraph(0, (yMin - yMax) / 5);
}
