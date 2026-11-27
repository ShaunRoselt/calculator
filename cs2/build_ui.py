"""Generate static Panorama panels from the calculator's keypad definitions."""

import json
from pathlib import Path
import shutil
import subprocess
from xml.etree import ElementTree as ET

from native_theme_css import theme_css


def panel(parent, classes, identifier=None):
    node = ET.SubElement(parent, "Panel", {"class": classes})
    if identifier:
        node.set("id", identifier)
    return node


def label(parent, value, classes="", identifier=None):
    node = ET.SubElement(parent, "Label", {"text": value, "hittest": "false"})
    if classes:
        node.set("class", classes)
    if identifier:
        node.set("id", identifier)
    return node


def icon(parent, name, classes="Icon"):
    return ET.SubElement(parent, "Image", {
        "class": classes, "hittest": "false",
        "src": f"file://{{images}}/custom_game/calculator/{name}.png",
    })


def button(parent, identifier, value="{s:text}", classes="Compact", glyph=None):
    node = ET.SubElement(parent, "Button", {"id": identifier, "class": classes})
    if glyph:
        icon(node, glyph)
    if value:
        label(node, value, "ButtonText", identifier + "_label")
    return node


def grid(parent, identifier, rows, key_prefix, classes="Keypad"):
    wrapper = panel(parent, classes, identifier)
    index = 0
    for row in rows:
        strip = panel(wrapper, "KeyRow")
        for key in row:
            if key is None:
                panel(strip, "KeySpacer")
            else:
                tone = key.get("tone", "operator" if key["action"] in ("clear", "backspace") else "digit").capitalize()
                backspace = key["action"] == "backspace" or key.get("value") == "backspace"
                button(strip, f"{key_prefix}_{index}", "" if backspace else key["label"], "Key " + tone,
                       "backspace" if backspace else None)
            index += 1
    return wrapper


def named_keys(parent, prefix, keys):
    for index, (name, *_) in enumerate(keys):
        button(parent, prefix + str(index), name)


def calculator(parent, mode, controls):
    view = panel(parent, "View " + mode.capitalize() + ("" if mode == "standard" else " Hidden"), "view_" + mode)
    if mode != "programmer":
        display = panel(view, "DisplayPanel")
        readout = panel(display, "Readout")
        label(readout, "{s:text}", "Expression", mode + "_expression")
        label(readout, "{s:text}", "Display", mode + "_display")
        panel(display, "DisplayMascot").set("hittest", "false")

    if mode == "programmer":
        programmer_display = panel(view, "ProgrammerDisplay")
        label(programmer_display, "{s:text}", "Expression ProgrammerExpression", mode + "_expression")
        lane = panel(programmer_display, "ProgrammerReadout")
        bases = panel(lane, "ProgrammerBases")
        for base in controls["bases"]:
            item = button(bases, "base_" + base, "", "BaseButton")
            label(item, base, "BaseName")
            label(item, "{s:text}", "BaseValue", "base_" + base + "_label")
        label(lane, "{s:text}", "Display ProgrammerValue", mode + "_display")
        panel(programmer_display, "DisplayMascot").set("hittest", "false")
        toolbar = panel(programmer_display, "Toolbar ProgrammerToolbar")
        button(toolbar, "programmer_keys_open", "", "Flat IconButton", "programmer-keypad")
        button(toolbar, "programmer_bits_open", "", "Flat IconButton", "programmer-bitflip")
        button(toolbar, "programmer_word", "{s:text}", "Flat WordSize")
        button(toolbar, "programmer_memory_4", "MS", "Flat MemoryKey")
    if mode == "scientific":
        toolbar = panel(view, "Toolbar ScientificAngle")
        for index, (name, *_) in enumerate(controls["scienceKeys"][:2]):
            button(toolbar, "science_" + str(index), "{s:text}" if index == 0 else name, "Flat AngleButton")
    if mode != "programmer":
        toolbar = panel(view, "Toolbar MemoryToolbar")
        for index, (name, _) in enumerate(controls["memoryKeys"]):
            button(toolbar, f"{mode}_memory_{index}", name, "Flat MemoryKey")
    if mode == "scientific":
        strip = panel(view, "ScientificOperators")
        toolbar = panel(strip, "Toolbar ScientificOperatorToolbar")
        button(toolbar, "science_2", "{s:text}", "Flat GlyphLabel", "scientific-trig")
        button(toolbar, "science_3", "{s:text}", "Flat GlyphLabel", "scientific-function")
        menu = panel(strip, "ScientificOptions Hidden", "science_options")
        for row_index, (control, caption) in enumerate([("science_shift", "2ⁿᵈ"), ("science_hyp", "hyp")]):
            row = panel(menu, "ScienceOptionRow")
            button(row, control, caption, "Compact Wide")
            for i in range(row_index * 3, row_index * 3 + 3):
                button(row, "science_option_" + str(i), "{s:text}", "Compact Wide")
    if mode == "programmer":
        strip = panel(view, "ScientificOperators ProgrammerOperators")
        toolbar = panel(strip, "Toolbar ScientificOperatorToolbar")
        button(toolbar, "programmer_bitwise", "{s:text}", "Flat GlyphLabel", "bitwise")
        button(toolbar, "programmer_shift", "{s:text}", "Flat GlyphLabel", "bitshift")
        menu = panel(strip, "ScientificOptions Hidden", "programmer_bitwise_menu")
        named_keys(menu, "bitwise_", controls["bitwiseKeys"])
        shifts = panel(strip, "ScientificOptions Hidden", "programmer_shift_menu")
        for shift_id, title in [("left", "<<"), ("right", ">>")]:
            button(shifts, "programmer_shift_" + shift_id, title)
        bits = panel(view, "ProgrammerBits Hidden", "programmer_bits")
        for start in range(63, 0, -4):
            row = panel(bits, "BitGroup Hidden", "bit_group_" + str(start))
            for bit in range(start, start - 4, -1):
                cell = panel(row, "BitCell")
                label(cell, str(bit), "BitPosition")
                button(cell, "bit_" + str(bit), "{s:text}", "Flat BitButton")

    keypad = grid(view, mode + "_keys", controls["keys"][mode], mode + "_key")
    dynamic_keys = {
        "scientific": [3, 5, 10, 15, 20, 25, 30],
        "programmer": [3],
    }
    for index in dynamic_keys.get(mode, []):
        keypad.find(f".//Label[@id='{mode}_key_{index}_label']").set("text", "{s:text}")


