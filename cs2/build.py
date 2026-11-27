"""Build and install the calculator map with the installed CS2 Workshop Tools."""

import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from build_ui import generate
from package_vpk import create_vpk, read_vpk

SOURCE = Path(__file__).resolve().parent
ADDON = SOURCE.parent
DEFAULT_CS2 = ADDON.parents[2] if len(ADDON.parents) > 2 else ADDON
if not (DEFAULT_CS2 / "game/csgo/gameinfo.gi").is_file():
    DEFAULT_CS2 = Path.home() / ".local/share/Steam/steamapps/common/Counter-Strike Global Offensive"
CS2 = Path(os.environ.get("CALCULATOR_CS2_DIR", DEFAULT_CS2)).expanduser().resolve()
STEAM = CS2.parents[2]
GAME = CS2 / "game/csgo_addons/calculator"
COMPILED_MAP = GAME / "maps/calculator.vpk"
PLAYABLE_MAP = GAME / "maps/.installed-calculator.vpk"
LOCAL_MAP = CS2 / "game/csgo/maps/calculator.vpk"
WORK = ADDON / ".build-tools/cs2"
STAGED_RUNTIME = WORK / "windows-runtime"
DEFAULT_RUNTIME = (STAGED_RUNTIME if (STAGED_RUNTIME / "game/bin/win64/resourcecompiler.exe").is_file()
                   else Path.home() / ".local/share/cs2-workshop-tools/windows-runtime")
TOOL_RUNTIME = Path(os.environ.get("CS2_WORKSHOP_WINDOWS_RUNTIME", DEFAULT_RUNTIME)).expanduser()
TOOL_BIN = TOOL_RUNTIME / "game/bin/win64"
DEFAULT_BIN = TOOL_BIN if (TOOL_BIN / "resourcecompiler.exe").is_file() else CS2 / "game/bin/win64"
BIN = Path(os.environ.get("CALCULATOR_COMPILER_BIN", DEFAULT_BIN)).expanduser().absolute()
BIN_GAME = BIN.resolve().parents[1] / "csgo"
COMPILER_GAME = BIN_GAME if (BIN_GAME / "gameinfo.gi").is_file() else CS2 / "game/csgo"
PROTON = Path(os.environ.get("CALCULATOR_PROTON", CS2.parent / "Proton - Experimental/proton"))
PROTON_DIRECTORY = PROTON.resolve().parent.name
PREFIX_NAMES = {"Proton - Experimental": "proton-experimental", "Proton 10.0": "proton"}
DEFAULT_PREFIX = WORK / PREFIX_NAMES.get(PROTON_DIRECTORY, f"proton-{PROTON_DIRECTORY}")
PREFIX = Path(os.environ.get("CALCULATOR_PROTON_PREFIX", DEFAULT_PREFIX))
PROTON_ENV = {
    **os.environ,
    "STEAM_COMPAT_CLIENT_INSTALL_PATH": str(STEAM),
    "STEAM_COMPAT_DATA_PATH": str(PREFIX),
    "WINEDEBUG": "-all",
}


def win(path):
    return "Z:" + str(path.absolute()).replace("/", "\\")


def tool(exe, arguments, log_name):
    log_path = WORK / log_name
    with log_path.open("w", encoding="utf-8") as log:
        result = subprocess.run(
            [PROTON, "runinprefix", BIN / exe, *arguments], cwd=CS2, env=PROTON_ENV,
            stdout=log, stderr=subprocess.STDOUT, check=False,
        )
    if result.returncode:
        raise RuntimeError(f"{exe} exited with {result.returncode}. See {log_path}")


def compile_source(game, source, target, *args):
    tool("resourcecompiler.exe", [
        "-i", win(source), "-game", win(game),
        "-addon", "calculator", "-nop4", "-noassert", "-fshallow", "-vulkan", *args,
    ], f"compile-{source.name}.log")
    if not target.is_file():
        raise RuntimeError(f"Resource compiler did not generate {target}. See {WORK}")
    print(f"Compiled {source.name}", flush=True)


def stage_compiler_tree(stage):
    # Valve resolves addon resources relative to sibling content/ and game/
    # trees. Give this compilation its own addon paths and link the base game.
    for folder, original in (("content", CS2 / "content"), ("game", COMPILER_GAME.parent)):
        root = stage / folder
        root.mkdir()
        for entry in original.iterdir():
            if entry.name != "csgo_addons":
                (root / entry.name).symlink_to(entry)
        (root / "csgo_addons/calculator/maps").mkdir(parents=True)
    content = stage / "content/csgo_addons/calculator"
    output = stage / "game/csgo_addons/calculator"
    shutil.copyfile(SOURCE / "addoninfo.txt", content / "addoninfo.txt")
    shutil.copyfile(SOURCE / "addoninfo.txt", output / "addoninfo.txt")
    shutil.copyfile(SOURCE / "maps/calculator.vmap", content / "maps/calculator.vmap")
    return content, output


