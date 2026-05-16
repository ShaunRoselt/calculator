# New Feature Process

Use this process for new features and major UX changes to the web app. Bug fixes, refactors, and
tooling improvements can usually move straight to implementation as long as an issue captures the
intent.

## Step 1: Open an issue

Create a GitHub issue that explains:

- the user problem
- the affected modes or workflows
- the expected browser behavior
- any responsive, keyboard, offline, or persistence implications

If the proposal changes visible behavior, include screenshots, sketches, or interaction notes.

## Step 2: Align on scope

Before building, make sure the issue answers these questions:

- Is this a new mode, a change to an existing mode, or a shell-level improvement?
- Does it affect shared state, persistence, or routing?
- Does it require new assets, dependencies, or browser APIs?
- How will it behave at phone, tablet, and desktop widths?

For larger changes, add a short design note directly to the issue or in a linked markdown document.

## Step 3: Implement in small slices

Prefer incremental pull requests when the change is broad. In most cases, work should fall into one
or more of these areas:

- `scripts/config.js` for metadata and static definitions
- `scripts/state.js` for persistence and state shape
- `scripts/logic.js` for calculations and workflows
- `scripts/Views/` for rendering
- `styles/Views/` and `styles/responsive.css` for layout and presentation

Keep feature work focused. Avoid mixing large visual rewrites, logic changes, and cleanup in the
same pull request unless they are tightly coupled.

## Step 4: Review checklist

Before opening a pull request, confirm the change against this checklist:

- [ ] `npm run check` passes
- [ ] Manual coverage was completed for the affected modes
- [ ] Keyboard interactions still work for the changed flow
- [ ] Focus styling remains visible and usable
- [ ] Layout works at phone, tablet, and desktop widths
- [ ] Theme behavior is correct in light, dark, and system modes
- [ ] State persistence still works after reload if the feature stores data locally
- [ ] Offline behavior still loads the shell if service-worker assets changed
- [ ] Any new dependency has a clear reason to exist and acceptable bundle impact

## Step 5: Merge readiness

A feature is ready to merge when:

- the user-facing behavior is clear and documented in the issue
- the implementation matches the intended scope
- the test coverage is appropriate for the risk of the change
- follow-up work is captured separately instead of being left implicit

If the feature introduces a deliberate limitation, document that explicitly in the pull request so
future work does not need to reverse-engineer the decision.