def converter(parent, controls):
    view = panel(parent, "View ConverterView Hidden", "view_converter")
    lane = panel(view, "ConversionInfo")
    content = panel(lane, "ConversionFields", "conversion_fields")
    for field in ("from", "to"):
        value = button(content, "value_" + field, "", "Flat ConverterValue")
        label(value, "{s:text}", "ConversionSymbol Hidden", "currency_symbol_" + field)
        label(value, "{s:text}", "ConversionAmount", "value_" + field + "_label")
        unit = button(content, "unit_" + field, "", "Flat ConverterUnit")
        copy = panel(unit, "ConversionUnitCopy")
        label(copy, "{s:text}", "ConversionUnitName", "unit_" + field + "_label")
        label(copy, "{s:text}", "ConversionUnitMeta Hidden", "currency_meta_" + field)
        label(unit, "▾", "ConversionCaret")
    crypto = button(content, "currency_crypto", "", "Flat CryptoToggle Hidden")
    label(crypto, "{s:text}", "ConversionUnitMeta", "currency_crypto_label")
    switch = panel(crypto, "SwitchTrack")
    panel(switch, "SwitchThumb")
    label(content, "{s:text}", "ConversionUnitMeta", "converter_reference_label")
    label(content, "{s:text}", "ConversionReference", "converter_reference")
    label(content, "{s:text}", "ConversionUnitMeta Hidden", "currency_timestamp")
    label(content, "{s:text}", "ConversionUnitMeta Hidden", "currency_status")
    grid(view, "converter_keys", controls["converterKeypad"], "converter_key", "Keypad ConversionKeys")
    grid(view, "currency_keys", controls["currencyKeypad"], "currency_key", "Keypad ConversionKeys Hidden")


