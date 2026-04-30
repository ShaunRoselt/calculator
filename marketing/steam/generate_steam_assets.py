from __future__ import annotations

import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import textwrap
import time

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent.parent.parent
SCREENSHOT_ASSETS_DIR = ROOT / 'marketing' / 'steam' / 'screenshot-assets'
STORE_ASSETS_DIR = ROOT / 'marketing' / 'steam' / 'store-assets'
LIBRARY_ASSETS_DIR = ROOT / 'marketing' / 'steam' / 'library-assets'
FONTS_DIR = ROOT / 'assets' / 'fonts' / 'Selawik'
ELECTRON_BIN = ROOT / 'node_modules' / '.bin' / 'electron'
SCREENSHOT_SERVER_PORT = 4173
SCREENSHOT_SERVER_URL = f'http://127.0.0.1:{SCREENSHOT_SERVER_PORT}'

BG_TOP = '#10151d'
BG_BOTTOM = '#181d25'
PANEL = '#20252e'
PANEL_SOFT = '#2e3542'
TEXT = '#f5f8fb'
TEXT_SOFT = '#b8c3d2'
ACCENT = '#55b8f4'
ACCENT_SOFT = '#266d9a'
GRAPH_ACCENT = '#33c56d'
AMBER = '#f7c84b'
DIVIDER = '#647082'
SCREENSHOT_TARGET_SIZE = (1920, 1080)
SCREENSHOT_VIEW_NAMES = ('desktop', 'tablet', 'mobile')
SCREENSHOT_VIEW_SPECS = {
    'desktop': {'size': (1920, 1080), 'mode': 'fixed-cover', 'box': (0.06, 0.07, 0.94, 0.95)},
    'tablet': {'size': (1600, 1200), 'mode': 'contain'},
    'mobile': {'size': (1080, 1920), 'mode': 'cover', 'padding': 0.02},
}

SCREENSHOT_SCENES = [
    {
        'fileName': '01_standard_workflow.png',
        'mode': 'standard',
        'script': """
            await clickAll(['1', '2', '5', '×', '1', '6', '=']);
        """,
    },
    {
        'fileName': '02_scientific_functions.png',
        'mode': 'scientific',
        'script': """
            await clickAll(['1', '2', 'x²']);
        """,
    },
    {
        'fileName': '03_programmer_bases.png',
        'mode': 'programmer',
        'script': """
            await clickAll(['2', '5', '5']);
        """,
    },
    {
        'fileName': '04_graphing_expression.png',
        'mode': 'graphing',
        'script': """
            const input = document.querySelector('input[aria-label="Expression 1"], input[placeholder="Enter an expression"]');
            if (!input) {
              throw new Error('Graphing input not found');
            }
            input.focus();
            input.value = 'x^2-4';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
            await wait(450);
        """,
    },
    {
        'fileName': '05_length_conversion.png',
        'mode': 'length',
        'script': """
            await clickButtonsIn(document.querySelector('[aria-label="Converter keypad"]'), ['CE', '1', '2', '0']);
            await wait(150);
        """,
    },
    {
        'fileName': '06_currency_conversion.png',
        'mode': 'currency',
        'script': """
            await clickButtonsIn(document.querySelector('[aria-label="Currency keypad"]'), ['CE', '2', '5', '0']);
            await wait(250);
        """,
    },
]


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip('#')
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def clamp(value: float, min_value: int = 0, max_value: int = 255) -> int:
    return max(min_value, min(int(value), max_value))


def lerp_color(start: str, end: str, ratio: float) -> tuple[int, int, int]:
    start_rgb = hex_rgb(start)
    end_rgb = hex_rgb(end)
    return tuple(clamp(start_rgb[index] + ((end_rgb[index] - start_rgb[index]) * ratio)) for index in range(3))


def make_canvas(width: int, height: int) -> Image.Image:
    image = Image.new('RGBA', (width, height), BG_BOTTOM)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        draw.line((0, y, width, y), fill=lerp_color(BG_TOP, BG_BOTTOM, ratio))

    side_wash = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    side_draw = ImageDraw.Draw(side_wash)
    for x in range(width):
        ratio = x / max(width - 1, 1)
        blue = max(0, int(78 * (1 - ratio)))
        green = max(0, int(42 * ratio))
        side_draw.line((x, 0, x, height), fill=(45, 124 + green, 172 + blue, 34))
    image = Image.alpha_composite(image, side_wash)

    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-width * 0.2, -height * 0.38, width * 0.55, height * 0.72), fill=(85, 184, 244, 72))
    glow_draw.ellipse((width * 0.58, -height * 0.28, width * 1.18, height * 0.74), fill=(51, 197, 109, 42))
    glow_draw.polygon([(width * 0.04, height), (width * 0.52, height * 0.12), (width * 0.64, height * 0.18), (width * 0.18, height)], fill=(255, 255, 255, 12))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(width, height) // 20))
    image = Image.alpha_composite(image, glow)

    vignette = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    vignette_draw = ImageDraw.Draw(vignette)
    border = max(28, min(width, height) // 10)
    for step in range(border):
        alpha = int(74 * ((border - step) / border) ** 1.8)
        vignette_draw.rectangle((step, step, width - step - 1, height - step - 1), outline=(0, 0, 0, alpha))
    return Image.alpha_composite(image, vignette)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS_DIR / name), size=size)


