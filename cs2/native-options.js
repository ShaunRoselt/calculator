import themeManifest from '../assets/themes/data/index.json';
import translations from 'calculator-native-languages';
import languageOptions from 'calculator-native-language-options';
import documents from 'calculator-native-documents';
import { APP_INFO, getCurrencyDetails, getCurrencyName, getModeMeta, getUnitLabel } from '../scripts/config.js';
import { getCurrentLocale, t, useLoadedTranslations } from '../scripts/i18n.js';
import { commitConverterHistory, commitDateHistory, computeDateResults, getUnitsForCategory, syncConverterValues } from '../scripts/logic.js';
import { persistLanguage, persistRepeatEquals, persistTheme, state } from '../scripts/state.js';
import { toDateInputValue } from '../scripts/utils.js';
import { getDatePickerCells } from '../scripts/Views/DateCalculator.js';
import { modes, pickerRows } from './layout-data.js';

const themes = themeManifest.themes.map(({ id, label }) => ({ value: id, label }));
const appThemes = [{ value: 'system', label: 'System', caption: themes.find(({ value }) => value === 'dark').label }, ...themes];
const settingsLanguages = () => languageOptions[state.settings.language] ?? languageOptions.en;
const english = translations.en;
const bounds = ['xMin', 'xMax', 'yMin', 'yMax'];
const localeLabels = {
  collection_history_label: 'history.title',
  collection_memory_label: 'memory.title',
};
const settingsTextKeys = {
  settings_preferences_title: 'settings.preferences.group',
  settings_preferences_description: 'settings.preferences.description',
  settings_about_heading: 'settings.about.group',
  settings_theme_title: 'settings.appearance.themeTitle',
  settings_theme_description: 'settings.appearance.themeDescription',
  settings_language_title: 'settings.language.title',
  settings_language_description: 'settings.language.description',
  settings_repeat_title: 'settings.calculation.repeatEqualsTitle',
  settings_repeat_description: 'settings.calculation.repeatEqualsDescription',
  settings_link_readme_label: 'settings.links.readme',
  settings_link_release_label: 'settings.links.releaseNotes',
  settings_link_license_label: 'settings.links.license',
  settings_link_feedback_label: 'settings.feedback',
};

let activeLanguage;
export function useCalculatorLanguage() {
  const language = Object.hasOwn(translations, state.settings.language) ? state.settings.language : 'en';
  if (language === activeLanguage) return;
  useLoadedTranslations(language, translations[language], english);
  activeLanguage = language;
}

function activeTheme() {
  return themes.some(({ value }) => value === state.settings.theme) ? state.settings.theme : 'dark';
}

const translated = (key, fallback) => {
  const label = t(key);
  return label === key ? fallback : label;
};

const uiDefaults = {
  collection_history_label: 'History',
  collection_memory_label: 'Memory',
};

function setPicker(session, title, options, choose, kind = '') {
  session.picker = { title, options, choose, page: 0, query: '', kind };
}

function pickerOptions(picker) {
  if (!picker.query) return picker.options;
  const query = picker.query.toLowerCase();
  return picker.options.filter(({ label, value, meta, searchText }) =>
    (searchText ?? `${label} ${value} ${meta ?? ''}`).toLowerCase().includes(query));
}

function isUnitPicker(kind) {
  return /^(Currency|Unit)(From|To)$/.test(kind);
}

function isSettingsPicker(kind) {
  return kind === 'themes' || kind === 'language';
}

