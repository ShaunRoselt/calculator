#!/usr/bin/env bash
set -euo pipefail
addon_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cs2_dir="${CALCULATOR_CS2_DIR:-$addon_dir/../../..}"
if [[ -z "${CALCULATOR_CS2_DIR:-}" && ! -f "$cs2_dir/game/csgo/gameinfo.gi" ]]; then
    cs2_dir="$HOME/.local/share/Steam/steamapps/common/Counter-Strike Global Offensive"
fi
map_file="$cs2_dir/game/csgo/maps/calculator.vpk"
if [[ ! -f "$map_file" ]]; then
    printf 'Run python3 cs2/build.py from the calculator checkout to install the map.\n' >&2
    exit 1
fi
exec steam -applaunch 730 -insecure +game_type 3 +game_mode 0 +map calculator "$@"
