import { Console, CustomHudLayout, Instance } from 'cs_script/point_script';
import { CONVERTER_MODE_TO_CATEGORY, getCurrencyDetails, getModeMeta, getUnitLabel } from '../scripts/config.js';
import { t } from '../scripts/i18n.js';
import {
  applyCalculatorValue, commitConverterHistory, commitDateHistory, computeDateResults, formatBigInt,
  getConverterDisplayValue, getProgrammerBitValue, getProgrammerCurrentValue,
  getProgrammerWordSizeBits, getUnitsForCategory, handleAction, handleConverterKeypad,
  handleMemoryOperation, isProgrammerDigitAllowed, recallHistory, recallMemory,
  resetConverterUnits, setConverterActiveField, syncConverterValues, updateMemoryItem,
} from '../scripts/logic.js';
import {
  getHistoryCollection, getMemoryCollection, hydrateState, persistCollections,
  replaceHistoryCollection, replaceMemoryCollection, state,
} from '../scripts/state.js';
import { formatExpressionText, formatNumber } from '../scripts/utils.js';
import { formatShortDate } from '../scripts/Views/DateCalculator.js';
import { getConverterReferenceEntries } from '../scripts/Views/UnitConverter.js';
import { useCollections } from './browser-compat.js';
import {
  bases, bitwiseKeys, collectionSize, converterKeypad, currencyKeypad, keys, memoryKeys, modes, navigationGroups,
  scienceKeys, scienceMenu, scientificShift,
} from './layout-data.js';
import { clickGraph, plotGraphExpression, updateGraphHud } from './native-graph.js';
import {
  clickOptions, editDateField, editGraphBounds, openGraphTheme, openUnitPicker, selectTheme,
  toggleCryptoCurrencies, updateOptionsHud, useCalculatorLanguage,
} from './native-options.js';

const initialState = JSON.stringify(state);
const sessions = new Map();
const dateFields = {
  difference: ['from', 'to'],
  shift: ['baseDate', 'years', 'months', 'days'],
};
const dateGroup = () => state.date.mode === 'difference' ? 'difference' : 'shift';
const dateLabel = (field) => t('date.' + (field === 'baseDate' ? 'from' : field));
const views = ['standard', 'scientific', 'programmer', 'date', 'converter', 'graphing', 'settings'];
const calculatorModes = Object.keys(keys);
const activeHud = () => {
  const layout = Instance.FindEntitiesByName('calculator_hud')[0];
  return layout instanceof CustomHudLayout ? layout : undefined;
};

function withSession(session, action) {
  Object.assign(state, session.state);
  useCollections(session.storage);
  useCalculatorLanguage();
  try {
    return action();
  } finally {
    session.state = { ...state };
  }
}

