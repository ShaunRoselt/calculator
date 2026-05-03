# Contributing to Roselt Calculator

Roselt Calculator is a browser-first project. Contributions should improve the user experience, the
maintainability of the codebase, or the reliability of the installable app shell.

## Reporting issues and suggesting features

Use GitHub issues for:

- bug reports
- feature requests
- UX discussions
- documentation improvements

Before opening a new issue, search existing discussions to avoid duplicates.

## Finding work to do

Issues marked `good first issue` or `help wanted` are good places to start. If you plan to work on
something non-trivial, leave a comment so other contributors know the issue is in progress.

## Contribution guidelines

- Do create one pull request per issue when practical.
- Do keep changes focused and explain the user impact.
- Do include validation notes, especially for UI and interaction changes.
- Do check whether the same bug or inconsistency appears elsewhere before submitting a fix.
- Do not bundle unrelated cleanup into the same pull request.
- Do not submit formatting-only changes unless they are part of a meaningful edit.

For user-visible features and major UX changes, follow [docs/NewFeatureProcess.md](docs/NewFeatureProcess.md).

## Preparing your development environment

Prerequisites:

- Node.js and npm
- Python 3, or another simple way to serve the repository over HTTP

Install dependencies:

```bash
npm install
```

Start a local server from the repository root:

```bash
npm start
```

Then open `http://127.0.0.1:4173/` for the public landing page, or go directly to `http://127.0.0.1:4173/app.html?page=standard` for the app shell.

To launch the desktop shell during development:

```bash
npm run start:desktop
```

## Style guidelines

Match the style of the surrounding code. Most new changes in this repository fall into one or more
of these areas:

- browser logic in `scripts/`
- rendering modules in `scripts/Views/`
- styling in `styles/`
- static metadata in `index.html`, `manifest.json`, and `service-worker.js`

Prefer small, readable functions over large cross-cutting rewrites.

## Project structure

### Runtime entry points

- `index.html` serves the public landing page, links the manifest, and registers the service worker so install prompts can begin there
- `app.html` boots the browser shell for the installed and in-browser calculator experience
- `manifest.json` defines install metadata
- `service-worker.js` keeps the PWA installable without caching app assets

### JavaScript

- `scripts/startup.js` loads startup dependencies, registers the service worker, and imports the app
- `scripts/landing.js` registers the service worker used to expose PWA installation from the public landing page
- `scripts/app.js` wires startup, events, and top-level rendering
- `scripts/config.js` defines modes, buttons, units, and app metadata
- `scripts/state.js` manages persisted UI state
- `scripts/logic.js` contains calculator, converter, date, and graphing logic
- `scripts/Views/` contains mode-specific rendering modules

### CSS

- `styles/theme.css` defines tokens and global styles
- `styles/Views/` contains view-specific styling
- `styles/responsive.css` handles layout changes by viewport size

## Testing

At a minimum, validate your change with:

- `npm run check`
- targeted manual testing for the affected modes
- responsive verification when layout changes are involved
- theme and keyboard checks when interactive UI changes are involved

Use [docs/ManualTests.md](docs/ManualTests.md) as the baseline manual test plan.

## Packaging

Build the Windows x64 desktop bundle:

```bash
npm run package:win
```

Build a single-file portable Windows executable:

```bash
npm run package:win:portable
```

Build the Linux x64 Electron bundle:

```bash
npm run package:linux
```

Build the Flatpak bundle:

```bash
npm run package:flatpak
```

Launch the installed Flatpak:

```bash
flatpak run io.github.ShaunRoselt.Calculator
```

If you only have the local bundle, install it first with:

```bash
flatpak install --user --or-update dist/Roselt-Calculator-linux-x64.flatpak
```

## Git workflow

Calculator follows standard GitHub pull request flow. Keep branch history understandable and group
related changes together.

## Review process

Pull requests are reviewed for correctness, clarity, scope control, and regression risk. Complex
changes usually need a short explanation of the approach and a clear validation summary.

## Contributor License Agreement

Before a pull request can be accepted, contributors may need to sign the Microsoft Contributor
License Agreement. The CLA process is automated and only needs to be completed once for Microsoft
projects that require it.