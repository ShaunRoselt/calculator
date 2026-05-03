#!/bin/sh
set -eu

repo_dir="flatpak/repo"
build_dir="flatpak/build"
manifest="flatpak/io.github.ShaunRoselt.Calculator.yml"
bundle="dist/Roselt-Calculator-linux-x64.flatpak"
app_id="io.github.ShaunRoselt.Calculator"
branch="stable"

run_flatpak() {
  if command -v flatpak >/dev/null 2>&1 && command -v flatpak-builder >/dev/null 2>&1; then
    "$@"
    return
  fi

  if command -v flatpak-spawn >/dev/null 2>&1; then
    flatpak-spawn --host "$@"
    return
  fi

  echo "Flatpak tooling is not available. Install flatpak and flatpak-builder, or run from a Flatpak sandbox with flatpak-spawn." >&2
  exit 1
}

run_flatpak flatpak-builder --force-clean --repo="$repo_dir" "$build_dir" "$manifest"
run_flatpak flatpak build-bundle "$repo_dir" "$bundle" "$app_id" "$branch"