def compile_map(stage, esbuild):
    content, output = stage_compiler_tree(stage)
    game = stage / "game/csgo"
    script = content / "maps/scripts/calculator.js"
    script.parent.mkdir()
    subprocess.run([
        "node", "cs2/bundle.js", esbuild / "lib/main.js", script,
    ], cwd=ADDON, check=True)
    image_resources = generate(ADDON, content)
    subprocess.run(["node", "--check", script], check=True)

    resources = [
        ("panorama/layout/custom_game/calculator.xml", "panorama/layout/custom_game/calculator.vxml_c"),
        ("maps/scripts/calculator.js", "maps/scripts/calculator.vjs_c"),
    ]
    for source, target in resources:
        compile_source(game, content / source, output / target)
    calculator_resources = [target for _, target in resources] + image_resources + [
        "panorama/styles/custom_game/calculator.vcss_c",
    ]

    compiled_map = output / "maps/calculator.vpk"
    compile_source(game, content / "maps/calculator.vmap", compiled_map, "-world", "-phys", "-vis", "-nobakedlighting")
    files = read_vpk(compiled_map)
    for name in calculator_resources:
        files[name] = (output / name).read_bytes()
    required_map_resources = {
        "maps/calculator.vmap_c",
        "maps/calculator/world_physics.vmdl_c", "maps/calculator/world_visibility.vvis_c",
    }
    if missing := required_map_resources - files.keys():
        raise RuntimeError("Missing packaged resources: " + ", ".join(sorted(missing)))
    compiled_map.write_bytes(create_vpk(files))
    if files != read_vpk(compiled_map):
        raise RuntimeError("Packaged VPK did not pass resource verification")
    return compiled_map, len(files)


def install_map(package):
    COMPILED_MAP.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SOURCE / "addoninfo.txt", GAME / "addoninfo.txt")
    # Publish verified copies atomically while CS2 may be reading the current map.
    with tempfile.TemporaryDirectory(dir=COMPILED_MAP.parent) as destination:
        staged = Path(destination) / COMPILED_MAP.name
        for target in (COMPILED_MAP, PLAYABLE_MAP):
            shutil.copyfile(package, staged)
            staged.replace(target)
    if LOCAL_MAP.resolve() != PLAYABLE_MAP:
        with tempfile.TemporaryDirectory(dir=LOCAL_MAP.parent) as destination:
            staged = Path(destination) / LOCAL_MAP.name
            staged.symlink_to(PLAYABLE_MAP)
            staged.replace(LOCAL_MAP)


def build():
    if not (CS2 / "game/csgo/gameinfo.gi").is_file():
        raise FileNotFoundError(f"CS2 is missing at {CS2}. Set CALCULATOR_CS2_DIR to its install path.")
    if not PROTON.is_file():
        raise FileNotFoundError(f"Proton is missing at {PROTON}. Set CALCULATOR_PROTON to its path.")
    if not (BIN / "resourcecompiler.exe").is_file():
        raise FileNotFoundError(f"Workshop Tools are missing at {BIN}. Set CALCULATOR_COMPILER_BIN to their path.")
    if LOCAL_MAP.is_symlink() and LOCAL_MAP.resolve() not in (COMPILED_MAP, PLAYABLE_MAP):
        raise FileExistsError(f"{LOCAL_MAP} points to a different addon")
    if LOCAL_MAP.exists() and not LOCAL_MAP.is_symlink():
        raise FileExistsError(f"{LOCAL_MAP} already belongs to a separate map")

    WORK.mkdir(parents=True, exist_ok=True)
    PREFIX.mkdir(parents=True, exist_ok=True)
    vendor = WORK / "npm"
    esbuild = vendor / "node_modules/esbuild"
    version = "0.28.2"
    metadata = esbuild / "package.json"
    if not metadata.is_file() or f'"version": "{version}"' not in metadata.read_text(encoding="utf-8"):
        subprocess.run(["npm", "install", "--prefix", vendor, "--no-package-lock", "--no-save",
                        f"esbuild@{version}"], cwd=ADDON, check=True)

    with tempfile.TemporaryDirectory(dir=WORK, prefix="build-") as directory:
        package, resource_count = compile_map(Path(directory), esbuild)
        install_map(package)
    print(f"Installed {LOCAL_MAP} ({resource_count} resources)", flush=True)


if __name__ == "__main__":
    try:
        build()
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        sys.exit(1)