def dates(parent):
    view = panel(parent, "View DateView Hidden", "view_date")
    mode = button(view, "date_mode_toggle", "{s:text}", "Flat DateSelect")
    label(mode, "▾", "ConversionCaret")
    for name, fields in [("difference", ["from", "to"]), ("shift", ["baseDate"])]:
        group = panel(view, "DateFields" + (" Hidden" if name == "shift" else ""), "date_" + name)
        for field in fields:
            label(group, "{s:text}", "DateFieldTitle", "date_field_" + field)
            trigger = button(group, "date_edit_" + field, "{s:text}", "Flat DateTrigger")
            icon(trigger, "date-picker")
        if name == "shift":
            operation = panel(group, "Toolbar DateOperation")
            for value in ("add", "subtract"):
                op = button(operation, "date_mode_" + value, "", "Flat DateRadio")
                panel(op, "RadioMark")
                label(op, "{s:text}", "ButtonText", "date_mode_" + value + "_label")
            offsets = panel(group, "Toolbar DateOffsets")
            for field in ("years", "months", "days"):
                cell = panel(offsets, "DateOffset")
                label(cell, "{s:text}", "DateFieldTitle", "date_field_" + field)
                button(cell, "date_edit_" + field, "{s:text}", "Flat DateSelect")
    label(view, "{s:text}", "DateFieldTitle", "date_result_title")
    label(view, "{s:text}", "DateResult", "date_result")
    label(view, "{s:text}", "DateDetail", "date_detail")
    mode_menu = panel(view, "DateModeMenu Hidden", "date_mode_menu")
    for name in ("difference", "shift"):
        button(mode_menu, "date_mode_" + name, "{s:text}", "Flat DateSelect")


def collections(parent, controls):
    dock = panel(parent, "CollectionsDock", "collections")
    button(dock, "collections_scrim", "", "DrawerScrim CompactOnly")
    sidebar = panel(dock, "Collections")
    tabs = panel(sidebar, "Toolbar")
    button(tabs, "collection_history", "{s:text}", "Flat CollectionTab")
    button(tabs, "collection_memory", "{s:text}", "Flat CollectionTab")
    button(tabs, "collections_close", "", "Flat IconButton CompactOnly CollectionClose", "dismiss")
    body = panel(sidebar, "CollectionBody")
    label(body, "{s:text}", "CollectionEmpty", "collection_empty")
    for i in range(controls["collectionSize"]):
        row = panel(body, "CollectionRow Hidden", f"collection_row_{i}")
        item = button(row, f"collection_item_{i}", "", "Flat CollectionItem")
        label(item, "{s:text}", "CollectionExpression", f"collection_expression_{i}")
        label(item, "{s:text}", "CollectionText", f"collection_entry_{i}")
        actions = panel(row, "Toolbar Hidden", f"memory_controls_{i}")
        button(actions, f"memory_clear_{i}", "MC")
        button(actions, f"memory_add_{i}", "M+")
        button(actions, f"memory_subtract_{i}", "M−")
    button(sidebar, "clear_history", "", "Flat IconButton CollectionClear Hidden", "delete")


def controls_row(parent, controls):
    row = panel(parent, "Toolbar")
    for ident, title in controls:
        button(row, ident, title)
    return row


