"""Translate the browser themes' color tokens into Panorama selectors."""

import json
import re


def resolve_token(tokens, name):
    value = tokens.get(name, "")
    for _ in range(8):
        alias = re.fullmatch(r"var\((--[\w-]+)\)", value)
        if not alias:
            break
        value = tokens.get(alias[1], "")
    return value


def parse_color(value, fallback):
    if re.fullmatch(r"#[\da-fA-F]{3}", value):
        return "#" + "".join(char * 2 for char in value[1:])
    if re.fullmatch(r"#[\da-fA-F]{6}(?:[\da-fA-F]{2})?", value):
        return value
    rgb = re.fullmatch(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)", value)
    if rgb and all(0 <= int(value) <= 255 for value in rgb.groups()[:3]):
        color = "#" + "".join(f"{int(value):02x}" for value in rgb.groups()[:3])
        return color + (f"{round(255 * float(rgb[4])):02x}" if rgb[4] and float(rgb[4]) < 1 else "")
    return fallback


COLOR = r"(?:#[\da-fA-F]{3,8}\b|rgba?\([^)]*\))"


def resolve_color(tokens, name, fallback):
    value = resolve_token(tokens, name)
    if value.startswith(("linear-gradient(", "radial-gradient(")):
        first_color = re.search(COLOR, value)
        value = first_color[0] if first_color else ""
    return parse_color(value, fallback)


def paint(tokens, name, fallback):
    value = resolve_token(tokens, name)
    gradient = re.fullmatch(
        rf"linear-gradient\(\s*(180|90|0|270)deg,\s*({COLOR})\s*0%,\s*({COLOR})\s*100%\)", value
    )
    if not gradient:
        return resolve_color(tokens, name, fallback)
    start, end = {"180": ("0% 0%", "0% 100%"), "90": ("0% 0%", "100% 0%"),
                  "0": ("0% 100%", "0% 0%"), "270": ("100% 0%", "0% 0%")}[gradient[1]]
    return f"gradient(linear, {start}, {end}, from({parse_color(gradient[2], fallback)}), to({parse_color(gradient[3], fallback)}))"


def grid_ink(source, background):
    color = parse_color(source, "#ffffff12")
    if len(color) != 9 or not re.fullmatch(r"#[\da-fA-F]{6}", background):
        return color
    opacity = int(color[7:9], 16) / 255
    return "#" + "".join(f"{round(opacity * int(color[index:index + 2], 16) + (1 - opacity) * int(background[index:index + 2], 16)):02x}"
                         for index in (1, 3, 5))


def theme_css(addon):
    directory = addon / "assets/themes"
    themes = json.loads((directory / "data/index.json").read_text())["themes"]
    definitions = {theme["id"]: theme for theme in themes}

    def read_tokens(theme):
        inherited = read_tokens(definitions[theme["extends"]]) if theme.get("extends") in definitions else {}
        source = (directory / "css" / theme["file"]).read_text()
        return {**inherited, **dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", source))}

    rules = []
    surfaces = addon / "cs2/theme-surfaces"

    def texture(name):
        return f'background-image: url("file://{{images}}/custom_game/calculator/theme-{name}.png"); background-size: 100% 100%;'

    for theme in themes:
        ident = theme["id"]
        root = ".CalculatorRoot.Theme_" + ident
        rules.append(f"{root} .SettingsLogo {{ {texture(ident + '-logo')} }}")
        if (surfaces / (ident + "-preview.png")).is_file():
            rules.append(f".ThemePreview.Preview_{ident} {{ {texture(ident + '-preview')} }}")
        if (surfaces / (ident + "-shell.png")).is_file():
            rules.append(f"{root} {{ {texture(ident + '-shell')} }}")
        if (surfaces / (ident + "-display.png")).is_file():
            rules.append(f"{root} .DisplayPanel {{ {texture(ident + '-display')} }}")
        palette = theme.get("graphPalette", {})
        plot_background = palette.get("background", "#1b1c20")
        plot = f".CalculatorRoot .GraphCanvas.PlotTheme_{ident}"
        rules += [
            f"{plot} {{ background-color: {plot_background}; }}",
            f"{plot} .PlotLine {{ background-color: {grid_ink(palette.get('gridMinor', '#ffffff12'), plot_background)}; }}",
            f"{plot} .PlotLine.Major {{ background-color: {grid_ink(palette.get('gridMajor', '#ffffff24'), plot_background)}; }}",
            f"{plot} .PlotLine.Axis {{ background-color: {palette.get('axis', '#969ba5')}; }}",
            f"{plot} .PlotTick {{ color: {palette.get('label', '#eef0f3')}; }}",
        ]
        if ident in ("dark", "light"):
            continue
        tokens = read_tokens(theme)
        color = lambda name, fallback: resolve_color(tokens, name, fallback)
        background = color("--window-color", color("--window-bg", theme["metaColor"]))
        panel = color("--panel-color", color("--panel", background))
        digit = paint(tokens, "--button-digit-bg", color("--panel-soft", "#30333b"))
        compact = color("--button-default-bg", panel)
        function = paint(tokens, "--button-function-bg", panel)
        operator = paint(tokens, "--button-operator-bg", panel)
        accent = color("--accent", "#53b5eb")
        equals = color("--button-equals-bg-end", accent)
        equals_start = color("--button-equals-bg-start", equals)
        text = color("--text", "#f4f4f5")
        muted = color("--text-soft", text)
        radius = tokens.get("--theme-button-radius", "3px")
        display_radius = tokens.get("--theme-display-radius", "0px")
        rules += [
            f"{root} {{ background-color: {background}; }}",
            f"{root} .Navigation, {root} .Collections, {root} .PreferenceRow {{ background-color: {background}; }}",
            f"{root} .OverlayCard, {root} .SettingsCard, {root} .PreferenceControl, {root} .DateModeMenu, {root} .DateCalendarCard {{ background-color: {panel}; }}",
            f"{root} Label {{ color: {text}; }}",
            f"{root} .Icon {{ wash-color: {text}; }}",
            f"{root} .Note, {root} .Expression, {root} .SettingsDescription, {root} .CollectionEmpty {{ color: {muted}; }}",
            f"{root} .Key {{ background-color: {digit}; border-radius: {radius}; }}",
            f"{root} .DisplayPanel {{ border-radius: {display_radius}; }}",
            f"{root} .Compact {{ background-color: {compact}; }}",
            f"{root} .Key.Function {{ background-color: {function}; }}",
            f"{root} .Key.Operator {{ background-color: {operator}; }}",
            f"{root} .Key.Digit Label, {root} .Key.Default Label {{ color: {color('--button-digit-text', text)}; }}",
            f"{root} .Key.Function Label {{ color: {color('--button-function-text', text)}; }}",
            f"{root} .Key.Operator Label {{ color: {color('--button-operator-text', text)}; }}",
            f"{root} .Key.Equals {{ background-color: gradient(linear, 0% 0%, 0% 100%, from({equals_start}), to({equals})); }}",
            f"{root} .Key.Equals Label {{ color: {color('--button-equals-text', color('--accent-ink', '#080a0e'))}; }}",
            f"{root} Button.Selected {{ background-color: {color('--panel-strong', panel)}; border: 1px solid {accent}; }}",
            f"{root} Button:hover {{ border: 1px solid {accent}; }}",
            f"{root} .CollectionTab.Selected {{ border: 0px; border-bottom: 3px solid {accent}; background-color: #00000000; }}",
        ]
    return "\n".join(rules)
