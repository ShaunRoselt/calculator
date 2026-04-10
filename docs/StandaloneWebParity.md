# Standalone Web Quality Checklist

Use this document as a release-quality checklist for the browser app. The goal is consistent,
predictable behavior across modes, themes, and viewport sizes.

## Core expectations

- the shell should load without console errors
- mode changes should feel immediate and stable
- history, memory, and settings should behave consistently across reloads
- layout changes should be intentional rather than incidental at each target width

## Shared shell

- [ ] Navigation ordering and active states are correct
- [ ] History and memory surfaces open, close, and dock cleanly
- [ ] Focus, hover, pressed, and disabled states are visible
- [ ] Theme switching updates all shared shell surfaces
- [ ] Settings links and metadata are current

## Calculator modes

### Standard

- [ ] Display alignment and scaling are stable
- [ ] Memory row behavior is correct
- [ ] Button emphasis and spacing remain consistent
- [ ] History recall flows still work

### Scientific

- [ ] Function rows remain usable at narrow widths
- [ ] Expression entry and result rendering stay readable
- [ ] Angle and advanced function behavior remain correct

### Programmer

- [ ] Base selection is clear and reliable
- [ ] Disabled digits reflect the active base
- [ ] Bitwise and shift operations behave correctly

### Date, converter, and graphing

- [ ] Mode-specific controls are complete and aligned
- [ ] Layout remains usable at narrow and wide widths
- [ ] Graphing updates render without overlap or clipping

## Review sizes

Test at these fixed sizes instead of arbitrary resizing:

- phone: 390 x 844
- tablet: 768 x 1024
- desktop: 1280 x 900

At each size, verify:

- when navigation is overlay versus inline
- when history or memory shifts from overlay to docked behavior
- how display text scales before clipping or truncation
- whether keypad and control proportions remain balanced

## Validation flow

1. Run `npm run check`
2. Complete the relevant cases from `docs/ManualTests.md`
3. Reload the app to confirm persisted state still hydrates correctly
4. If shell assets changed, test offline relaunch and installed-PWA behavior

## Release bar

The app is ready for release when changed modes have:

- correct calculations
- reliable keyboard support
- stable responsive behavior
- acceptable theme coverage
- no known shell regressions in installation or offline behavior