function updateHud(session) {
  const { port, collectionType } = session;
  const { text, cls } = port;
  const mode = state.mode;
  const view = views.includes(mode) ? mode : 'converter';
  const calc = keys[mode] && state[mode];
  const memory = getMemoryCollection();
  const history = getHistoryCollection();
  const collection = collectionType === 'memory' ? memory : history;

  text('mode_title', getModeMeta(mode).label);
  updateOptionsHud(session);
  cls('root', 'Hidden', !session.open);
  cls('mode_menu', 'Hidden', !session.navigation);
  cls('navigation', 'Hidden', mode === 'settings');
  cls('settings_back', 'Hidden', mode !== 'settings');
  for (const group of navigationGroups) text('navigation_group_' + group.key, t('navigation.groups.' + group.key).toUpperCase());
  for (const item of modes) cls('mode_' + item, 'Selected', item === mode);
  for (const name of views) cls('view_' + name, 'Hidden', view !== name);
  const hasCollections = mode !== 'graphing' && mode !== 'settings';
  cls('collections', 'Hidden', !hasCollections);
  cls('collections', 'DrawerOpen', session.collectionsOpen === true);
  cls('collections_open', 'Hidden', !hasCollections);
  cls('collections_open', 'Selected', session.collectionsOpen === true);
  cls('graph_view_tabs', 'Hidden', mode !== 'graphing');
  cls('collection_memory', 'Hidden', !calc);
  cls('collection_memory', 'Selected', collectionType === 'memory');
  cls('collection_history', 'Selected', collectionType === 'history');
  cls('clear_history', 'Hidden', !collection.length);
  cls('collection_empty', 'Hidden', !!collection.length);
  text('collection_empty', collection.length ? '' : collectionType === 'history'
    ? t('history.empty') : t('memory.empty'));
  for (let i = 0; i < collectionSize; i += 1) {
    const item = collection[i];
    cls('collection_row_' + i, 'Hidden', !item);
    cls('memory_controls_' + i, 'Hidden', collectionType !== 'memory');
    if (!item) continue;
    cls('collection_expression_' + i, 'Hidden', collectionType === 'memory');
    text('collection_expression_' + i, formatExpressionText(item.expression));
    text('collection_entry_' + i, collectionType === 'memory' ? item.value : item.result);
  }

  if (calc) {
    text(mode + '_expression', formatExpressionText(calc.expression));
    text(mode + '_display', calc.display);
    cls(mode + '_display', 'Long', calc.display.length > 22);
    if (mode !== 'programmer') {
      for (const index of [0, 1]) cls(mode + '_memory_' + index, 'Inactive', !memory.length);
    }
  }
  if (mode === 'scientific') {
    text('science_0_label', calc.angle);
    cls('science_1', 'Selected', calc.isExponentialFormat);
    text('science_2_label', t('calculator.scientific.trigonometry') + ' ▾');
    text('science_3_label', t('calculator.scientific.function') + ' ▾');
    cls('scientific_key_0', 'Selected', calc.isShifted);
    text('scientific_key_3_label', hasEntry(calc) ? 'CE' : 'C');
    for (const [index, key] of Object.entries(scientificShift)) {
      text('scientific_key_' + index + '_label', calc.isShifted ? key.label : keys.scientific.flat()[index].label);
    }
    cls('science_options', 'Hidden', !calc.openMenu);
    cls('science_options', 'FunctionMenu', calc.openMenu === 'function');
    cls('science_hyp', 'Hidden', calc.openMenu !== 'trig');
    cls('science_hyp', 'Selected', calc.isHyperbolic);
    cls('science_shift', 'Hidden', calc.openMenu !== 'trig');
    cls('science_shift', 'Selected', calc.isShifted);
    for (const [index, pair] of activeScienceOptions(calc).entries()) text('science_option_' + index + '_label', pair[0]);
  }
  if (mode === 'programmer') {
    const value = getProgrammerCurrentValue();
    const bitCount = getProgrammerWordSizeBits();
    text('programmer_key_3_label', hasEntry(calc) ? 'CE' : 'C');
    text('programmer_word_label', calc.wordSize);
    text('programmer_bitwise_label', t('programmer.bitwise') + ' ▾');
    text('programmer_shift_label', t('programmer.bitShift') + ' ▾');
    cls('programmer_bitwise_menu', 'Hidden', session.programmerMenu !== 'bitwise');
    cls('programmer_shift_menu', 'Hidden', session.programmerMenu !== 'shift');
    cls('programmer_keys_open', 'Selected', !calc.isBitFlipChecked);
    cls('programmer_bits_open', 'Selected', calc.isBitFlipChecked);
    cls('programmer_bits', 'Hidden', !calc.isBitFlipChecked);
    cls('programmer_keys', 'Hidden', calc.isBitFlipChecked);
    for (const base of bases) {
      text('base_' + base + '_label', formatBigInt(value, base));
      cls('base_' + base, 'Selected', calc.base === base);
    }
    if (calc.isBitFlipChecked) {
      for (let start = 63; start > 0; start -= 4) cls('bit_group_' + start, 'Hidden', start >= bitCount);
      for (let bit = 0; bit < 64; bit += 1) {
        if (bit >= bitCount) continue;
        const value = getProgrammerBitValue(bit);
        cls('bit_' + bit, 'On', !!Number(value));
        text('bit_' + bit + '_label', value);
      }
    } else {
      for (const [index, key] of keys.programmer.flat().entries()) {
        cls('programmer_key_' + index, 'Inactive',
          key.action === 'noop' || (key.action === 'digit' && !isProgrammerDigitAllowed(key.value, calc.base)));
      }
    }
  }
  if (view === 'converter') {
    const currency = state.converter.category === 'Currency';
    cls('conversion_fields', 'Currency', currency);
    cls('conversion_fields', 'UnitConversion', !currency);
    for (const field of ['from', 'to']) {
      const unit = state.converter[field + 'Unit'];
      const metadata = currency ? getCurrencyDetails(unit) : null;
      text('unit_' + field + '_label', metadata?.label ?? getUnitLabel(unit));
      text('value_' + field + '_label', getConverterDisplayValue(field));
      cls('value_' + field, 'ActiveAmount', state.converter.lastEdited === field);
      cls('currency_symbol_' + field, 'Hidden', !currency);
      cls('currency_meta_' + field, 'Hidden', !currency);
      if (metadata) {
        text('currency_symbol_' + field, metadata.symbol);
        text('currency_meta_' + field, metadata.code === metadata.symbol ? metadata.code : `${metadata.code} · ${metadata.symbol}`);
      }
    }
    cls('currency_crypto', 'Hidden', !currency);
    cls('currency_crypto', 'On', !!state.converter.includeCryptocurrencies);
    cls('converter_keys', 'Hidden', currency);
    cls('currency_keys', 'Hidden', !currency);
    cls('currency_timestamp', 'Hidden', !currency);
    cls('currency_status', 'Hidden', !currency);
    text('currency_crypto_label', t('converter.currency.includeCryptocurrencies'));
    cls('converter_reference_label', 'Hidden', currency);
    text('converter_reference_label', t('converter.aboutEqualTo'));
    const options = getUnitsForCategory(state.converter.category);
    const from = options.find(({ name }) => name === state.converter.fromUnit);
    const to = options.find(({ name }) => name === state.converter.toUnit);
    if (currency && from && to) {
      text('converter_reference', `1 ${from.symbol} = ${formatNumber(to.fromBase(from.toBase(1))).replace('.', ',')} ${to.symbol}`);
      text('currency_timestamp', t('converter.currency.updated', { timestamp: state.converter.currencyUpdatedAt }));
      text('currency_status', t('converter.currency.status.mockNote'));
    } else {
      const reference = getConverterReferenceEntries(options);
      cls('converter_reference_label', 'Hidden', !reference.length);
      text('converter_reference', reference.map(({ value, symbol }) => `${value} ${symbol}`).join('   '));
    }
  }
  if (mode === 'date') {
    const group = dateGroup();
    text('date_mode_toggle_label', t('date.mode.' + group));
    cls('date_mode_menu', 'Hidden', !state.date.openModeMenu);
    for (const id of dateFields[dateGroup()]) {
      text('date_field_' + id, dateLabel(id));
      text('date_edit_' + id + '_label', typeof state.date[id] === 'string'
        ? formatShortDate(state.date[id]) : state.date[id]);
    }
    for (const name of Object.keys(dateFields)) {
      cls('date_' + name, 'Hidden', group !== name);
      cls('date_mode_' + name, 'Selected', group === name);
      text('date_mode_' + name + '_label', t('date.mode.' + name));
    }
    for (const name of ['add', 'subtract']) {
      cls('date_mode_' + name, 'Checked', name === state.date.operation);
      text('date_mode_' + name + '_label', t('date.' + name));
    }
    text('date_result_title', t(group === 'difference' ? 'date.results.difference' : 'date.results.date'));
    text('date_result', state.date.result?.summary ?? '');
    text('date_detail', state.date.result?.detail ?? '');
  }
  if (mode === 'graphing') updateGraphHud(session);
}

