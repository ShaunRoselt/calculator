# Calculator

Calculator is a standalone web app that runs entirely in the browser. It includes standard,
scientific, programmer, graphing, date calculation, history/memory, and unit conversion modes in a
single installable interface.

<img src="docs/Images/CalculatorScreenshot.png" alt="Calculator Screenshot" width="450px" />

## Features

- Standard, scientific, and programmer calculator modes
- Graphing, date calculation, and unit conversion workflows
- History and memory panes with local persistence
- Keyboard input support across calculator modes
- Installable PWA without offline asset caching
- Responsive layouts for phone, tablet, and desktop widths

## Getting started

Prerequisites:

- Node.js and npm
- Python 3, or another way to serve the repository over HTTP

Install dependencies:

```bash
npm install
```

Start a local server from the repository root:

```bash
npm start
```

Then open `http://127.0.0.1:4173/` for the public landing page, or go directly to `http://127.0.0.1:4173/app.html?page=standard` for the calculator app.

## Validation

Run the script syntax check before opening a pull request:

```bash
npm run check
```

For manual regression coverage, use [docs/ManualTests.md](docs/ManualTests.md).

## Desktop packaging

Build the Windows x64 desktop bundle:

```bash
npm run package:win
```

This writes the unpacked Windows app to `dist/Calculator-win32-x64/`, with the executable at
`dist/Calculator-win32-x64/Calculator.exe`.

Build the Linux x64 Electron bundle:

```bash
npm run package:linux
```

This writes the unpacked Linux app to `dist/Calculator-linux-x64/`.

Build the Flatpak bundle:

```bash
npm run package:flatpak
```

This writes the Flatpak bundle to `dist/Calculator-linux-x64.flatpak` and the export repo to
`flatpak/repo/`.

Launch the installed Flatpak:

```bash
flatpak run io.github.ShaunRoselt.Calculator
```

If you only have the local bundle, install it first with:

```bash
flatpak install --user --or-update dist/Calculator-linux-x64.flatpak
```

## PWA support

The app includes:

- `manifest.json` for installation metadata
- `service-worker.js` for installability without cached assets
- icons under `assets/`

To test installation behavior, serve the app over `http://127.0.0.1:4173` during development or a
secure origin in production.

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

## Documentation

- [Application architecture](docs/ApplicationArchitecture.md)
- [Manual test plan](docs/ManualTests.md)
- [Feature development process](docs/NewFeatureProcess.md)
- [Roadmap](docs/Roadmap.md)
- [Web quality checklist](docs/StandaloneWebParity.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance. Use GitHub issues for bug reports
and feature proposals.

## Reporting security issues

See [SECURITY.md](SECURITY.md).

## License

Licensed under the [MIT License](LICENSE).