def graphing(parent, controls):
    view = panel(parent, "View GraphView Hidden", "view_graphing")
    plot = panel(view, "GraphPlot")
    canvas = panel(plot, "GraphCanvas", "graph_canvas")
    axes = panel(canvas, "PlotGrid")
    axes.set("hittest", "false")
    for direction in ("x", "y"):
        for index in range(controls["graphGridSize"]):
            panel(axes, f"PlotLine PlotLine{direction.upper()} Hidden", f"graph_grid_{direction}_{index}")
            label(axes, "{s:text}", f"PlotTick PlotTick{direction.upper()} Hidden", f"graph_tick_{direction}_{index}")
    for index in range(controls["graphVectorLayers"]):
        vector = panel(canvas, "CurveLayer Hidden", "graph_curve_" + str(index))
        vector.set("hittest", "false")
        for segment in range(controls["graphVectorSegments"]):
            node = panel(vector, "CurveSegment Column" + str(segment) + " Hidden", f"graph_segment_{index}_{segment}")
            node.set("hittest", "false")
    for ident in [*map(str, range(len(controls["graphColors"]))), "trace"]:
        layer = panel(canvas, "GraphLayer Hidden", "graph_layer_" + ident)
        layer.set("hittest", "false")
        for row in range(controls["graphRows"]):
            label(layer, "{s:text}", "GraphPixels", f"graph_pixels_{ident}_{row}")
    trace = panel(plot, "GraphTraceZones Hidden", "graph_trace_zones")
    for zone in range(controls["graphTraceZones"]):
        button(trace, "graph_trace_zone_" + str(zone), "", "TraceZone")
    surface_tools = panel(plot, "GraphSurfaceTools")
    button(surface_tools, "graph_trace_toggle", "", "GraphTool IconButton", "graph-select")
    button(surface_tools, "graph_options", "", "GraphTool IconButton", "graph-options")
    zoom = panel(plot, "GraphZoom")
    button(zoom, "graph_zoom_in", "+", "GraphTool IconButton")
    button(zoom, "graph_zoom_out", "−", "GraphTool IconButton")
    button(zoom, "graph_reset", "", "GraphTool IconButton", "graph-auto-view")
    label(plot, "{s:text}", "GraphTraceText Hidden", "graph_trace")
    options = panel(plot, "GraphSettingsPopup Hidden", "graph_options_panel")
    label(options, "{s:text}", "HelpTitle", "graph_options_title")
    for direction in ("x", "y"):
        row = panel(options, "Toolbar")
        for bound in ("Min", "Max"):
            button(row, f"graph_bound_{direction}{bound}", "{s:text}", "Compact Wide")
    controls_row(options, [("graph_left", "←"), ("graph_up", "↑"), ("graph_down", "↓"), ("graph_right", "→")])
    controls_row(options, [("graph_angle", "{s:text}"), ("graph_thickness", "{s:text}"), ("graph_theme", "{s:text}")])
    editor = panel(view, "GraphEditor")
    layout = panel(editor, "GraphEditorBody", "graph_editor_controls")
    entries = panel(layout, "GraphEntries")
    for index in range(controls["graphListSize"]):
        row = panel(entries, "GraphExpressionRow Hidden", "graph_row_" + str(index))
        button(row, "graph_visibility_" + str(index), "ƒ", "GraphBadge")
        button(row, "graph_entry_" + str(index), "{s:text}", "Flat GraphEntry")
        actions = panel(row, "GraphExpressionActions Hidden", "graph_actions_" + str(index))
        for action, glyph in [("analyze", "graph-analyze-function"), ("style", "graph-style-picker"), ("remove", "graph-remove-equation")]:
            button(actions, f"graph_{action}_{index}", "", "Flat IconButton", glyph)
        styling = panel(entries, "Toolbar GraphStyle Hidden", "graph_styling_" + str(index))
        button(styling, f"graph_color_{index}", "Color")
        button(styling, f"graph_line_{index}")
        button(styling, f"graph_cursor_left_{index}", "←")
        button(styling, f"graph_cursor_right_{index}", "→")
    keys = panel(layout, "GraphKeys")
    groups = panel(keys, "Toolbar GraphGroupToolbar")
    for key, glyph in [("trig", "scientific-trig"), ("inequality", "graphing-inequality"), ("function", "scientific-function")]:
        button(groups, "graph_group_" + key, "{s:text}", "Flat GlyphLabel", glyph)
    function_keys = panel(keys, "Toolbar GraphFunctionPopup Hidden", "graph_menu")
    button(function_keys, "graph_hyp", "hyp", "Compact Wide")
    for index in range(6):
        button(function_keys, "graph_function_" + str(index), "{s:text}", "Compact Wide")
    grid(keys, "graph_keypad", controls["graphKeypad"], "graph_key", "Keypad GraphKeypad")

    analysis = panel(editor, "GraphAnalysis Hidden", "graph_analysis")
    button(analysis, "graph_analysis_close", "{s:text}", "Flat GlyphLabel", "back")
    label(analysis, "{s:text}", "HelpTitle", "graph_analysis_title")
    label(analysis, "{s:text}", "GraphAnalysisText", "graph_analysis_error")
    results = panel(analysis, "GraphAnalysisResults")
    for index in range(13):
        label(results, "{s:text}", "GraphAnalysisText Hidden", "graph_analysis_row_" + str(index))


