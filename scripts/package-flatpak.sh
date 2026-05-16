#!/bin/sh
set -eu

repo_dir="flatpak/repo"
build_dir="flatpak/build"
manifest="flatpak/io.github.ShaunRoselt.Calculator.yml"
bundle="dist/Roselt-Calculator-linux-x64.flatpak"
app_id="io.github.ShaunRoselt.Calculator"
branch="stable"

run_host_command() {
  if command -v flatpak-spawn >/dev/null 2>&1; then
    flatpak-spawn --host "$@"
    return
  fi

  "$@"
}

has_host_command() {
  run_host_command sh -lc "command -v \"$1\" >/dev/null 2>&1"
}

has_host_flatpak_builder_app() {
  run_host_command sh -lc 'flatpak info org.flatpak.Builder >/dev/null 2>&1'
}

run_flatpak_builder() {
  if command -v flatpak >/dev/null 2>&1 && command -v flatpak-builder >/dev/null 2>&1; then
    flatpak-builder "$@"
    return
  fi

  if has_host_command flatpak && has_host_command flatpak-builder; then
    run_host_command flatpak-builder "$@"
    return
  fi

  if has_host_command flatpak && has_host_flatpak_builder_app; then
    run_host_command flatpak run --command=flatpak-builder org.flatpak.Builder "$@"
    return
  fi

  echo "Flatpak tooling is not available. Install flatpak-builder on the host, or install org.flatpak.Builder from Flathub." >&2
  exit 1
}

run_flatpak_command() {
  if command -v flatpak >/dev/null 2>&1; then
    flatpak "$@"
    return
  fi

  if has_host_command flatpak; then
    run_host_command flatpak "$@"
    return
  fi

  echo "Flatpak is not available. Install flatpak on the host, or run from a Flatpak sandbox with flatpak-spawn." >&2
  exit 1
}

run_flatpak_builder --force-clean --repo="$repo_dir" "$build_dir" "$manifest"
run_flatpak_command build-bundle "$repo_dir" "$bundle" "$app_id" "$branch"