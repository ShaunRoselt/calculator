# Roselt Calculator for Counter-Strike 2

Roselt Calculator is a standalone CS2 Workshop addon. Open the CS2 developer console and run `map calculator`. The calculator opens on spawn. Use the top-left menu to change modes or open Settings.

The native HUD uses the original calculator engine for standard, scientific, programmer, graphing, date calculation, and all unit converter modes. It includes history and memory, undo and redo, programmer bit toggles, a calendar and direct date entry, themes, languages, and repeat equals.

## Play locally

Run `./cs2/launch.sh` from the calculator checkout to start CS2 with the installed map. If CS2 is already running, enter `map calculator` in its console.

Open **Graphing**, enter a function with the keypad, and use the blue Enter key to plot it. The expression row opens function analysis and line styling. Turn on tracing and click the plot to sample the curve. Click a unit to choose from the full list. In Currency, select the search field to open the on-screen search keys.

The CS2 chat commands `!undo`, `!redo`, and `!paste 12.34` work in the calculator modes. Use `!plot sin(x)` for expressions, `!hidecalculator` to release the HUD cursor, and `!calculator` to reopen it. The same commands can be entered through `say` in the CS2 developer console.

## Workshop HUD differences

Panorama map scripting provides panels, labels, images, and button clicks. Graphs use native line segments and sampled layers. Graph tracing uses clicks and panning uses the controls under Graph Options. Text entry uses the on-screen keys or CS2 chat. The original app handles operating-system clipboard access, customizable raw keyboard bindings, and graph image export. Currency uses the bundled exchange-rate snapshot. System theme uses Dark, and Gregorian date formatting is embedded for the supplied languages when the engine lacks locale data. On narrow and portrait render surfaces, use the History icon to open History and Memory, and use the Graph and Expressions icons to switch graphing views. Converter controls stack above the keypad. [Valve’s Workshop HUD notes](https://www.counter-strike.net/news/cs2-updates)

## Rebuild

From the calculator checkout, run `python3 cs2/build.py`. The build requires Python, Node.js, npm, `rsvg-convert`, and the installed CS2 Workshop Tools. On Steam Deck it runs Valve’s Windows tools via Proton Experimental in a dedicated build prefix. Set `CALCULATOR_CS2_DIR` if CS2 is installed outside the default Steam library. Use `CALCULATOR_PROTON` or `CALCULATOR_PROTON_PREFIX` to select a Proton executable or build prefix. Use `CS2_WORKSHOP_WINDOWS_RUNTIME` or `CALCULATOR_COMPILER_BIN` to select a matching Windows tools installation.

The standalone map, native HUD, and build scripts live in `cs2/`. The build imports the shared button definitions and calculation logic directly from `scripts/` and uses the original calculator assets. It generates the native UI in a staging directory, compiles `cs2/maps/calculator.vmap`, verifies the bundled resources, and installs the VPK into CS2 for local play and Workshop packaging.

The map uses the browser app’s Selawik typeface when installed in the local font library and otherwise uses a system fallback. The fonts and license are in `assets/fonts/Selawik`.

To regenerate the baked theme previews and layered backgrounds after changing the browser themes, run `python3 cs2/serve.py` and open it in a Playwright CLI session from the checkout. Run `playwright-cli run-code --filename cs2/capture_theme_surfaces.js` in that session, then rebuild the map.