def settings(parent):
    view = panel(parent, "View NativeSettings Hidden", "view_settings")
    for ident, glyph in [("preferences", "⚙"), ("about", None)]:
        if ident == "about":
            label(view, "{s:text}", "AboutHeading", "settings_about_heading")
        card = panel(view, "SettingsCard")
        summary = button(card, f"settings_toggle_{ident}", "", "Flat SettingsSummary")
        if glyph:
            label(summary, glyph, "SettingsGlyph")
        else:
            panel(summary, "SettingsLogo").set("hittest", "false")
        copy = panel(summary, "SettingsSummaryCopy")
        label(copy, "{s:text}", "SettingsTitle", f"settings_{ident}_title")
        label(copy, "{s:text}", "SettingsDescription", f"settings_{ident}_description")
        label(summary, "{s:text}", "SettingsCaret", f"settings_{ident}_caret")
        body = panel(card, "SettingsBody", "settings_body_" + ident)
        if ident == "preferences":
            for name, symbol in [("theme", "◐"), ("language", "A"), ("repeat", "=")]:
                item = panel(body, "PreferenceRow")
                label(item, symbol, "PreferenceSymbol")
                copy = panel(item, "PreferenceCopy")
                label(copy, "{s:text}", "SettingsTitle", f"settings_{name}_title")
                label(copy, "{s:text}", "SettingsDescription", f"settings_{name}_description")
                if name == "repeat":
                    control = button(copy, f"settings_{name}", "", "Flat RepeatPreference")
                    switch = panel(control, "SwitchTrack")
                    panel(switch, "SwitchThumb")
                    label(control, "{s:text}", "TogglePill", "settings_repeat_label")
                else:
                    control = button(copy, f"settings_{name}", "{s:text}", "PreferenceControl")
                    label(control, "▾", "ConversionCaret")
        else:
            for name in ("readme", "release", "license"):
                button(body, f"settings_link_{name}", "{s:text}", "Flat SettingsLink")
    button(view, "settings_link_feedback", "{s:text}", "Flat SettingsLink SettingsFooterLink")
    button(view, "settings_link_source", "{s:text}", "Flat SettingsLink SettingsFooterLink")


def picker(parent, controls):
    overlay = panel(parent, "Overlay Hidden", "option_picker")
    button(overlay, "picker_dismiss_scrim", "", "PickerDismiss")
    card = panel(overlay, "OverlayCard")
    label(card, "{s:text}", "HelpTitle", "picker_title")
    button(card, "picker_search_toggle", "{s:text}", "Compact UnitSearchInput Hidden")
    scroll_list = panel(card, "PickerOptions ScrollOptions Hidden", "picker_scroll_list")
    for index in range(controls["scrollPickerRows"]):
        item = button(scroll_list, f"scroll_option_{index}", "{s:text}", "Compact PickerOption Hidden")
        label(item, "{s:text}", "PickerOptionMeta Hidden", f"scroll_option_meta_{index}")
    label(card, "{s:text}", "Note Hidden", "picker_empty")
    options = panel(card, "PickerOptions", "picker_list")
    for index in range(controls["pickerRows"]):
        button(options, f"picker_option_{index}", "{s:text}", "Compact PickerOption")
    gallery = panel(card, "ThemeGallery Hidden", "picker_gallery")
    for start in range(0, controls["themePickerRows"], 4):
        row = panel(gallery, "ThemeGalleryRow")
        for pair_start in range(start, min(start + 4, controls["themePickerRows"]), 2):
            pair = panel(row, "ThemePair")
            for index in range(pair_start, min(pair_start + 2, controls["themePickerRows"])):
                item = button(pair, f"theme_option_{index}", "", "ThemeOption Hidden")
                header = panel(item, "ThemeOptionHeader")
                header.set("hittest", "false")
                label(header, "{s:text}", "ThemeOptionTitle", f"theme_option_{index}_label")
                label(header, "{s:text}", "ThemeOptionCaption Hidden", f"theme_caption_{index}")
                label(item, "✓", "ThemeOptionCheck")
                panel(item, "ThemePreview", f"picker_preview_{index}").set("hittest", "false")
    pagination = controls_row(card, [("picker_prev", "‹"), ("picker_next", "›"), ("picker_close", "Close")])
    pagination.set("id", "picker_pagination")
    label(pagination, "{s:text}", "Note", "picker_page")
    search = panel(card, "PickerSearch Hidden", "picker_search")
    label(search, "{s:text}", "Note", "picker_filter")
    for letters in ("ABCDEFGHIJKLM", "NOPQRSTUVWXYZ"):
        row = panel(search, "Toolbar SearchRow")
        for letter in letters:
            button(row, "picker_letter_" + letter, letter, "Compact Wide")
    controls_row(search, [("picker_space", "Space"), ("picker_backspace", "⌫"), ("picker_reset", "Clear search")])

    entry = panel(parent, "Overlay Hidden", "number_editor")
    card = panel(entry, "OverlayCard")
    label(card, "{s:text}", "HelpTitle", "editor_title")
    label(card, "{s:text}", "HelpLine", "editor_value")
    label(card, "{s:text}", "Note", "editor_error")
    for keys in (["7", "8", "9"], ["4", "5", "6"], ["1", "2", "3"], ["−", "0", "."]):
        row = panel(card, "Toolbar")
        for value in keys:
            ident = {"−": "minus", ".": "decimal"}.get(value, value)
            button(row, "editor_digit_" + ident, value, "Compact Wide")
    controls_row(card, [("editor_erase", "⌫"), ("editor_clear", "Clear"), ("editor_save", "Apply"), ("editor_close", "Cancel")])

    calendar = panel(parent, "DateCalendarOverlay Hidden", "date_calendar")
    button(calendar, "calendar_scrim", "", "DateCalendarScrim")
    card = panel(calendar, "DateCalendarCard")
    header = panel(card, "Toolbar CalendarHeader")
    label(header, "{s:text}", "CalendarMonth", "calendar_month")
    button(header, "calendar_prev", "‹", "Flat Compact")
    button(header, "calendar_next", "›", "Flat Compact")
    weekday_row = panel(card, "Toolbar")
    for day in ("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"):
        label(weekday_row, day, "CalendarWeekday")
    for week in range(6):
        row = panel(card, "Toolbar")
        for day in range(7):
            button(row, f"calendar_cell_{week * 7 + day}", "{s:text}", "Flat Compact Wide CalendarDay")
    controls_row(card, [("calendar_enter_date", "Enter date"), ("calendar_today", "Today")])

    documents = panel(parent, "Overlay Hidden", "settings_document")
    card = panel(documents, "OverlayCard SettingsDocument")
    label(card, "{s:text}", "HelpTitle", "document_title")
    lines = panel(card, "DocumentLines")
    for index in range(60):
        label(lines, "{s:text}", "DocumentLine Hidden", "document_line_" + str(index))
    button(card, "document_close", "Close")