def fit_font(text: str, font_name: str, max_size: int, min_size: int, max_width: int) -> ImageFont.FreeTypeFont:
    for size in range(max_size, min_size - 1, -2):
        font = load_font(font_name, size)
        width = font.getbbox(text)[2]
        if width <= max_width:
            return font
    return load_font(font_name, min_size)


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return ['']

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f'{current} {word}'
        if font.getbbox(candidate)[2] <= max_width:
            current = candidate
            continue
        lines.append(current)
        current = word
    lines.append(current)
    return lines


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    width: int,
    text: str,
    font_name: str,
    *,
    max_size: int,
    min_size: int,
    fill: str,
    line_gap: int,
) -> int:
    chosen_font = load_font(font_name, min_size)
    chosen_lines = wrap_text(text, chosen_font, width)
    for size in range(max_size, min_size - 1, -2):
        font = load_font(font_name, size)
        lines = wrap_text(text, font, width)
        if max(font.getbbox(line)[2] for line in lines) <= width:
            chosen_font = font
            chosen_lines = lines
            break

    current_y = y
    for line in chosen_lines:
        draw.text((x, current_y), line, font=chosen_font, fill=fill)
        line_box = draw.textbbox((x, current_y), line, font=chosen_font)
        current_y = line_box[3] + line_gap
    return current_y - y - line_gap


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def add_panel_shadow(base: Image.Image, panel: Image.Image, position: tuple[int, int], radius: int) -> None:
    x, y = position
    shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
    shadow_mask = Image.new('L', panel.size, 0)
    ImageDraw.Draw(shadow_mask).rounded_rectangle((0, 0, panel.width, panel.height), radius=radius, fill=200)
    shadow.paste((0, 0, 0, 210), (x + 12, y + 16), shadow_mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(shadow)
    base.alpha_composite(panel, dest=position)


def contain_image(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    ratio = min(size[0] / image.width, size[1] / image.height)
    resized = image.resize((max(1, int(image.width * ratio)), max(1, int(image.height * ratio))), Image.Resampling.LANCZOS)
    background = Image.new('RGBA', size, hex_rgb('#10151d'))
    background_draw = ImageDraw.Draw(background)
    background_draw.rounded_rectangle((12, 12, size[0] - 12, size[1] - 12), radius=max(14, min(size) // 18), fill=hex_rgb('#151b25'))
    background_draw.rectangle((0, size[1] - max(28, size[1] // 10), size[0], size[1]), fill=hex_rgb('#0d121a'))
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2
    background.alpha_composite(resized, (x, y))
    return background


def crop_cover(image: Image.Image, size: tuple[int, int], focus_x: float = 0.5, focus_y: float = 0.5) -> Image.Image:
    src_ratio = image.width / image.height
    target_ratio = size[0] / size[1]
    if src_ratio > target_ratio:
        crop_height = image.height
        crop_width = int(crop_height * target_ratio)
    else:
        crop_width = image.width
        crop_height = int(crop_width / target_ratio)

    max_left = image.width - crop_width
    max_top = image.height - crop_height
    left = int(max_left * focus_x)
    top = int(max_top * focus_y)
    left = max(0, min(left, max_left))
    top = max(0, min(top, max_top))
    cropped = image.crop((left, top, left + crop_width, top + crop_height))
    return cropped.resize(size, Image.Resampling.LANCZOS)


def add_overlay(image: Image.Image, color: tuple[int, int, int], alpha: int) -> Image.Image:
    overlay = Image.new('RGBA', image.size, (*color, alpha))
    return Image.alpha_composite(image.convert('RGBA'), overlay)


def is_port_open(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(0.5)
                return sock.connect_ex(('127.0.0.1', port)) == 0


def start_local_server() -> subprocess.Popen[str] | None:
        if is_port_open(SCREENSHOT_SERVER_PORT):
                return None

        process = subprocess.Popen(
                [sys.executable, '-m', 'http.server', str(SCREENSHOT_SERVER_PORT)],
                cwd=ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                text=True,
        )

        for _ in range(50):
                if is_port_open(SCREENSHOT_SERVER_PORT):
                        return process
                time.sleep(0.1)

        process.terminate()
        process.wait(timeout=5)
        raise RuntimeError('Local screenshot server did not start on port 4173')

def load_existing_screenshot_assets() -> dict[str, Image.Image]:
    assets: dict[str, Image.Image] = {}
    missing_files: list[str] = []

    for scene in SCREENSHOT_SCENES:
        legacy_path = SCREENSHOT_ASSETS_DIR / scene['fileName']
        desktop_path = SCREENSHOT_ASSETS_DIR / 'desktop' / scene['fileName']
        path = legacy_path if legacy_path.exists() else desktop_path
        if not path.exists():
            missing_files.append(scene['fileName'])
            continue
        with Image.open(path).convert('RGBA') as image:
            if image.size != SCREENSHOT_TARGET_SIZE:
                image = image.resize(SCREENSHOT_TARGET_SIZE, Image.Resampling.LANCZOS)
            assets[scene['fileName']] = image.copy()

    if missing_files:
        missing_text = ', '.join(missing_files)
        raise RuntimeError(f'Missing screenshot assets: {missing_text}')

    return assets


def capture_screenshot_assets() -> dict[str, Image.Image]:
        if not ELECTRON_BIN.exists():
                return load_existing_screenshot_assets()

        server_process = start_local_server()
        SCREENSHOT_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

        electron_script = textwrap.dedent(
                f"""
                const {{ app, BrowserWindow }} = require('electron');
                const fs = require('fs');
                const path = require('path');

                const baseUrl = {json.dumps(SCREENSHOT_SERVER_URL)};
                const outputDir = {json.dumps(str(SCREENSHOT_ASSETS_DIR))};
                const scenes = {json.dumps(SCREENSHOT_SCENES)};
                const helperSource = `
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickButtonByName(label, root = document) {{
    const buttons = Array.from(root.querySelectorAll('button'));
    const match = buttons.find((button) => button.textContent.trim() === label || button.getAttribute('aria-label') === label);
    if (!match) {{
        throw new Error('Button not found: ' + label);
    }}
    match.click();
    await wait(60);
}}

async function clickAll(labels) {{
    for (const label of labels) {{
        await clickButtonByName(label);
    }}
}}

async function clickButtonsIn(root, labels) {{
    if (!root) {{
        throw new Error('Button container not found');
    }}
    for (const label of labels) {{
        await clickButtonByName(label, root);
    }}
}}
`;
                const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                const withTimeout = (promise, ms, label) => Promise.race([
                    promise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out: ${{label}}`)), ms)),
                ]);

                async function waitForLoad(win) {{
                    await withTimeout(
                        new Promise((resolve, reject) => {{
                            const onReady = () => {{
                                win.webContents.off('did-fail-load', onFail);
                                resolve();
                            }};
                            const onFail = (_event, code, description, validatedURL) => {{
                                win.webContents.off('dom-ready', onReady);
                                reject(new Error(`Load failed (${{code}}): ${{description}} @ ${{validatedURL}}`));
                            }};
                            win.webContents.once('dom-ready', onReady);
                            win.webContents.once('did-fail-load', onFail);
                        }}),
                        15000,
                        'dom-ready'
                    );
                    if (win.webContents.isLoadingMainFrame()) {{
                        await withTimeout(
                            new Promise((resolve) => win.webContents.once('did-stop-loading', resolve)),
                            15000,
                            'did-stop-loading'
                        );
                    }}
                    await wait(400);
                }}

                async function prepareScene(win, mode) {{
                    console.log(`Preparing scene: ${{mode}}`);
                    await withTimeout(win.loadURL(`${{baseUrl}}/app.html?page=${{mode}}`), 15000, `loadURL ${{mode}}`);
                    await waitForLoad(win);
                    await withTimeout(win.webContents.executeJavaScript(`
localStorage.setItem('calculator-theme', 'dark');
localStorage.setItem('calculator-language', 'en');
localStorage.setItem('calculator-nav', JSON.stringify(false));
`), 15000, `seed localStorage for ${{mode}}`);
                    win.webContents.reloadIgnoringCache();
                    await waitForLoad(win);
                    await wait(500);
                }}

                async function applyScene(win, script) {{
                    await withTimeout(
                        win.webContents.executeJavaScript(helperSource + "\\n" + script),
                        15000,
                        'apply scene script'
                    );
                    await wait(180);
                }}

                async function capture(win, fileName) {{
                    console.log(`Capturing: ${{fileName}}`);
                    const image = await withTimeout(win.webContents.capturePage(), 15000, `capture ${{fileName}}`);
                    fs.writeFileSync(path.join(outputDir, fileName), image.toPNG());
                }}

                app.disableHardwareAcceleration();
                app.commandLine.appendSwitch('headless');
                app.commandLine.appendSwitch('disable-gpu');
                app.commandLine.appendSwitch('ozone-platform', 'headless');
                app.commandLine.appendSwitch('force-device-scale-factor', '1');

                app.whenReady().then(async () => {{
                    const win = new BrowserWindow({{
                        width: 1920,
                        height: 1080,
                        useContentSize: true,
                        show: false,
                        paintWhenInitiallyHidden: true,
                        autoHideMenuBar: true,
                        backgroundColor: '#1f2025',
                        webPreferences: {{
                            contextIsolation: false,
                            offscreen: true,
                            sandbox: false,
                        }},
                    }});

                    try {{
                        for (const scene of scenes) {{
                            console.log(`Scene start: ${{scene.fileName}}`);
                            await prepareScene(win, scene.mode);
                            await applyScene(win, scene.script);
                            await capture(win, scene.fileName);
                            console.log(`Scene done: ${{scene.fileName}}`);
                        }}
                    }} finally {{
                        await win.close();
                        app.quit();
                    }}
                }}).catch((error) => {{
                    console.error(error);
                    app.exit(1);
                }});
                """
        )

        with tempfile.TemporaryDirectory(prefix='steam-capture-') as temp_dir:
            script_path = Path(temp_dir) / 'capture.cjs'
            script_path.write_text(electron_script, encoding='utf-8')
            try:
                try:
                    subprocess.run([
                        str(ELECTRON_BIN),
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-gpu',
                        '--disable-dev-shm-usage',
                        '--use-gl=swiftshader',
                        '--headless',
                        '--ozone-platform=headless',
                        str(script_path),
                    ], cwd=ROOT, check=True)
                except subprocess.CalledProcessError:
                    return load_existing_screenshot_assets()
            finally:
                if server_process is not None:
                    server_process.terminate()
                    server_process.wait(timeout=5)

        return load_existing_screenshot_assets()


def crop_zoom_cover(
    image: Image.Image,
    size: tuple[int, int],
    *,
    zoom: float,
    focus_x: float = 0.5,
    focus_y: float = 0.5,
) -> Image.Image:
    max_crop_width = max(1, int(image.width * zoom))
    max_crop_height = max(1, int(image.height * zoom))
    target_ratio = size[0] / size[1]

    if max_crop_width / max_crop_height > target_ratio:
        crop_height = max_crop_height
        crop_width = max(1, int(crop_height * target_ratio))
    else:
        crop_width = max_crop_width
        crop_height = max(1, int(crop_width / target_ratio))

    max_left = image.width - crop_width
    max_top = image.height - crop_height
    left = int(max_left * focus_x)
    top = int(max_top * focus_y)
    left = max(0, min(left, max_left))
    top = max(0, min(top, max_top))

    return image.crop((left, top, left + crop_width, top + crop_height)).resize(size, Image.Resampling.LANCZOS)


def detect_subject_bounds(image: Image.Image, threshold: int = 28) -> tuple[int, int, int, int]:
    sample_width = 320
    sample_height = max(1, int(image.height * sample_width / image.width))
    sample = image.convert('L').resize((sample_width, sample_height), Image.Resampling.BILINEAR)
    pixels = sample.load()

    min_column_hits = max(1, int(sample_height * 0.08))
    min_row_hits = max(1, int(sample_width * 0.08))

    active_columns = [x for x in range(sample_width) if sum(1 for y in range(sample_height) if pixels[x, y] > threshold) >= min_column_hits]
    active_rows = [y for y in range(sample_height) if sum(1 for x in range(sample_width) if pixels[x, y] > threshold) >= min_row_hits]

    if not active_columns or not active_rows:
        return (0, 0, image.width, image.height)

    left = int((min(active_columns) / sample_width) * image.width)
    right = int(((max(active_columns) + 1) / sample_width) * image.width)
    top = int((min(active_rows) / sample_height) * image.height)
    bottom = int(((max(active_rows) + 1) / sample_height) * image.height)
    return (left, top, right, bottom)


def expand_bounds(
    bounds: tuple[int, int, int, int],
    image_size: tuple[int, int],
    *,
    padding_ratio: float = 0.05,
    target_ratio: float | None = None,
) -> tuple[int, int, int, int]:
    left, top, right, bottom = bounds
    width = right - left
    height = bottom - top
    pad_x = int(width * padding_ratio)
    pad_y = int(height * padding_ratio)
    left -= pad_x
    right += pad_x
    top -= pad_y
    bottom += pad_y

    if target_ratio is not None:
        width = right - left
        height = bottom - top
        current_ratio = width / max(height, 1)
        center_x = (left + right) / 2
        center_y = (top + bottom) / 2
        if current_ratio < target_ratio:
            width = height * target_ratio
        else:
            height = width / target_ratio
        left = int(center_x - (width / 2))
        right = int(center_x + (width / 2))
        top = int(center_y - (height / 2))
        bottom = int(center_y + (height / 2))

    max_width, max_height = image_size
    if left < 0:
        right -= left
        left = 0
    if top < 0:
        bottom -= top
        top = 0
    if right > max_width:
        left -= right - max_width
        right = max_width
    if bottom > max_height:
        top -= bottom - max_height
        bottom = max_height

    left = max(0, left)
    top = max(0, top)
    right = min(max_width, right)
    bottom = min(max_height, bottom)
    return (left, top, right, bottom)


def compose_contained_screenshot(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = make_canvas(*size)

    ratio = min((size[0] * 0.9) / source.width, (size[1] * 0.86) / source.height)
    preview = source.resize((max(1, int(source.width * ratio)), max(1, int(source.height * ratio))), Image.Resampling.LANCZOS)

    shadow = Image.new('RGBA', size, (0, 0, 0, 0))
    shadow_box = (preview.width, preview.height)
    shadow_mask = Image.new('L', shadow_box, 0)
    ImageDraw.Draw(shadow_mask).rounded_rectangle((0, 0, shadow_box[0], shadow_box[1]), radius=max(18, min(shadow_box) // 28), fill=180)
    x = (size[0] - preview.width) // 2
    y = (size[1] - preview.height) // 2
    shadow.paste((0, 0, 0, 180), (x + 12, y + 18), shadow_mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), shadow)
    canvas.alpha_composite(preview.convert('RGBA'), (x, y))

    return canvas.convert('RGBA')


def create_screenshot_view_assets(screenshot_assets: dict[str, Image.Image]) -> dict[str, dict[str, Image.Image]]:
    view_assets: dict[str, dict[str, Image.Image]] = {name: {} for name in SCREENSHOT_VIEW_NAMES}

    for file_name, image in screenshot_assets.items():
        source = image.convert('RGBA')
        subject_bounds = detect_subject_bounds(source)
        for view_name in SCREENSHOT_VIEW_NAMES:
            spec = SCREENSHOT_VIEW_SPECS[view_name]
            if spec['mode'] == 'fixed-cover':
                left = int(source.width * spec['box'][0])
                top = int(source.height * spec['box'][1])
                right = int(source.width * spec['box'][2])
                bottom = int(source.height * spec['box'][3])
                view_assets[view_name][file_name] = source.crop((left, top, right, bottom)).resize(spec['size'], Image.Resampling.LANCZOS)
            elif spec['mode'] == 'cover':
                crop_box = expand_bounds(
                    subject_bounds,
                    source.size,
                    padding_ratio=spec.get('padding', 0.04),
                    target_ratio=spec['size'][0] / spec['size'][1],
                )
                view_assets[view_name][file_name] = crop_zoom_cover(
                    source.crop(crop_box),
                    spec['size'],
                    zoom=1.0,
                    focus_x=0.5,
                    focus_y=0.5,
                )
            else:
                subject = source.crop(expand_bounds(subject_bounds, source.size, padding_ratio=0.03))
                view_assets[view_name][file_name] = compose_contained_screenshot(subject, spec['size'])

    return view_assets


def remove_legacy_root_screenshots() -> None:
    for scene in SCREENSHOT_SCENES:
        path = SCREENSHOT_ASSETS_DIR / scene['fileName']
        if path.exists():
            path.unlink()


def load_existing_screenshot_view_assets() -> dict[str, dict[str, Image.Image]] | None:
    view_assets: dict[str, dict[str, Image.Image]] = {}

    for view_name in SCREENSHOT_VIEW_NAMES:
        view_dir = SCREENSHOT_ASSETS_DIR / view_name
        if not view_dir.exists():
            return None

        images: dict[str, Image.Image] = {}
        for scene in SCREENSHOT_SCENES:
            path = view_dir / scene['fileName']
            if not path.exists():
                return None
            with Image.open(path).convert('RGBA') as image:
                images[scene['fileName']] = image.copy()
        view_assets[view_name] = images

    return view_assets


def draw_calculator_mark(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str = ACCENT) -> None:
    x0, y0, x1, y1 = box
    width = x1 - x0
    height = y1 - y0
    radius = max(8, width // 8)
    draw.rounded_rectangle(box, radius=radius, fill=fill)
    draw.rounded_rectangle((x0 + width * 0.16, y0 + height * 0.14, x1 - width * 0.16, y0 + height * 0.34), radius=radius // 2, fill='#f2f7fc')

    cell_gap_x = width * 0.07
    cell_gap_y = height * 0.08
    cell_width = (width * 0.68 - cell_gap_x) / 2
    cell_height = (height * 0.34 - cell_gap_y) / 2
    grid_left = x0 + width * 0.16
    grid_top = y0 + height * 0.48
    for row in range(2):
        for col in range(2):
            cell_x = grid_left + col * (cell_width + cell_gap_x)
            cell_y = grid_top + row * (cell_height + cell_gap_y)
            draw.rounded_rectangle((cell_x, cell_y, cell_x + cell_width, cell_y + cell_height), radius=radius // 3, fill='#f2f7fc')


def draw_tagline(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, text: str, max_size: int = 34, min_size: int = 20) -> tuple[int, int]:
    font = fit_font(text, 'selawksb.ttf', max_size=max_size, min_size=min_size, max_width=width)
    draw.text((x, y), text, font=font, fill=TEXT_SOFT)
    text_box = draw.textbbox((x, y), text, font=font)
    return text_box[2] - text_box[0], text_box[3] - text_box[1]


def draw_wordmark(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, title: str = 'Calculator', max_size: int = 138, min_size: int = 42) -> tuple[int, int]:
    font = fit_font(title, 'selawksb.ttf', max_size=max_size, min_size=min_size, max_width=width)
    draw.text((x, y), title, font=font, fill=TEXT)
    title_box = draw.textbbox((x, y), title, font=font)
    return title_box[2] - title_box[0], title_box[3] - title_box[1]


def place_screenshot(base: Image.Image, screenshot: Image.Image, box: tuple[int, int, int, int], focus_x: float = 0.45, focus_y: float = 0.45, tint: tuple[int, int, int] | None = None, alpha: int = 0) -> None:
    x0, y0, x1, y1 = box
    panel_width = x1 - x0
    panel_height = y1 - y0
    content = contain_image(screenshot, (panel_width, panel_height))
    if tint is not None and alpha:
        content = add_overlay(content, tint, alpha)
    panel = Image.new('RGBA', (panel_width, panel_height), PANEL)
    panel_radius = max(18, min(panel_width, panel_height) // 18)
    panel_mask = rounded_mask((panel_width, panel_height), panel_radius)
    panel.paste(content, (0, 0), panel_mask)

    chrome = Image.new('RGBA', panel.size, (255, 255, 255, 0))
    chrome_draw = ImageDraw.Draw(chrome)
    chrome_draw.rounded_rectangle((0, 0, panel_width - 1, panel_height - 1), radius=panel_radius, outline=(255, 255, 255, 54), width=2)
    chrome_height = max(34, min(56, panel_height // 8))
    chrome_draw.rounded_rectangle((14, 14, panel_width - 14, 14 + chrome_height), radius=chrome_height // 2, fill=(13, 18, 28, 204))
    dot_radius = max(4, chrome_height // 8)
    for index, color in enumerate(('#ff5f57', AMBER, GRAPH_ACCENT)):
        cx = 30 + (index * (dot_radius * 4))
        cy = 14 + chrome_height // 2
        chrome_draw.ellipse((cx - dot_radius, cy - dot_radius, cx + dot_radius, cy + dot_radius), fill=color)
    panel = Image.alpha_composite(panel, chrome)
    add_panel_shadow(base, panel, (x0, y0), panel_radius)


def add_grid(image: Image.Image, spacing: int, opacity: int) -> None:
    grid = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(grid)
    for x in range(0, image.width, spacing):
        draw.line((x, 0, x, image.height), fill=(255, 255, 255, opacity), width=1)
    for y in range(0, image.height, spacing):
        draw.line((0, y, image.width, y), fill=(255, 255, 255, opacity), width=1)
    grid = grid.filter(ImageFilter.GaussianBlur(0.6))
    image.alpha_composite(grid)


def add_math_texture(image: Image.Image, opacity: int = 22) -> None:
    texture = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(texture)
    symbols = ['+', '-', '×', '÷', '=', '%', '√', 'π']
    font = load_font('selawksb.ttf', max(20, min(image.size) // 18))
    step_x = max(120, image.width // 7)
    step_y = max(90, image.height // 5)
    index = 0
    for y in range(-step_y // 2, image.height + step_y, step_y):
        for x in range(-step_x // 2, image.width + step_x, step_x):
            symbol = symbols[index % len(symbols)]
            draw.text((x + (index % 3) * 18, y), symbol, font=font, fill=(255, 255, 255, opacity))
            index += 1
    texture = texture.filter(ImageFilter.GaussianBlur(0.2))
    image.alpha_composite(texture)


def add_diagnostic_glyphs(image: Image.Image, area: tuple[int, int, int, int]) -> None:
    overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    x0, y0, x1, y1 = area
    line = [(x0, y1 - 12), (x0 + ((x1 - x0) * 0.25), y0 + 38), (x0 + ((x1 - x0) * 0.47), y1 - 90), (x0 + ((x1 - x0) * 0.7), y0 + 86), (x1, y0 + 42)]
    draw.line(line, fill=(77, 180, 239, 160), width=4)
    for px, py in line[1:-1]:
        draw.ellipse((px - 7, py - 7, px + 7, py + 7), fill=(77, 180, 239, 210))
    overlay = overlay.filter(ImageFilter.GaussianBlur(0.5))
    image.alpha_composite(overlay)


def add_soft_shadow(base: Image.Image, box: tuple[int, int, int, int], radius: int, alpha: int = 160) -> None:
    x0, y0, x1, y1 = box
    shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
    mask = Image.new('L', (x1 - x0, y1 - y0), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, x1 - x0, y1 - y0), radius=radius, fill=alpha)
    shadow.paste((0, 0, 0, alpha), (x0 + 12, y0 + 18), mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(16, radius // 2)))
    base.alpha_composite(shadow)


def draw_app_chrome(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, radius: int) -> None:
    x0, y0, x1, y1 = box
    width = x1 - x0
    chrome_height = max(34, min(64, (y1 - y0) // 8))
    draw.rounded_rectangle(box, radius=radius, fill='#151922', outline=(255, 255, 255, 32), width=2)
    draw.rounded_rectangle((x0 + 14, y0 + 14, x1 - 14, y0 + 14 + chrome_height), radius=chrome_height // 2, fill='#0d121c')
    dot_radius = max(4, chrome_height // 9)
    for index, color in enumerate(('#ff5f57', AMBER, GRAPH_ACCENT)):
        cx = x0 + 34 + (index * dot_radius * 4)
        cy = y0 + 14 + chrome_height // 2
        draw.ellipse((cx - dot_radius, cy - dot_radius, cx + dot_radius, cy + dot_radius), fill=color)
    title_font = load_font('selawksb.ttf', max(10, min(20, chrome_height // 3)))
    draw.text((x0 + min(width // 3, 160), y0 + 18 + chrome_height // 5), title, font=title_font, fill=(178, 188, 202, 150))


def draw_calculator_preview(image: Image.Image, box: tuple[int, int, int, int], *, result: str = '2000') -> None:
    x0, y0, x1, y1 = box
    width = x1 - x0
    height = y1 - y0
    radius = max(18, min(width, height) // 16)
    add_soft_shadow(image, box, radius, alpha=150)
    draw = ImageDraw.Draw(image)
    draw_app_chrome(draw, box, 'Standard', radius)

    content_left = x0 + int(width * 0.07)
    content_right = x1 - int(width * 0.07)
    content_top = y0 + int(height * 0.22)
    display_bottom = y0 + int(height * 0.46)
    draw.rounded_rectangle((content_left, content_top, content_right, display_bottom), radius=max(12, radius // 2), fill='#1f242d')
    expression_font = load_font('selawksb.ttf', max(10, height // 24))
    result_font = fit_font(result, 'selawkb.ttf', max(height // 8, 24), 18, content_right - content_left - 24)
    draw.text((content_right - draw.textbbox((0, 0), '125 × 16', font=expression_font)[2] - 20, content_top + 14), '125 × 16', font=expression_font, fill=(179, 189, 204, 96))
    result_box = draw.textbbox((0, 0), result, font=result_font)
    result_y = content_top + ((display_bottom - content_top - result_box[3]) / 2) + 12
    draw.text((content_right - result_box[2] - 20, result_y), result, font=result_font, fill=TEXT)

    grid_top = display_bottom + int(height * 0.05)
    gap = max(4, width // 90)
    cols = 4
    rows = 4
    cell_w = (content_right - content_left - gap * (cols - 1)) / cols
    cell_h = (y1 - int(height * 0.08) - grid_top - gap * (rows - 1)) / rows
    labels = ['%', 'CE', 'C', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '=']
    label_font = load_font('selawksb.ttf', max(10, int(cell_h * 0.25)))
    for row in range(rows):
        for col in range(cols):
            index = row * cols + col
            cell_x = int(content_left + col * (cell_w + gap))
            cell_y = int(grid_top + row * (cell_h + gap))
            fill = '#303642'
            if labels[index] == '=':
                fill = ACCENT
            draw.rounded_rectangle((cell_x, cell_y, int(cell_x + cell_w), int(cell_y + cell_h)), radius=max(6, int(cell_h * 0.12)), fill=fill)
            text_box = draw.textbbox((0, 0), labels[index], font=label_font)
            draw.text((cell_x + (cell_w - text_box[2]) / 2, cell_y + (cell_h - text_box[3]) / 2 - 1), labels[index], font=label_font, fill=TEXT)


def draw_graph_preview(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    width = x1 - x0
    height = y1 - y0
    radius = max(18, min(width, height) // 16)
    add_soft_shadow(image, box, radius, alpha=145)
    draw = ImageDraw.Draw(image)
    draw_app_chrome(draw, box, 'Graphing', radius)

    plot = (x0 + int(width * 0.11), y0 + int(height * 0.25), x1 - int(width * 0.08), y1 - int(height * 0.12))
    px0, py0, px1, py1 = plot
    plot_width = px1 - px0
    plot_height = py1 - py0
    plot_radius = max(10, radius // 2)
    plot_layer = Image.new('RGBA', (plot_width, plot_height), (0, 0, 0, 0))
    plot_draw = ImageDraw.Draw(plot_layer)
    plot_draw.rounded_rectangle((0, 0, plot_width, plot_height), radius=plot_radius, fill='#f3f5f6')
    for step in range(1, 8):
        gx = plot_width * step / 8
        gy = plot_height * step / 8
        plot_draw.line((gx, 0, gx, plot_height), fill=(215, 219, 224), width=1)
        plot_draw.line((0, gy, plot_width, gy), fill=(215, 219, 224), width=1)
    axis_x = plot_width * 0.58
    axis_y = plot_height * 0.55
    plot_draw.line((axis_x, 0, axis_x, plot_height), fill=(124, 132, 144), width=1)
    plot_draw.line((0, axis_y, plot_width, axis_y), fill=(124, 132, 144), width=1)

    curve = []
    for index in range(96):
        t = index / 95
        x = t * plot_width
        centered = (t - 0.58) * 3.2
        y = axis_y + ((centered * centered) - 1.2) * plot_height * 0.23
        curve.append((x, y))
    plot_draw.line(curve, fill=hex_rgb(GRAPH_ACCENT), width=max(2, height // 70))

    trend = [
        (plot_width * 0.08, plot_height * 0.78),
        (plot_width * 0.28, plot_height * 0.42),
        (plot_width * 0.54, plot_height * 0.58),
        (plot_width * 0.82, plot_height * 0.48),
    ]
    plot_draw.line(trend, fill=hex_rgb(ACCENT), width=max(4, height // 42), joint='curve')
    point_radius = max(5, height // 34)
    for px, py in trend[1:]:
        plot_draw.ellipse((px - point_radius, py - point_radius, px + point_radius, py + point_radius), fill=hex_rgb(ACCENT))

    plot_mask = rounded_mask((plot_width, plot_height), plot_radius)
    image.paste(plot_layer, (px0, py0), plot_mask)


def draw_converter_preview(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    width = x1 - x0
    height = y1 - y0
    radius = max(18, min(width, height) // 16)
    add_soft_shadow(image, box, radius, alpha=132)
    draw = ImageDraw.Draw(image)
    draw_app_chrome(draw, box, 'Converter', radius)
    card_left = x0 + int(width * 0.1)
    card_right = x1 - int(width * 0.1)
    top = y0 + int(height * 0.28)
    card_gap = int(height * 0.08)
    card_h = int(height * 0.22)
    label_font = load_font('selawksb.ttf', max(10, height // 18))
    value_font = fit_font('120 m', 'selawkb.ttf', max(height // 7, 20), 16, card_right - card_left - 34)
    for index, (label, value, color) in enumerate((('Meters', '120 m', ACCENT), ('Feet', '393.7 ft', GRAPH_ACCENT))):
        cy = top + index * (card_h + card_gap)
        draw.rounded_rectangle((card_left, cy, card_right, cy + card_h), radius=max(12, card_h // 5), fill='#232a35', outline=(*hex_rgb(color), 92), width=2)
        draw.text((card_left + 18, cy + 14), label, font=label_font, fill=TEXT_SOFT)
        value_box = draw.textbbox((0, 0), value, font=value_font)
        draw.text((card_right - value_box[2] - 18, cy + card_h - value_box[3] - 18), value, font=value_font, fill=TEXT)


def draw_feature_list(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, text: str, size: int) -> int:
    return draw_wrapped_text(
        draw,
        x,
        y,
        width,
        text,
        'selawksb.ttf',
        max_size=size,
        min_size=max(14, size - 8),
        fill=TEXT_SOFT,
        line_gap=max(6, size // 5),
    )


def draw_pill(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, font: ImageFont.FreeTypeFont, fill: tuple[int, int, int], text_fill: str = TEXT) -> tuple[int, int]:
    text_box = draw.textbbox((0, 0), text, font=font)
    pill_width = text_box[2] - text_box[0] + 34
    pill_height = text_box[3] - text_box[1] + 18
    draw.rounded_rectangle((x, y, x + pill_width, y + pill_height), radius=pill_height // 2, fill=(*fill, 54), outline=(*fill, 118), width=1)
    draw.text((x + 17, y + 8), text, font=font, fill=text_fill)
    return pill_width, pill_height


def draw_mode_pills(draw: ImageDraw.ImageDraw, x: int, y: int, labels: list[str], max_width: int, size: int) -> int:
    font = load_font('selawksb.ttf', size)
    colors = [hex_rgb(ACCENT), hex_rgb(GRAPH_ACCENT), hex_rgb(AMBER), hex_rgb('#9aa7ff')]
    cursor_x = x
    cursor_y = y
    row_height = 0
    for index, label in enumerate(labels):
        text_box = draw.textbbox((0, 0), label, font=font)
        pill_width = text_box[2] - text_box[0] + 34
        pill_height = text_box[3] - text_box[1] + 18
        if cursor_x != x and cursor_x + pill_width > x + max_width:
            cursor_x = x
            cursor_y += row_height + 12
            row_height = 0
        draw_pill(draw, cursor_x, cursor_y, label, font, colors[index % len(colors)])
        cursor_x += pill_width + 12
        row_height = max(row_height, pill_height)
    return cursor_y + row_height - y


def add_brand_header(image: Image.Image, left: int, top: int, width: int, mark_size: int, title_size: int, subtitle_size: int, subtitle: str = 'Fast, familiar desktop calculation.') -> tuple[int, int, int]:
    draw = ImageDraw.Draw(image)
    draw_calculator_mark(draw, (left, top, left + mark_size, top + mark_size))
    title_x = left + mark_size + max(24, mark_size // 4)
    title_width = width - mark_size - max(24, mark_size // 4)
    title_font = fit_font('Calculator', 'selawkb.ttf', max_size=title_size, min_size=max(32, title_size - 40), max_width=title_width)
    draw.text((title_x, top - max(0, mark_size // 18)), 'Calculator', font=title_font, fill=TEXT)
    title_box = draw.textbbox((title_x, top - max(0, mark_size // 18)), 'Calculator', font=title_font)
    subtitle_y = title_box[3] + max(16, mark_size // 5)
    subtitle_text = subtitle
    subtitle_height = draw_wrapped_text(
        draw,
        title_x,
        subtitle_y,
        title_width,
        subtitle_text,
        'selawksb.ttf',
        max_size=subtitle_size,
        min_size=max(16, subtitle_size - 8),
        fill=TEXT_SOFT,
        line_gap=max(6, subtitle_size // 5),
    )
    return title_x, subtitle_y + subtitle_height, title_width


def create_store_header(standard: Image.Image, graphing: Image.Image) -> Image.Image:
    width, height = 920, 430
    image = make_canvas(width, height)
    add_grid(image, spacing=58, opacity=8)
    add_math_texture(image, opacity=12)
    left_x, bottom_y, left_width = add_brand_header(
        image,
        56,
        70,
        382,
        78,
        68,
        23,
        subtitle='Clean desktop calculator for every mode.',
    )
    draw = ImageDraw.Draw(image)
    draw_mode_pills(draw, left_x, bottom_y + 28, ['Standard', 'Scientific', 'Graphing'], left_width, 18)
    draw_calculator_preview(image, (500, 68, 878, 296))
    draw_graph_preview(image, (612, 208, 896, 392))
    return image


def create_store_small() -> Image.Image:
    width, height = 462, 174
    image = make_canvas(width, height)
    add_math_texture(image, opacity=10)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((12, 12, width - 12, height - 12), radius=24, outline=(255, 255, 255, 28), width=1)
    draw_calculator_mark(draw, (34, 42, 124, 132))
    font = fit_font('Calculator', 'selawkb.ttf', max_size=60, min_size=34, max_width=292)
    draw.text((150, 48), 'Calculator', font=font, fill=TEXT)
    sub_font = load_font('selawksb.ttf', 19)
    draw.text((154, 110), 'Standard • Scientific • Graphing', font=sub_font, fill=TEXT_SOFT)
    return image


def create_store_main(standard: Image.Image, programmer: Image.Image, graphing: Image.Image) -> Image.Image:
    width, height = 1232, 706
    image = make_canvas(width, height)
    add_grid(image, spacing=72, opacity=8)
    add_math_texture(image, opacity=10)
    left_x, bottom_y, left_width = add_brand_header(
        image,
        76,
        92,
        520,
        112,
        94,
        28,
        subtitle='A polished calculator for quick math, graphs, programming, and conversions.',
    )
    draw = ImageDraw.Draw(image)
    pill_height = draw_mode_pills(draw, left_x, bottom_y + 38, ['Standard', 'Scientific', 'Programmer', 'Graphing'], left_width, 22)
    accent_y = bottom_y + 58 + pill_height
    draw.line((left_x, accent_y, left_x + 168, accent_y), fill=hex_rgb(ACCENT), width=5)
    meta_font = load_font('selawksb.ttf', 22)
    draw.text((left_x, accent_y + 22), 'DESKTOP-READY UTILITY', font=meta_font, fill=TEXT_SOFT)

    draw_calculator_preview(image, (640, 78, 1164, 396))
    draw_graph_preview(image, (742, 384, 1174, 646))
    draw_converter_preview(image, (844, 166, 1128, 344))
    return image


def create_store_vertical(standard: Image.Image, graphing: Image.Image) -> Image.Image:
    width, height = 748, 896
    image = make_canvas(width, height)
    add_grid(image, spacing=62, opacity=8)
    add_math_texture(image, opacity=10)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((24, 24, width - 24, height - 24), radius=38, outline=(255, 255, 255, 24), width=1)
    left_x, bottom_y, left_width = add_brand_header(
        image,
        58,
        70,
        620,
        96,
        104,
        27,
        subtitle='Fast arithmetic, graphing, and conversions.',
    )
    draw_mode_pills(draw, left_x, bottom_y + 30, ['Standard', 'Graphing', 'Programmer'], left_width, 20)
    draw_calculator_preview(image, (70, 382, 678, 724))
    draw_graph_preview(image, (140, 642, 674, 858))
    return image


def draw_logo_lockup(
    image: Image.Image,
    left: int,
    top: int,
    *,
    mark_size: int,
    title_size: int,
    title_fill: str = TEXT,
    max_width: int | None = None,
) -> tuple[int, int, int]:
    draw = ImageDraw.Draw(image)
    draw_calculator_mark(draw, (left, top, left + mark_size, top + mark_size))
    title_x = left + mark_size + max(24, mark_size // 4)
    width = max_width if max_width is not None else image.width - title_x - left
    title_font = fit_font('Calculator', 'selawkb.ttf', max_size=title_size, min_size=max(28, title_size - 36), max_width=width)
    title_y = top + max(0, mark_size // 20)
    draw.text((title_x, title_y), 'Calculator', font=title_font, fill=title_fill)
    title_box = draw.textbbox((title_x, title_y), 'Calculator', font=title_font)
    return title_x, title_box[3], width


def create_library_capsule(standard: Image.Image) -> Image.Image:
    width, height = 600, 900
    image = make_canvas(width, height)
    add_grid(image, spacing=64, opacity=8)
    add_math_texture(image, opacity=10)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((20, 20, width - 20, height - 20), radius=34, outline=(255, 255, 255, 24), width=1)
    draw_logo_lockup(image, 54, 66, mark_size=86, title_size=82, max_width=392)
    subtitle_font = load_font('selawksb.ttf', 24)
    draw.text((60, 190), 'Desktop calculator', font=subtitle_font, fill=TEXT_SOFT)
    draw_calculator_preview(image, (44, 306, 556, 594))
    draw_graph_preview(image, (82, 628, 518, 842))
    return image


def create_library_header(standard: Image.Image, graphing: Image.Image) -> Image.Image:
    width, height = 920, 430
    image = make_canvas(width, height)
    add_grid(image, spacing=58, opacity=8)
    add_math_texture(image, opacity=10)
    draw_logo_lockup(image, 58, 76, mark_size=78, title_size=72, max_width=342)
    draw = ImageDraw.Draw(image)
    draw_mode_pills(draw, 160, 190, ['Fast', 'Focused', 'Desktop'], 300, 18)
    draw_calculator_preview(image, (508, 70, 872, 290))
    draw_graph_preview(image, (612, 214, 894, 386))
    return image


def create_library_hero(standard: Image.Image, programmer: Image.Image, graphing: Image.Image) -> Image.Image:
    width, height = 3840, 1240
    image = make_canvas(width, height)
    add_grid(image, spacing=86, opacity=6)
    add_math_texture(image, opacity=8)
    draw_calculator_preview(image, (1120, 126, 2700, 1020))
    draw_converter_preview(image, (2520, 158, 3708, 846))
    draw_graph_preview(image, (1800, 588, 3440, 1168))
    veil = Image.new('RGBA', image.size, (0, 0, 0, 0))
    veil_draw = ImageDraw.Draw(veil)
    veil_draw.rectangle((0, 0, 1220, height), fill=(18, 24, 34, 102))
    veil_draw.rectangle((1080, 0, 1800, height), fill=(18, 24, 34, 36))
    veil = veil.filter(ImageFilter.GaussianBlur(28))
    image.alpha_composite(veil)
    return image


def create_library_logo() -> Image.Image:
    width, height = 1280, 720
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    shadow = Image.new('RGBA', image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((114, 176, 314, 376), radius=48, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    image.alpha_composite(shadow)
    draw_logo_lockup(image, 96, 166, mark_size=190, title_size=170, max_width=780)
    return image


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def main() -> None:
    SCREENSHOT_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    STORE_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    LIBRARY_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    screenshot_assets = capture_screenshot_assets()
    screenshot_view_assets = load_existing_screenshot_view_assets() or create_screenshot_view_assets(screenshot_assets)
    standard = screenshot_assets['01_standard_workflow.png']
    programmer = screenshot_assets['03_programmer_bases.png']
    graphing = screenshot_assets['04_graphing_expression.png']

    assets = {
        'header_capsule_920x430.png': create_store_header(standard, graphing),
        'small_capsule_462x174.png': create_store_small(),
        'main_capsule_1232x706.png': create_store_main(standard, programmer, graphing),
        'vertical_capsule_748x896.png': create_store_vertical(standard, graphing),
    }

    library_assets = {
        'library_capsule_600x900.png': create_library_capsule(standard),
        'library_header_920x430.png': create_library_header(standard, graphing),
        'library_hero_3840x1240.png': create_library_hero(standard, programmer, graphing),
        'library_logo_1280x720.png': create_library_logo(),
    }

    for file_name, image in assets.items():
        save(image, STORE_ASSETS_DIR / file_name)

    for file_name, image in library_assets.items():
        save(image, LIBRARY_ASSETS_DIR / file_name)

    for view_name, view_images in screenshot_view_assets.items():
        for file_name, image in view_images.items():
            save(image, SCREENSHOT_ASSETS_DIR / view_name / file_name)

    remove_legacy_root_screenshots()

    for file_name, image in assets.items():
        print(f'{file_name}: {image.width}x{image.height}')

    for file_name, image in library_assets.items():
        print(f'{file_name}: {image.width}x{image.height}')

    for view_name, view_images in screenshot_view_assets.items():
        for file_name, image in view_images.items():
            print(f'{view_name}/{file_name}: {image.width}x{image.height}')


if __name__ == '__main__':
    main()