export function openUnitPicker(session, field) {
  const converter = state.converter;
  const currency = converter.category === 'Currency';
  const options = getUnitsForCategory(converter.category).map((unit) => {
    if (!currency) return { value: unit.name, label: getUnitLabel(unit.name) };
    const { code, symbol, type } = getCurrencyDetails(unit.name);
    const suffix = type === 'crypto' ? t('converter.currency.cryptocurrency') : symbol;
    return { value: unit.name, label: getCurrencyName(unit.name), meta: !suffix || suffix === code ? code : `${code} · ${suffix}` };
  });
  setPicker(session, field === 'from' ? 'Convert from' : 'Convert to', options, (selected) => {
    converter[field + 'Unit'] = selected;
    converter.converterKeyboardField = field;
    syncConverterValues(field);
    commitConverterHistory();
  }, (currency ? 'Currency' : 'Unit') + (field === 'from' ? 'From' : 'To'));
  session.picker.selected = converter[field + 'Unit'];
}

export function toggleCryptoCurrencies() {
  const converter = state.converter;
  converter.includeCryptocurrencies = !converter.includeCryptocurrencies;
  const choices = getUnitsForCategory('Currency');
  for (const [index, field] of ['fromUnit', 'toUnit'].entries()) {
    if (!choices.some(({ name }) => name === converter[field])) converter[field] = choices[index].name;
  }
  syncConverterValues(converter.lastEdited);
}

