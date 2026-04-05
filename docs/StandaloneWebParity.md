# Standalone Web Parity

The standalone web calculator is intended to become the replacement front end for the native
Windows Calculator experience. Because of that, the target is no longer feature parity alone — it
is behavioral and visual parity.

## Source of truth

- Use the Windows Calculator UI as the source of truth for layout, spacing, typography, motion,
  display scaling, and responsive transitions.
- Use Windows screenshots for parity reviews. The initial shell reference for this rewrite is:
  `https://github.com/user-attachments/assets/c2b6f86f-fa8f-4b05-995c-3e629f9744bd`

## Parity checklist

### Shared shell

- [x] Interior-only parity target (do not render outer window frame or caption bar in the standalone web shell)
- [ ] App title, hamburger, and history affordances
- [ ] Navigation drawer spacing, ordering, and active-state treatment
- [ ] Side panel open/close behavior, sizing, and empty states
- [ ] Keyboard focus, hover, pressed, and disabled states
- [ ] Motion timing and panel transitions

### Standard mode

- [ ] Display alignment, expression row, and overflow scaling
- [ ] Memory row layout and enable/disable behavior
- [ ] Keypad sizing, corner radii, emphasis, and label parity
- [ ] History recall and memory workflows

### Scientific mode

- [ ] Toolbar arrangement and function density
- [ ] Expression layout and keypad parity
- [ ] Angle toggle behavior

### Programmer mode

- [ ] Base selector layout
- [ ] Readout layout
- [ ] Disabled digit behavior by base

### Date, converter, and graphing

- [ ] Mode-specific headers and controls
- [ ] Layout parity at narrow and wide widths
- [ ] Shared shell and side-panel consistency

## Adaptive layout states

Use fixed review sizes instead of ad-hoc resizing so parity can be measured consistently.

- **Phone-width:** 390 × 844
- **Tablet-width:** 768 × 1024
- **Desktop-width:** 1280 × 900

Each parity pass should verify:

- when navigation remains an overlay vs. inline
- when the history/memory surface becomes a side sheet vs. docked panel
- how display text scales before truncation or wrapping
- how keypad proportions change without breaking the Windows feel

## Rollout

1. Standard mode visual parity at desktop width
2. Standard mode adaptive parity at phone and tablet widths
3. Standard mode interaction parity
4. Repeat the same sequence for scientific, programmer, and remaining modes
5. Package the web app in a Windows desktop host

## Validation

- Run `npm run check` from `/home/runner/work/calculator/calculator`
- Compare the current web output against Windows reference captures for the same mode and viewport
- Review shell, display, memory, keypad, and side-panel behavior before merging

## Windows packaging guidance

Use a Windows-native host around the web UI when replacement-level fidelity is the goal. A
WebView2/WinUI wrapper is preferred because it preserves tighter control over native window chrome,
scaling behavior, startup feel, and Windows integrations.

Electron can still produce a Windows `.exe`, but it is better suited to fast packaging than to
matching the in-box Windows Calculator experience exactly.