function hasEntry(calc) {
  return calc.error || calc.expression.trim() || calc.display !== '0';
}

function activeScienceOptions(calc) {
  if (calc.openMenu === 'function') return scienceMenu[4];
  return scienceMenu[Number(calc.isShifted) + 2 * Number(calc.isHyperbolic)];
}

function setMode(session, mode) {
  session.navigation = false;
  session.collectionsOpen = false;
  session.collectionType = 'history';
  session.programmerMenu = null;
  if (mode === state.mode) return;
  if (mode !== 'settings') state.lastNonSettingsMode = mode;
  state.mode = mode;
  if (mode === 'date') computeDateResults();
  if (Object.hasOwn(CONVERTER_MODE_TO_CATEGORY, mode)) {
    state.converter.category = CONVERTER_MODE_TO_CATEGORY[mode];
    resetConverterUnits();
    syncConverterValues('from');
  }
}

function clickDate(session, id) {
  if (id === 'date_mode_toggle') {
    state.date.openModeMenu = !state.date.openModeMenu;
    return;
  }
  if (id.startsWith('date_edit_')) {
    const field = id.slice(10);
    if (dateFields[dateGroup()].includes(field)) editDateField(session, field, dateLabel(field));
    return;
  }
  if (!id.startsWith('date_mode_')) return;
  const option = id.slice(10);
  if (option === 'difference' || option === 'shift') state.date.mode = option;
  else if (option === 'add' || option === 'subtract') state.date.operation = option;
  state.date.openModeMenu = false;
  computeDateResults();
  commitDateHistory();
}