export function updateOptionsHud(session) {
  const { text, cls } = session.port;
  const theme = activeTheme();
  if (theme !== session.displayedTheme) {
    if (session.displayedTheme) cls('root', 'Theme_' + session.displayedTheme, false);
    cls('root', 'Theme_' + theme, true);
    cls('root', 'Light', theme === 'light');
    session.displayedTheme = theme;
  }

  for (const mode of modes) text('mode_' + mode + '_label', getModeMeta(mode).label);
  for (const [id, key] of Object.entries(localeLabels)) text(id, translated(key, uiDefaults[id]));
  if (state.mode === 'settings') {
    const themeLabel = state.settings.theme === 'system' ? t('settings.appearance.system') : themes.find(({ value }) => value === theme).label;
    const languageLabel = settingsLanguages().find(({ value }) => value === state.settings.language)?.label ?? 'English';
    for (const [id, key] of Object.entries(settingsTextKeys)) text(id, t(key));
    for (const group of ['preferences', 'about']) {
      const expanded = session.settingsSections?.[group] ?? true;
      cls('settings_body_' + group, 'Hidden', !expanded);
      text('settings_' + group + '_caret', expanded ? '⌃' : '⌄');
    }
    text('settings_theme_label', themeLabel);
    text('settings_language_label', languageLabel);
    cls('settings_theme', 'Open', session.picker?.kind === 'themes');
    cls('settings_language', 'Open', session.picker?.kind === 'language');
    text('settings_repeat_label', state.settings.repeatEquals ? t('settings.calculation.enabled') : t('settings.calculation.disabled'));
    cls('settings_repeat', 'On', state.settings.repeatEquals);
    text('settings_about_title', APP_INFO.name);
    text('settings_about_description', APP_INFO.version);
    text('settings_link_source_label', `${t('settings.contribute.prefix')} ${t('settings.contribute.link')} ${t('settings.contribute.suffix')}`);
  }
  cls('settings_document', 'Hidden', !session.document);
  if (session.document) {
    text('document_title', session.document.title);
    for (let index = 0; index < 60; index += 1) {
      const line = session.document.lines[index];
      cls('document_line_' + index, 'Hidden', line === undefined);
      if (line !== undefined) text('document_line_' + index, line || ' ');
    }
  }
  cls('option_picker', 'Hidden', !session.picker);
  if (session.picker) {
    const { title, page, query, kind } = session.picker;
    const options = pickerOptions(session.picker);
    const themed = kind === 'themes';
    const setting = isSettingsPicker(kind);
    const unit = isUnitPicker(kind);
    const currency = kind.startsWith('Currency');
    const scrollList = unit || kind === 'language';
    const searchLabel = themed ? t('settings.appearance.searchThemes') : setting ? t('settings.language.search') : t('converter.currency.search');
    cls('option_picker', 'ThemePicker', themed);
    cls('option_picker', 'SearchOpen', !!session.picker.showKeyboard);
    cls('option_picker', 'SettingsPicker', setting);
    cls('picker_gallery', 'Hidden', !themed || !options.length);
    cls('picker_list', 'Hidden', themed || scrollList);
    cls('picker_scroll_list', 'Hidden', !scrollList || !options.length);
    cls('picker_empty', 'Hidden', !(setting || unit) || !!options.length);
    cls('picker_pagination', 'Hidden', setting || unit);
    cls('option_picker', 'UnitPickerOverlay', unit);
    cls('option_picker', 'CurrencyPicker', currency);
    cls('option_picker', 'ToPicker', kind.endsWith('To'));
    text('picker_title', title);
    cls('picker_title', 'Hidden', unit || setting);
    cls('picker_search_toggle', 'Hidden', !currency && !setting);
    text('picker_search_toggle_label', query || searchLabel);
    cls('picker_search', 'Hidden', setting || unit ? !session.picker.showKeyboard : session.picker.options.length <= pickerRows * 2);
    text('picker_filter', query || searchLabel);
    if ((setting || unit) && !options.length) text('picker_empty', t('settings.menus.noMatches'));
    if (scrollList) {
      updateScrollOptions(session, options);
    } else if (themed) {
      updateThemeOptions(session, options);
    } else {
      const pages = Math.max(1, Math.ceil(options.length / pickerRows));
      text('picker_page', options.length ? `${page + 1} / ${pages}` : t('settings.menus.noMatches'));
      cls('picker_prev', 'Inactive', page === 0);
      cls('picker_next', 'Inactive', page + 1 === pages);
      for (let index = 0; index < pickerRows; index += 1) {
        const option = options[page * pickerRows + index];
        const optionId = 'picker_option_' + index;
        cls(optionId, 'EmptyOption', !option);
        cls(optionId, 'Selected', !!option && option.value === session.picker.selected);
        text(optionId + '_label', option?.value === 'system' ? t('settings.appearance.system') : option?.label ?? '');
      }
    }
  }
  cls('number_editor', 'Hidden', !session.editor);
  if (session.editor) {
    text('editor_title', session.editor.title);
    text('editor_value', session.editor.value || '…');
    text('editor_error', session.editor.error);
  }
  cls('date_calendar', 'Hidden', !session.calendar);
  if (session.calendar) {
    const { field, month } = session.calendar;
    cls('date_calendar', 'To', field === 'to');
    const monthFormat = new Intl.DateTimeFormat(getCurrentLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
    text('calendar_month', monthFormat.format(month));
    for (const [index, cell] of getDatePickerCells(month, state.date[field]).entries()) {
      const id = 'calendar_cell_' + index;
      text(id + '_label', cell.day);
      cls(id, 'Inactive', cell.outside);
      cls(id, 'Selected', cell.selected);
      cls(id, 'Today', cell.today);
    }
  }
}

function updateScrollOptions(session, options) {
  const { cls, text } = session.port;
  const count = Math.max(options.length, session.visibleScrollOptions ?? 0);
  for (let index = 0; index < count; index += 1) {
    const option = options[index];
    const id = 'scroll_option_' + index;
    cls(id, 'Hidden', !option);
    if (!option) continue;
    cls(id, 'Selected', option.value === session.picker.selected);
    text(id + '_label', option.label);
    cls('scroll_option_meta_' + index, 'Hidden', !option.meta);
    if (option.meta) text('scroll_option_meta_' + index, option.meta);
  }
  session.visibleScrollOptions = options.length;
}

function updateThemeOptions(session, options) {
  const { cls, text } = session.port;
  const previous = session.previousPreviews ??= [];
  const count = Math.max(options.length, session.visibleThemeOptions ?? 0);
  for (let index = 0; index < count; index += 1) {
    const option = options[index];
    const id = 'theme_option_' + index;
    cls(id, 'Hidden', !option);
    if (!option) continue;
    cls(id, 'Selected', option.value === session.picker.selected);
    text(id + '_label', option.value === 'system' ? t('settings.appearance.system') : option.label);
    cls('theme_caption_' + index, 'Hidden', !option.caption);
    if (option.caption) text('theme_caption_' + index, option.caption);
    const preview = 'Preview_' + (option.value === 'system' ? 'dark' : option.value);
    if (preview !== previous[index]) {
      if (previous[index]) cls('picker_preview_' + index, previous[index], false);
      cls('picker_preview_' + index, preview, true);
      previous[index] = preview;
    }
  }
  session.visibleThemeOptions = options.length;
}

function numberEditor(session, title, initialValue, parse, apply, error) {
  session.editor = { title, value: String(initialValue), parse, apply, error: '', invalid: error };
}

function parseDate(value) {
  if (!/^\d{8}$/.test(value)) return null;
  const result = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
  const date = new Date(result + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === result && value.slice(0, 4) !== '0000'
    ? result : null;
}

export function editDateField(session, field, label) {
  const value = state.date[field];
  if (typeof value === 'string') {
    session.calendar = { field, label, month: new Date(value.slice(0, 7) + '-01T00:00:00Z') };
  } else editDateNumber(session, field, label);
}

function applyDate(field, result) {
  state.date[field] = result;
  computeDateResults();
  commitDateHistory();
}

function editDateNumber(session, field, label) {
  const value = state.date[field];
  const isDate = typeof value === 'string';
  const parse = isDate ? parseDate : (raw) => /^\d{1,4}$/.test(raw) ? Number(raw) : null;
  numberEditor(session, isDate ? label + ' (YYYYMMDD)' : label, isDate ? value.replace(/-/g, '') : value,
    parse, (result) => applyDate(field, result),
    isDate ? 'Enter a valid date as YYYYMMDD.' : 'Enter a whole number from 0 to 9999.');
}

export function openGraphTheme(session) {
  setPicker(session, t('graph.theme'), [{ value: 'match-app', label: t('graph.matchAppTheme') }, ...themes], (theme) => {
    state.graphing.theme = theme;
  });
}

export function editGraphBounds(session, field) {
  if (bounds.includes(field)) {
    const viewport = state.graphing.viewport;
    const parse = (value) => {
      if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) return null;
      const number = Number(value);
      const newViewport = { ...viewport, [field]: number };
      return Math.abs(number) <= 1000000 && newViewport.xMax - newViewport.xMin >= 0.001 &&
        newViewport.yMax - newViewport.yMin >= 0.001 ? number : null;
    };
    numberEditor(session, t('graph.' + field), viewport[field], parse, (number) => {
      viewport[field] = number;
      state.graphing.isManualAdjustment = true;
    }, 'Enter a finite value that keeps minimum below maximum.');
  }
}

export function selectTheme(id) {
  if (!appThemes.some(({ value }) => value === id)) return;
  state.settings.theme = id;
  persistTheme();
}

export function clickOptions(session, id) {
  if (session.document) {
    if (id === 'document_close') session.document = null;
    return true;
  }
  if (session.picker) {
    const picker = session.picker;
    const options = pickerOptions(picker);
    if (id === 'picker_close' || id === 'picker_dismiss_scrim') session.picker = null;
    else if (id === 'picker_search_toggle') picker.showKeyboard = !picker.showKeyboard;
    else if (id === 'picker_prev') picker.page = Math.max(0, picker.page - 1);
    else if (id === 'picker_next') picker.page = Math.min(Math.max(0, Math.ceil(options.length / pickerRows) - 1), picker.page + 1);
    else if (/^(picker|theme|scroll)_option_\d+$/.test(id)) {
      const offset = isUnitPicker(picker.kind) || isSettingsPicker(picker.kind) ? 0 : picker.page * pickerRows;
      const option = options[offset + Number(id.split('_').at(-1))];
      if (option) {
        session.picker = null;
        picker.choose(option.value);
      }
    } else if (picker.kind.startsWith('Currency') || isSettingsPicker(picker.kind) || picker.options.length > pickerRows * 2) {
      const letter = /^picker_letter_([A-Z])$/.exec(id);
      if (id === 'picker_reset') picker.query = '';
      else if (id === 'picker_backspace') picker.query = picker.query.slice(0, -1);
      else if (picker.query.length < 30 && letter) picker.query += letter[1];
      else if (picker.query.length < 30 && id === 'picker_space') picker.query += ' ';
      else return true;
      picker.page = 0;
    }
    return true;
  }
  if (session.calendar) {
    const { field, label, month } = session.calendar;
    const index = /^calendar_cell_(\d+)$/.exec(id);
    if (id === 'calendar_scrim' || id === 'calendar_enter_date') {
      session.calendar = null;
      if (id === 'calendar_enter_date') editDateNumber(session, field, label);
    } else if (id === 'calendar_today' || index) {
      const selected = id === 'calendar_today' ? toDateInputValue(new Date()) :
        getDatePickerCells(month, state.date[field])[Number(index[1])]?.value;
      if (selected && parseDate(selected.replace(/-/g, ''))) {
        applyDate(field, selected);
        session.calendar = null;
      }
    } else {
      const direction = { calendar_prev: -1, calendar_next: 1 }[id];
      if (direction) {
        const next = new Date(month);
        next.setUTCMonth(next.getUTCMonth() + direction);
        if (next.getUTCFullYear() >= 1 && next.getUTCFullYear() <= 9999) session.calendar.month = next;
      }
    }
    return true;
  }
  if (session.editor) {
    const editor = session.editor;
    editor.error = '';
    if (id === 'editor_close') session.editor = null;
    else if (id === 'editor_erase') editor.value = editor.value.slice(0, -1);
    else if (id === 'editor_clear') editor.value = '';
    else if (id === 'editor_save') {
      const result = editor.parse(editor.value);
      if (result === null) editor.error = editor.invalid;
      else {
        editor.apply(result);
        session.editor = null;
      }
    } else if (id.startsWith('editor_digit_') && editor.value.length < 16) {
      const value = id.slice(13);
      if (value === 'minus') editor.value = editor.value.startsWith('-') ? editor.value.slice(1) : '-' + editor.value;
      else if (value === 'decimal' && !editor.value.includes('.')) editor.value += '.';
      else if (/^\d$/.test(value)) editor.value += value;
    }
    return true;
  }
  if (id.startsWith('settings_toggle_')) {
    const group = id.slice(16);
    const sections = session.settingsSections ??= {};
    sections[group] = !(sections[group] ?? true);
  } else if (id.startsWith('settings_link_')) {
    const link = id.slice(14);
    const lines = documents[link] ?? [link === 'feedback'
      ? 'https://github.com/ShaunRoselt/calculator/issues'
      : 'https://github.com/ShaunRoselt/calculator'];
    session.document = { title: settingsTextKeys[id + '_label'] ? t(settingsTextKeys[id + '_label']) : APP_INFO.name, lines };
  } else if (id === 'settings_theme') {
    setPicker(session, translated('settings.appearance.themeTitle', 'Theme'), appThemes, selectTheme, 'themes');
    session.picker.selected = state.settings.theme;
  }
  else if (id === 'settings_language') {
    setPicker(session, translated('settings.language.title', 'Language'), settingsLanguages(), (language) => {
      state.settings.language = language;
      useCalculatorLanguage();
      persistLanguage();
    }, 'language');
    session.picker.selected = state.settings.language;
  } else if (id === 'settings_repeat') {
    state.settings.repeatEquals = !state.settings.repeatEquals;
    persistRepeatEquals();
  } else return false;
  return true;
}
