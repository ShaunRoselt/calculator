<p align="center">
  <img width="160" align="center" src="assets/logos/logo-dark.svg">
</p>
<h1 align="center">
  Roselt Calculator
</h1>
<h2 align="center">
  Installable all-in-one calculator app for everyday math, technical work, and quick problem solving.
</h2>

This document tracks release summaries for Roselt Calculator.

Roselt Calculator is built to cover quick everyday calculations, deeper technical workflows, and installable cross-device use in one app.

## Release Notes

* [Version 12.2.2 (26/11/2026)](#version-1222-26112026)
* [Version 12.2.1 (26/11/2026)](#version-1221-26112026)
* [Version 12.0.0 (10/04/2026)](#version-1200-10042026)
* [Version 1.0.0 (05/04/2026)](#version-100-05042026)


## Version 12.2.2 (26/11/2026)

- Navigate calculator modes, menus, and settings with a gamepad. Use the D-pad or left stick to move, A to select, and B to go back.
- Keep focus on the same calculator key when the display updates, and return to the previous control when a menu closes.
- Pan graphs with the right stick.
- Open Steam’s on-screen keyboard by selecting a text field with a controller where Steam supports the keyboard.
- Fit the desktop window to smaller displays on first launch.
- Fixed macOS packaging so Electron’s framework links still work after the app is moved or installed.

## Version 12.2.1 (26/11/2026)

- Fixed calculation chaining, repeat equals, and memory recall in Standard and Scientific modes.
- Fixed signed-value recall across bases and word sizes in Programmer mode and corrected date calculations around daylight saving changes and month boundaries.
- Corrected unit conversion examples and updated currency defaults for Curaçao and Sint Maarten to the Caribbean guilder.
- Improved graph analysis and made the web calculator available offline after the first successful load and cache setup.
- Made desktop settings saves more reliable and fixed the Flatpak launcher.
- Improved keyboard access, contrast across themes, and layouts on narrow screens.

## Version 12.0.0 (10/04/2026)
![Roselt Calculator - Version 12.0.0](docs/Images/CalculatorScreenshot.png)
- Rebranded the project as Roselt Calculator and launched a public-facing website for the installable app.
- Added desktop packaging support with Electron, Flatpak, portable Windows builds, AppImage packaging, and Flathub submission prep.
- Expanded customization with multilingual support, a much larger theme catalog, dedicated theme selection UI, per-theme CSS files, theme preloading, and a live themes showcase page.
- Continued polishing the shipped 12.0.0 experience with responsive layout work, refreshed logos and screenshots, currency localization, and clearer settings organization.

## Version 1.0.0 (05/04/2026)
- Shipped the standalone web calculator foundation with Standard, Scientific, Programmer, and Graphing calculator workflows in one app shell.
- Added converter tooling for currency, unit, and date calculations, along with history and memory improvements across modes.
- Introduced the first settings page, responsive layout tuning, tooltip coverage, Windows-style UI parity work, and Progressive Web App support.
