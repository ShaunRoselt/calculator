# Application Architecture

Calculator is a browser-first application built from static assets and vanilla JavaScript modules.
The app renders a single shell from `index.html`, persists user state in the browser, and keeps
mode-specific UI code isolated under `scripts/Views` and `styles/Views`.

## Runtime overview

The web app has three top-level entry points:

- `index.html` loads the CSS and JavaScript bundles used by the browser shell
- `manifest.json` defines install metadata for the PWA
- `service-worker.js` keeps the app installable as a PWA without caching network responses

The page boot sequence is:

1. `index.html` loads the shared styles and `scripts/startup.js`
2. `startup.js` loads startup dependencies, registers the service worker, and starts the app
3. `scripts/app.js` reads URL state, hydrates persisted data, wires events, and triggers the
   first render

## State and persistence

Application state is centralized in `scripts/state.js`.

That module is responsible for:

- restoring history, memory, navigation, and theme settings from local storage
- exposing the mutable state object used by render and event flows
- persisting state updates after user actions

The storage keys are defined in `scripts/config.js` so the rest of the app can stay consistent
about how browser persistence is handled.

## Mode logic

Business logic lives primarily in `scripts/logic.js`.

That module handles:

- calculator evaluation and operator workflows
- programmer mode behavior and base conversions
- date calculation logic
- unit conversion transforms
- graphing-related calculations shared with the graphing view

Static configuration for modes, buttons, converter categories, and metadata lives in
`scripts/config.js`.

## View composition

The UI is assembled from small rendering modules rather than a framework runtime.

Key view files include:

- `scripts/Views/MainPage.js` for the shared shell and navigation layout
- `scripts/Views/Calculator.js` for standard, scientific, and programmer surfaces
- `scripts/Views/DateCalculator.js` for date workflows
- `scripts/Views/UnitConverter.js` for converter layouts
- `scripts/Views/GraphingCalculator/GraphingCalculator.js` for graphing mode
- `scripts/Views/HistoryList.js`, `Memory.js`, and `Settings.js` for side panels and support
  surfaces

Each view returns HTML strings that are inserted into the main shell and then bound to the relevant
event handlers from `scripts/app.js`.

## Styling and responsive behavior

The visual system is split between shared tokens and view-specific styles:

- `styles/theme.css` defines tokens, color roles, and base element styling
- `styles/Views/` contains one stylesheet per feature area
- `styles/responsive.css` handles viewport-specific layout changes

The app is expected to work across phone, tablet, and desktop widths without changing the runtime
architecture. Responsive behavior is implemented with CSS layout rules and view-aware rendering
decisions, not separate builds.

## Offline model

`service-worker.js` exists to satisfy the PWA install requirement, but it does not pre-cache app
assets or intercept fetches. Network requests still go directly to the server for the latest files.

## Development model

The repository is intentionally lightweight:

- no bundler is required for local development
- no server-side runtime is required for the app itself
- validation is currently centered on `npm run check` plus manual browser testing

When adding new features, prefer extending the existing module boundaries instead of creating a new
application layer. Most changes should fit into one or more of these buckets: config, state, logic,
view rendering, and styling.