# Calculator Manual Tests

Use this checklist before shipping significant UI, state, or logic changes to the web app.

## Test environments

Run the checks in at least:

- one Chromium-based browser on desktop
- one narrow mobile-sized viewport in browser devtools
- one installed-PWA session when install behavior or offline support changes

Recommended viewport sizes:

- phone: 390 x 844
- tablet: 768 x 1024
- desktop: 1280 x 900

## Smoke tests

### App launch

1. Start the local server and open `index.html`.
2. Refresh the page.
3. Switch between several modes from the navigation menu.

Expected:

- the app loads without console errors
- navigation works without blank states
- the selected mode remains highlighted correctly

### Standard mode

1. Enter `3 + 3` with the keyboard and press Enter.
2. Enter `4 - 2` with on-screen buttons and press `=`.
3. Open history.

Expected:

- the displayed results are `6` and `2`
- the history list records the completed expressions

### Scientific mode

1. Enter `3 ^ 3` and evaluate it.
2. Enter `5`, then apply factorial.
3. Use trig or log functions once each.

Expected:

- exponentiation returns `27`
- factorial returns `120`
- the extra scientific functions update the expression and result correctly

### Programmer mode

1. Enter `15` and switch to HEX.
2. Verify the result changes to `F`.
3. Try a simple bitwise or shift operation.

Expected:

- digits enable and disable correctly by base
- the base conversion result is correct
- programmer-only operations update the display as expected

### Converter mode

1. Open Length.
2. Convert `5` kilometers to miles.
3. Open Temperature and convert `32 F` to Celsius.

Expected:

- the length result starts with `3.106856`
- the temperature result is `0`

### Date calculation mode

1. Compare two nearby dates.
2. Add days or months to a date.

Expected:

- the duration result is stable and repeatable
- shifted dates update immediately and remain valid

### Graphing mode

1. Enter a simple expression such as `x^2`.
2. Change the viewport size.
3. Clear the expression and enter another one.

Expected:

- the graph renders without overlap or clipping
- axes and plotted content remain visible when resized
- updates do not require a page refresh

## History and memory

1. Complete a calculation in Standard mode.
2. Store the result in memory.
3. Recall it.
4. Add to memory and subtract from memory.
5. Clear memory.

Expected:

- memory actions update the panel and button states correctly
- history and memory persist after a page refresh

## Responsive behavior

1. Verify the app at phone, tablet, and desktop widths.
2. Open and close navigation, history, and memory surfaces at each width.
3. Check for clipped controls, overlapping text, and inaccessible buttons.

Expected:

- layout changes are intentional and readable
- panels remain usable at all target widths
- keypad sizing and display scaling remain stable

## Theme and settings

1. Open Settings.
2. Switch between light, dark, and system themes.
3. Reload the page.

Expected:

- theme changes apply immediately
- the selected theme persists across reloads
- settings links still open correctly

## Keyboard and accessibility checks

1. Use Tab and Shift+Tab to move through interactive elements.
2. Trigger a few common actions from the keyboard only.
3. Confirm focus is visible.

Expected:

- focus order is predictable
- keyboard-only operation remains practical
- focus styling is visible in both light and dark themes

## PWA and offline checks

1. Load the app once while online.
2. Reload it.
3. Disconnect the network and reopen the app shell.
4. If supported, install the PWA and relaunch it.

Expected:

- the shell still opens from cache
- icons and core styles load correctly
- the installed experience launches cleanly