function clickConverter(session, id) {
  if (id.startsWith('value_')) setConverterActiveField(id.slice(6));
  if (id === 'unit_from' || id === 'unit_to') openUnitPicker(session, id.slice(5));
  if (id === 'currency_crypto') {
    toggleCryptoCurrencies();
    commitConverterHistory();
  }
  const match = /^(converter|currency)_key_(\d+)$/.exec(id);
  const key = match && (match[1] === 'currency' ? currencyKeypad : converterKeypad).flat()[Number(match[2])];
  if (key) {
    handleConverterKeypad(key.action, key.value);
    commitConverterHistory();
  }
}

function clickCalculator(session, mode, id) {
  const calc = state[mode];
  const index = Number(id.split('_').at(-1));
  if (id.startsWith(mode + '_key_')) {
    const normal = keys[mode].flat()[index];
    if (!normal) return;
    const key = mode === 'scientific' && calc.isShifted ? scientificShift[index] ?? normal : normal;
    if (mode === 'scientific' && index === 0) handleAction('toggle-shift');
    else if (mode !== 'standard' && index === 3) handleAction(hasEntry(calc) ? 'clear-entry' : 'clear-all');
    else handleAction(key.action, key.value);
  } else if (id.startsWith(mode + '_memory_') && memoryKeys[index]) {
    if (index === 0) {
      replaceMemoryCollection([]);
      persistCollections();
    } else handleMemoryOperation(memoryKeys[index][1]);
  } else if (mode === 'scientific') {
    if (id === 'science_hyp') handleAction('toggle-scientific-hyp');
    else if (id === 'science_shift') handleAction('toggle-shift');
    else if (id.startsWith('science_option_') && calc.openMenu) {
      const option = activeScienceOptions(calc)[index];
      if (option) handleAction('scientific-unary', option[1]);
    } else if (id.startsWith('science_') && scienceKeys[index]) {
      const [, action, value] = scienceKeys[index];
      handleAction(action, value);
    }
  } else if (mode === 'programmer') {
    if (id.startsWith('base_') && bases.includes(id.slice(5))) handleAction('set-base', id.slice(5));
    else if (id === 'programmer_word') handleAction('cycle-word-size');
    else if (id === 'programmer_keys_open') handleAction('set-programmer-view', 'keypad');
    else if (id === 'programmer_bits_open') handleAction('set-programmer-view', 'bitflip');
    else if (id === 'programmer_bitwise' || id === 'programmer_shift') {
      const menu = id.split('_')[1];
      session.programmerMenu = session.programmerMenu === menu ? null : menu;
    } else if (id === 'programmer_shift_left' || id === 'programmer_shift_right') {
      const [, , direction] = id.split('_');
      const operator = keys.programmer[0][direction === 'left' ? 1 : 2];
      handleAction(operator.action, operator.value);
      session.programmerMenu = null;
    }
    else if (id.startsWith('bit_') && calc.isBitFlipChecked && index >= 0 && index < getProgrammerWordSizeBits()) {
      handleAction('flip-bit', index);
    } else if (id.startsWith('bitwise_') && bitwiseKeys[index]) {
      const [, value] = bitwiseKeys[index];
      handleAction(value === 'not' ? 'programmer-unary' : 'operator', value);
      session.programmerMenu = null;
    }
  }
}

