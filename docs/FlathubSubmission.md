# Flathub submission prep

This repository now includes a Flathub-ready manifest at `flatpak/io.github.ShaunRoselt.Calculator.flathub.yml`.

## What is prepared

- The manifest uses `org.electronjs.Electron2.BaseApp` instead of copying a locally built Electron bundle.
- The app runtime no longer depends on `node_modules` for `nerdamer`; it uses the vendored file at `assets/vendor/nerdamer/all.min.js`.
- AppStream metadata includes screenshots, a richer description, and release information suitable for KDE Discover and Flathub.
- The source archive URL is pinned to commit `184a1c0f51bba798d2fdcfa0624dc76b66c8b1bc`.
- The screenshot URLs in the AppStream metadata are pinned to an immutable GitHub commit so Discover and Flathub can cache them reliably.

## Local validation

Validate metadata:

```bash
desktop-file-validate flatpak/io.github.ShaunRoselt.Calculator.desktop
appstreamcli validate --no-net flatpak/io.github.ShaunRoselt.Calculator.metainfo.xml
```

Build the Flathub-style Flatpak locally:

```bash
flatpak run --command=flatpak-builder org.flatpak.Builder \
  --force-clean \
  --install-deps-from=flathub \
  --repo=flatpak/flathub-repo \
  flatpak/flathub-build \
  flatpak/io.github.ShaunRoselt.Calculator.flathub.yml
```

Install the locally built result:

```bash
flatpak build-bundle flatpak/flathub-repo dist/Roselt-Calculator-flathub-test.flatpak io.github.ShaunRoselt.Calculator stable
flatpak install --user dist/Roselt-Calculator-flathub-test.flatpak
```

## What to do later when you actually submit

1. Fork `flathub/flathub`.
2. Create `io.github.ShaunRoselt.Calculator.yml` in that repo from `flatpak/io.github.ShaunRoselt.Calculator.flathub.yml`.
3. If you cut a release tag first, update the manifest `url` and `sha256` to the tagged source archive.
4. Open the PR against the `new-pr` branch.
5. Address any Flathub review comments, then merge when ready.