def generate(addon: Path, content: Path):
    controls = json.loads(subprocess.check_output([
        "node", "--input-type=module", "-e",
        "import * as data from './cs2/layout-data.js'; "
        "import {renderNavIcon,renderToolbarIcon} from './scripts/Views/ViewIcons.js'; "
        "const names=['menu','back','backspace','delete','history','dismiss','date-picker','scientific-trig',"
        "'scientific-function','programmer-keypad','programmer-bitflip','bitwise','bitshift','graph-select',"
        "'graph-options','graph-auto-view','graph-analyze-function','graph-remove-equation','graph-style-picker',"
        "'graphing-inequality','graph-show-equation','graph-hide-equation','graph-view','expressions-view']; "
        "const icons=Object.fromEntries([...names.map(id=>[id,renderToolbarIcon(id)]),"
        "...data.modes.map(id=>['nav-'+id,renderNavIcon(id)])]); "
        "console.log(JSON.stringify({...data, icons}));",
    ], cwd=addon, text=True))
    layout = content / "panorama/layout/custom_game/calculator.xml"
    styles = content / "panorama/styles/custom_game/calculator.css"
    images = content / "panorama/images/custom_game/calculator"
    for directory in (layout.parent, styles.parent, images):
        directory.mkdir(parents=True, exist_ok=True)

    ui = ET.Element("root")
    ET.SubElement(ET.SubElement(ui, "styles"), "include", {
        "src": "file://{resources}/styles/custom_game/calculator.css",
    })
    surface = panel(ui, "Surface")
    root = panel(surface, "CalculatorRoot", "root")
    titlebar = panel(root, "Titlebar")
    button(titlebar, "navigation", "", "Flat IconButton", "menu")
    button(titlebar, "settings_back", "", "Flat IconButton Hidden", "back")
    label(titlebar, "{s:text}", "Title", "mode_title")
    button(titlebar, "collections_open", "", "Flat IconButton CompactOnly", "history")
    graph_tabs = panel(titlebar, "GraphViewTabs CompactOnly Hidden", "graph_view_tabs")
    button(graph_tabs, "graph_view_graph", "", "Flat IconButton", "graph-view")
    button(graph_tabs, "graph_view_editor", "", "Flat IconButton", "expressions-view")

    body = panel(root, "Workspace")
    content = panel(body, "Calculator")
    for mode in controls["keys"]:
        calculator(content, mode, controls)
    dates(content)
    converter(content, controls)
    graphing(content, controls)
    settings(content)
    collections(body, controls)
    drawer = panel(root, "Drawer Hidden", "mode_menu")
    button(drawer, "navigation_scrim", "", "DrawerScrim")
    navigation = panel(drawer, "Navigation")
    button(navigation, "navigation_close", "", "Flat IconButton", "menu")
    scroller = panel(navigation, "NavigationScroll")
    for group in controls["navigationGroups"]:
        label(scroller, "{s:text}", "NavigationGroup", "navigation_group_" + group["key"])
        for mode in group["modes"]:
            button(scroller, "mode_" + mode, "{s:text}", "Flat NavigationItem GlyphLabel", "nav-" + mode)
    button(navigation, "mode_settings", "{s:text}", "Flat NavigationItem GlyphLabel", "nav-settings")
    picker(root, controls)

    ET.indent(ui)
    ET.ElementTree(ui).write(layout, encoding="unicode", short_empty_elements=False)
    base_styles = (addon / "cs2/panorama.css").read_text(encoding="utf-8")
    plot_colors = ["#4a4d56", "#969ba5", "#d6ab51", *controls["graphColors"]]
    layers = ["grid", "axes", "trace", *map(str, range(len(controls["graphColors"])))]
    graph_styles = "\n".join(f"#graph_layer_{layer} Label {{ color: {color}; }}" for layer, color in zip(layers, plot_colors))
    graph_styles += "\n" + "\n".join(
        f".Plot{axis.upper()}{index} {{ {axis}: {index / 2:g}%; }}"
        for axis in ("x", "y") for index in range(201)
    )
    graph_styles += "\n" + "\n".join(
        f".GraphBadge.Color{index} {{ background-color: {color}; }} .CurveLayer.Color{index} .CurveSegment {{ wash-color: {color}; }}"
        for index, color in enumerate(controls["graphColors"])
    )
    graph_styles += "\n" + "\n".join(
        f".CurveSegment.Column{index} {{ x: {index * 100 / controls['graphVectorSegments']:g}%; }}"
        for index in range(controls["graphVectorSegments"])
    )
    graph_styles += "\n" + "\n".join(
        f".CurveSegment.Length{index} {{ height: {index / 2:g}%; }}"
        for index in range(1, 201)
    )
    styles.write_text(base_styles + "\n" + graph_styles + "\n" + theme_css(addon), encoding="utf-8")
    used_icons = {Path(node.get("src")).stem for node in ui.iter("Image")} & controls["icons"].keys()
    for name in sorted(used_icons):
        svg = controls["icons"][name]
        source = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ', 1).replace("currentColor", "#ffffff")
        rasterize(source, images / (name + ".png"))
    for name, (start, end) in {"curve-rise": (64, 0), "curve-fall": (0, 64)}.items():
        source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        source += f'<path d="M0 {start} L64 {end}" stroke="white" stroke-width="10" fill="none"/></svg>'
        rasterize(source, images / (name + ".png"))
        used_icons.add(name)
    mascot = (addon / "assets/themes/images/unicorn.svg").read_text(encoding="utf-8")
    rasterize(mascot, images / "unicorn-mascot.png", 256)
    used_icons.add("unicorn-mascot")
    textures = set()
    for theme in json.loads((addon / "assets/themes/data/index.json").read_text())["themes"]:
        ident = theme["id"]
        logo = (addon / "assets/logos" / f"{ident}.svg").read_text(encoding="utf-8")
        name = f"theme-{ident}-logo"
        rasterize(logo, images / f"{name}.png", 128)
        textures.add(name)
    for source in sorted((addon / "cs2/theme-surfaces").glob("*.png")):
        name = "theme-" + source.name
        shutil.copyfile(source, images / name)
        textures.add(Path(name).stem)
    return [f"panorama/images/custom_game/calculator/{name}_png.vtex_c" for name in sorted(used_icons | textures)]


def rasterize(svg, destination, size=64):
    subprocess.run(["rsvg-convert", "--width", str(size), "--height", str(size), "--output", destination],
                   input=svg.encode(), check=True)