function clickCollection(session, id) {
  const index = Number(id.split('_').at(-1));
  const isMemory = session.collectionType === 'memory';
  if (id === 'collection_history' || id === 'collection_memory') {
    session.collectionType = id.slice(11);
  } else if (id === 'clear_history') {
    if (isMemory) replaceMemoryCollection([]);
    else replaceHistoryCollection([]);
    persistCollections();
  } else if (id.startsWith('collection_item_')) {
    if (isMemory) recallMemory(index);
    else recallHistory(index);
    session.collectionsOpen = false;
  } else if (isMemory && id.startsWith('memory_')) {
    updateMemoryItem(index, id.split('_')[1]);
  }
}

function calculatorSnapshot() {
  return {
    mode: state.mode,
    calculators: calculatorModes.map((mode) => ({
      mode,
      calculator: { ...state[mode] },
      history: getHistoryCollection(mode).map((item) => ({ ...item })),
      memory: getMemoryCollection(mode).map((item) => ({ ...item })),
    })),
  };
}

function trackCalculatorClick(session, id) {
  const before = calculatorSnapshot();
  if (id === 'undo' || id === 'redo') {
    const snapshot = session[id].pop();
    if (!snapshot) return;
    session[id === 'undo' ? 'redo' : 'undo'].push(before);
    setMode(session, snapshot.mode);
    for (const { mode, calculator, history, memory } of snapshot.calculators) {
      state[mode] = calculator;
      replaceHistoryCollection(history, mode);
      replaceMemoryCollection(memory, mode);
    }
    persistCollections();
  } else {
    clicked(session, id);
    rememberCalculatorChange(session, before);
  }
}

function rememberCalculatorChange(session, before) {
  if (state.mode !== before.mode) return;
  const serialize = (value) => JSON.stringify(value, (_key, item) =>
    typeof item === 'bigint' ? item.toString() + 'n' : item);
  if (serialize(before) === serialize(calculatorSnapshot())) return;
  session.undo.push(before);
  if (session.undo.length > 100) session.undo.shift();
  session.redo.length = 0;
}

function clicked(session, id) {
  if (id === 'close_map_ui') {
    session.open = false;
    session.editor = null;
    session.picker = null;
    session.calendar = null;
    session.document = null;
    session.collectionsOpen = false;
    session.port.capture(false);
    return;
  }
  if (clickOptions(session, id)) return;
  if (id === 'navigation') {
    session.navigation = !session.navigation;
    session.collectionsOpen = false;
  }
  else if (id === 'navigation_close' || id === 'navigation_scrim') session.navigation = false;
  else if (id === 'settings_back') setMode(session, state.lastNonSettingsMode);
  else if (id === 'collections_open') session.collectionsOpen = !session.collectionsOpen;
  else if (id === 'collections_close' || id === 'collections_scrim') session.collectionsOpen = false;
  else if (id.startsWith('mode_') && modes.includes(id.slice(5))) setMode(session, id.slice(5));
  else if (id.startsWith('collection_') || id.startsWith('memory_') || id === 'clear_history') clickCollection(session, id);
  else if (keys[state.mode]) clickCalculator(session, state.mode, id);
  else if (state.mode === 'date') clickDate(session, id);
  else if (state.mode === 'graphing') {
    if (id.startsWith('graph_bound_')) editGraphBounds(session, id.slice(12));
    else if (id === 'graph_theme') openGraphTheme(session);
    else clickGraph(session, id);
  } else if (state.mode !== 'settings') clickConverter(session, id);
}

let saved = {};
try {
  const data = JSON.parse(Instance.GetSaveData() || '{}');
  if (data && typeof data === 'object' && !Array.isArray(data)) saved = data;
} catch (error) {
  Console.Log('Roselt Calculator save read error: ' + error);
}

function save(session) {
  const record = JSON.stringify({ storage: [...session.storage] });
  if (saved[session.key] === record) return;
  saved[session.key] = record;
  try {
    Instance.SetSaveData(JSON.stringify(saved));
  } catch (error) {
    Console.Log('Roselt Calculator save write error: ' + error);
  }
}

