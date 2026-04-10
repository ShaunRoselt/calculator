# Contributing to Calculator

Calculator is now a web-only project. Contributions should improve the browser experience, the
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

Use the setup steps in [README.md](README.md) to install dependencies and run the app locally.

## Style guidelines

Match the style of the surrounding code. Most new changes in this repository fall into one or more
of these areas:

- browser logic in `web/scripts/`
- rendering modules in `web/scripts/Views/`
- styling in `web/styles/`
- static metadata in `index.html`, `manifest.json`, and `service-worker.js`

Prefer small, readable functions over large cross-cutting rewrites.

## Testing

At a minimum, validate your change with:

- `npm run check`
- targeted manual testing for the affected modes
- responsive verification when layout changes are involved
- theme and keyboard checks when interactive UI changes are involved

Use [docs/ManualTests.md](docs/ManualTests.md) as the baseline manual test plan.

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