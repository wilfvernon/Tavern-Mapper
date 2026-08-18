# Tavern Mapper repository instructions

Read `README.md` for product behavior and scope, `TESTING.md` for renderer-migration gates, and `UI_UX_AUDIT.md` before broad interface/accessibility work.

## Non-negotiable distribution contract

The release artifact is `tavern-mapper.html`. It must remain one self-contained HTML file that opens directly from disk and needs no server, installation, account, or network connection. A build step is allowed for authors, but never for end users.

- Author changes in `src/`; run `npm run build` to generate `tavern-mapper.html`.
- Do not hand-edit generated `tavern-mapper.html`.
- Do not add runtime CDN, package, server, or network dependencies.

## Current structure

- `src/app.html`: complete control-window markup.
- `src/styles.css`: complete authored stylesheet.
- `src/main.js`: application orchestration and stateful event wiring.
- `src/core/`: renderer-independent geometry, autosave, and undo logic.
- `src/features/`: AoE, camera, dice, dungeon, and initiative domain logic.
- `src/renderers/canvas2d.mjs`: current Canvas 2D implementation for fog, freeform drawing, grids, markers, AoE, and dungeon layers.
- `src/display/window-manager.mjs`: DPR-aware popup document and self-healing lifecycle.
- `src/ui/`: shared UI helpers.
- `scripts/build.mjs`: esbuild bundle and single-file HTML assembly.
- `tests/*.test.mjs`: direct tests for extracted modules (currently 15 contracts).
- `test-suite.js`: 134 sequential Playwright behavior tests against the built standalone file.

## Build and validation

```sh
npm install
npm run build
npm run test:unit
npm test
```

`npm test` rebuilds first and then drives the real `tavern-mapper.html`. Chromium's Linux runtime libraries are installed in the current dev container. In a fresh container, install them with `sudo -n npx playwright install-deps chromium` before diagnosing browser-launch failures as application failures.

The Playwright suite is mostly sequential and stateful. Tests share one browser page and rely on earlier state. Do not reorder or isolate existing tests without tracing those dependencies. New tests should use an isolated page when practical; otherwise restore map, tab, selection, visibility, and tool state before returning.

## Refactor rules

- Extract one coherent boundary at a time and build/test immediately.
- Preserve behavior and serialized session shape unless a task explicitly changes them.
- Keep renderer-independent state and calculations separate from Canvas 2D, WebGL, or WebGPU implementations.
- Tests must inspect public state or browser-composited output; do not claim an application rendering context from the test suite.
- Keep the shared color picker and recent-color list shared across Draw, Markers, AoE, and Dungeon.
- AoE and Calibrate intentionally share undo history.
- Treat `cs()`, `redraw()`, canvas coordinates, display compositing, persistence, and undo dispatch as cross-cutting high-risk code.
- Preserve the display canvas device-pixel-ratio behavior and self-healing popup behavior.
- The current map cap is 6144px with a 2400px control-preview cap. Do not raise either without rerunning `npm run benchmark:6k`, revisiting memory/performance analysis, and extending the high-resolution tests.

## Known state hazards

- Opening or closing calibration preview UI must not recapture zoom-lock calibration references. Separate tool visibility from committed calibration changes.
- Unlocked AoE calibration compensates inversely for camera zoom: control geometry changes so apparent TV size stays constant. Zoom lock freezes control/map geometry, allowing normal display projection to enlarge it when zooming in and shrink it when zooming out.
- The map-local calibrated-zoom button restores only reference width/height around the current camera center; it must never restore the captured x/y position.
- AoE type controls are intentionally dual-purpose: they set the next-placement default and mutate a selected shape. Test both branches when changing them.
- Marker visibility and size controls are also dual-purpose: they set creation defaults when no marker is selected and mutate the selected marker otherwise. Preserve both branches and reset inspector controls on deselection.
- Dungeon defaults to Paint. Select mode must select without adding strokes, numbered labels/tooltips are control-only, and a stroke must end when the pointer leaves the map.
- Hidden markers and all dungeon segments must never enter the display composite; only markers explicitly marked visible may be composited.
- Freeform drawings are private by default and enter the display composite only when that map's drawing visibility is enabled. Keep Draw undo independent from Fog.
- Initiative AC/HP must never enter the display output.
- Initiative display layout is manipulated only through the control-map overlay; the display panel remains passive. Keep rotation in 90° steps and preserve layout persistence.
- Initiative scores determine initial insertion. Manual card order is authoritative until a score is edited; committing a score re-sorts all cards by score and uses prior manual order only for ties. Keep cards collapsible and map-level Next Turn available whenever combatants exist.
- Initiative controls live in a draggable floating control window that persists across tab changes and supports minimize/close/reopen. Keep annotation text rotation display-only; control labels remain upright.

## WebGL/WebGPU work

Canvas 2D remains the current implementation. Before another renderer becomes default, satisfy every gate in `TESTING.md`, including backend selection, framebuffer parity, fallback, context/device loss, DPR/resize, texture limits, layer ordering, and memory stress.