function open(player) {
  if (!player || player.IsBot()) return;
  const slot = player.GetPlayerSlot();
  const hud = activeHud();
  if (!hud) return;
  let session = sessions.get(slot);
  if (!session) {
    const key = 'player:' + player.GetPlayerName();
    let record;
    try { record = JSON.parse(saved[key]); } catch { record = {}; }
    const storage = new Map(Array.isArray(record?.storage) ? record.storage : []);
    const cache = new Map();
    const change = (key, value, apply) => {
      if (cache.get(key) === value) return;
      apply(value);
      cache.set(key, value);
    };
    const port = {
      cls: (id, name, value) => change(id + ':' + name, value,
        (flag) => hud.SetHasClassForPlayer(slot, id, name, flag)),
      text: (id, value) => change(id + ':text', String(value),
        (text) => hud.SetDialogVariableStringForPlayer(slot, id, 'text', text)),
      capture: (value) => hud.SetInputCaptureEnabled(slot, value),
    };
    session = {
      key, port, storage, state: JSON.parse(initialState),
      open: true, navigation: false,
      traceX: null,
      undo: [], redo: [],
      collectionType: 'history',
    };
    sessions.set(slot, session);
    withSession(session, () => {
      hydrateState();
      if (record?.light && state.settings.theme === 'system') selectTheme('light');
    });
    Console.Log('Roselt Calculator HUD ready for ' + player.GetPlayerName());
  }
  session.open = true;
  session.port.capture(true);
  withSession(session, () => updateHud(session));
}

Instance.OnActivate(() => {
  for (const [name, value] of Object.entries({
    mp_team_intro_time: 0, mp_ignore_round_win_conditions: 1, mp_freezetime: 0,
    bot_quota: 0, mp_warmup_pausetimer: 1, mp_autoteambalance: 0,
  })) Console.SetConvar(name, value);
  Console.Log('Roselt Calculator map initialized');
  for (const player of Instance.GetAllPlayerControllers()) open(player);
});

Instance.OnPlayerActivate(({ player }) => {
  if (!player.IsBot()) player.JoinTeam(2);
  open(player);
});
Instance.OnPlayerDisconnect(({ playerSlot }) => sessions.delete(playerSlot));
Instance.OnPlayerChat(({ player, text }) => {
  if (player.IsBot()) return;
  if (/^[!/](calculator|calc)$/i.test(text.trim())) open(player);
  const shortcut = /^[!/](undo|redo|hidecalculator)$/i.exec(text.trim())?.[1]?.toLowerCase();
  const current = sessions.get(player.GetPlayerSlot());
  if (shortcut && current?.open) {
    withSession(current, () => {
      if (shortcut === 'hidecalculator') clicked(current, 'close_map_ui');
      else if (keys[state.mode]) trackCalculatorClick(current, shortcut);
      updateHud(current);
    });
    save(current);
  }
  const pasted = /^[!/]paste\s+(.+)$/i.exec(text.trim());
  if (pasted && current?.open) {
    withSession(current, () => {
      if (!keys[state.mode]) return;
      const before = calculatorSnapshot();
      if (!applyCalculatorValue(pasted[1])) return;
      rememberCalculatorChange(current, before);
      updateHud(current);
    });
    save(current);
  }
  const plot = /^[!/]plot\s+(.+)$/i.exec(text.trim());
  if (!plot) return;
  open(player);
  const session = sessions.get(player.GetPlayerSlot());
  if (!session) return;
  withSession(session, () => {
    session.picker = null;
    session.editor = null;
    session.calendar = null;
    setMode(session, 'graphing');
    plotGraphExpression(plot[1]);
    updateHud(session);
  });
});
Instance.OnCustomHudClicked(({ player, layout, buttonId }) => {
  const session = sessions.get(player.GetPlayerSlot());
  if (layout !== activeHud() || !session?.open) return;
  withSession(session, () => {
    if (keys[state.mode]) trackCalculatorClick(session, buttonId);
    else clicked(session, buttonId);
    updateHud(session);
  });
  save(session);
});
