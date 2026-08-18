# Tavern Mapper

A single self-contained HTML file for running fog-of-war, area-of-effect templates, a battle grid, dungeon planning notes, and GM-only annotations across one or more maps — with a private control screen for you and a clean, UI-free display for a second screen (e.g. a TV set up like a table over HDMI).

No install, no server, no internet connection, no account. Everything runs client-side in your browser from one `.html` file.

This document has two parts: **Part 1** describes the current application behavior. **Part 2** describes how the modular source is built and tested while preserving the single-file release.

---

# Part 1 — Current functionality and scope

## Running it

1. Save `tavern-mapper.html` anywhere on your computer and double-click it.
2. Set your second screen to **Extend** (not duplicate) in your OS display settings.
3. Click **"Open display window"** in the sidebar header — a second, bare browser window appears. Drag it to your second screen and press **F11** for fullscreen.
4. Everything you do on the control screen updates the display live, with no network involved.

## Navigation

The sidebar is a fixed header (display button + tabs), an independently scrolling body (the current tab's tools), and a fixed footer (Save/Load session, Undo) — so the header and footer are always reachable regardless of how long the current tab's content is.

Tabs are organized into three categories, plus **Maps** standing alone as the entry point:

- **Map** — Fog, Draw, Markers, Grid, Dungeon (things drawn directly on the map surface)
- **Display** — Camera, Calibrate (how the map is framed and scaled)
- **Tools** — AoE, Dice, Init (gameplay utilities)

Clicking a category shows only its own tabs and remembers which one you were last on, so switching between categories doesn't reset your place. The sidebar itself can be resized by dragging the handle on its right edge.

The map's Hand selector can be dragged to any comfortable position in the workspace. Its position persists with the session; a click or keyboard activation still arms the one-shot universal selector.

## Maps (slideshow)

- Add any number of map images via the file picker (multi-select) or by dragging files onto the map area.
- Each map keeps its own independent fog, markers, camera framing, grid, calibration, AoE shapes, and dungeon segments — switching away and back preserves everything exactly as left.
- Reorder maps by dragging their thumbnails; Prev/Next buttons cycle through them.
- Rename maps inline from the slideshow; names persist in exported and autosaved sessions.
- Global Annotation Text Size keeps marker and dungeon labels readable across small and 6K maps. Rotate Display Text turns display-visible marker labels in 90° steps while control labels remain upright. Both settings persist with the session.
- Removing a map requires confirmation — there is no undo for it.
- New maps default to fully revealed fog and no grid.
- Uploaded images are downscaled to a maximum of 6144px on the longest side. The always-full-map control view uses a bounded 2400px preview, while map coordinates, fog data, saved images, and display-camera crops retain the full imported resolution.

## Fog

- Circular brush, reveal or re-cover, adjustable size, soft-edge (feathered) toggle.
- "Cover entire map" / "Reveal entire map" for instant resets.
- A control-only opacity slider lets you see through fog to align strokes against the map underneath — the display screen always renders fog fully opaque regardless of this setting.

## Markers

- 7 hand-drawn shapes (not emoji, so they can take any color): X, circle, square, triangle, star, skull, treasure chest.
- Click empty space to drop one and label it; click an existing marker to select it (drag to move); edit its persistent name field or double-click to focus that field; right-click to delete instantly; Delete/Backspace or a sidebar button removes the selected one; Escape deselects.
- A marker can optionally be shown on the display. The toggle sets the default for newly created markers when nothing is selected, and edits the selected marker otherwise. Existing and legacy markers default hidden.
- Marker size works the same way: the slider sets the creation default when nothing is selected and resizes the selected marker otherwise. Size is saved per marker and applies on both control and display screens.
- Hovering a marker uses a grab cursor, dragging uses grabbing, and the selected marker glows.

## Freeform Drawing

- Draw colored freeform annotations directly over each map with an adjustable brush.
- Switch to Erase to remove parts of the drawing without affecting the underlying map or fog.
- Drawings are private by default and can be toggled onto the display per map.
- Clear removes the entire drawing layer and can be immediately undone.
- Drawing has its own per-map undo history, independent from Fog and the other tools.
- The full-resolution drawing layer is created only after a map is drawn on, so unused maps do not pay the extra canvas-memory cost.

## Camera (what the display screen frames)

- The display viewport is a bright labeled rectangle, with the map outside it dimmed so framing is immediately visible.
- New maps default to a centered 16:9 TV frame. Camera settings also offer 16:10, 4:3, 3:2, 21:9, Source image, and Current framing; the choice is stored per map.
- Aspect ratio and zoom are independent: changing ratio reshapes the frame at the same zoom percentage, while zoom changes scale without changing ratio. Only Fit aspect resets zoom to 100%.
- Drag inside to pan, drag a corner to resize (aspect-locked), click outside to recenter, or scroll/pinch to zoom at the cursor.
- A direct Display Zoom slider shows the current percentage, with grouped zoom out, Fit aspect, zoom-in, and center-view commands. Fit aspect restores the largest centered frame using the selected ratio without distorting the map.
- Standard resize cursors on the corners, a move cursor inside the box, reset to default crosshair outside it and when leaving the tab.
- Your own editing view always shows the full map, unaffected by the camera; it only controls what the display shows.

## Grid

- Toggle on/off, square size, X/Y offset (to align with map art), opacity — all per map.
- Line color is the one setting shared across all maps.
- Renders on top of everything on both screens, including over still-hidden fog, so it stays a consistent reference.

## Calibrate (per map; only relevant without a grid — grid maps auto-lock to 1 square = 5ft)

This determines how many pixels equal a foot on a given map, which is what every AoE shape's size is computed from.

- **Manual entry** — a raw "pixels per 5ft square" number.
- **Draw a line** — pick a reference length (5/10/30/custom ft), drag a line on the control canvas. It renders live on both screens at whatever zoom the display currently is, so you can hold a physical ruler up to the TV and calibrate against what's actually showing.
- **Reference square** — same reference-length picker; a dashed square appears centered on whatever the camera currently frames, and you nudge the manual number while watching it resize on the TV.
- **Lock to zoom** — unlocked calibration compensates for camera zoom so AoEs retain the same apparent TV size as at calibration time. Locking freezes map/control geometry instead, so normal camera projection makes AoEs grow on the TV when zooming in and shrink when zooming out.
- **Return to calibrated zoom** — a map-overlay button appears only when the current zoom differs from the locked reference. It restores the reference zoom level around the current camera center without restoring the old camera position.

## AoE (area-of-effect templates)

- Circle (radius), square (side length), cone (length — per D&D 5e rules, a cone's base width equals its length).
- Rotation via a slider or by dragging an on-canvas handle directly (with `grab`/`grabbing` cursor feedback); for a cone the handle sits exactly at the base-center, for a square just outside one edge.
- Color via the shared picker (see below).
- Click an existing shape to select it — the sidebar becomes a live inspector; editing ft/rotation/color/type updates that specific shape immediately. Note: the shape-type buttons (Circle/Square/Cone) also retroactively change whichever shape is currently selected, not just the default for the next placement.
- Each shape has its own "show on display" toggle (default on); double-click as a shortcut. Hidden shapes still render on your own screen, dashed, so you always know what's prepped.
- Drag to move, Escape to deselect, Delete/Backspace/right-click/button to remove.

## Dungeon Mode (GM-only — never shown on the display)

- Paint freehand segments with a brush, similar to fog, but each segment is a distinct, individually selectable entity rather than a shared mask (hit-testing uses real point-to-line-segment geometry).
- Paint is the default tool. It creates a segment or adds strokes to the active one.
- Select mode clicks an existing segment without painting, allowing its name, notes, or color to be edited. Selectable segments use a pointer cursor.
- Segments receive stable per-map numbers. The control canvas fits `#number + name` into the largest painted component where space allows, falling back to the number for very small areas.
- Clicking a segment in Select mode opens a control-only tooltip with its number, name, and description/notes.
- "Start new segment" clears the active one so the next stroke begins something fresh; Escape deselects.
- Deleting a segment requires confirmation, since it can carry substantial written notes.
- Rendered as a translucent colored layer beneath the grid and AoE, with a glow on whichever segment is active.
- Paint opacity is flat across each segment: retracing or crossing the same area does not make it darker. A stroke ends when the pointer leaves the map, so returning cannot draw a connecting line across the canvas.
- Selected markers, AoE shapes, and dungeon segments all use a consistent control-screen glow.

## Dice

- **Pool** — click any die-type button (d4–d100) and it rolls immediately, adding a removable pill to a running total. Mix different dice freely; remove a misclick and the total recalculates.
- **Formula roll** — a separate NdX+modifier roller with advantage/disadvantage, logged to a persistent history.
- Either the pool or a specific history entry can be revealed to the display (mutually exclusive — only one thing shows on the banner at a time).

## Initiative

- Add combatants with a name and initiative score; new cards are initially inserted by score, highest first, with ties kept in creation order.
- Drag cards by their handles to manually resolve ties or override score order. Manual order persists until a score is edited; committing a score re-sorts all cards by score, using the previous manual order to resolve ties. Cards can then be dragged again.
- Initiative scores remain editable inline. Each card is compact by default and expands to show AC/HP details.
- Add named text columns for encounter-specific information such as conditions or concentration. Every column has its own Display toggle; hidden columns remain GM-only.
- Each combatant has a purple four-point reaction button. Marking it records that the reaction was used, and it automatically becomes available when that combatant's next turn starts.
- Expanded cards provide explicit `+`, `−`, and `=` HP buttons: enter an amount, then add, subtract, or set HP. Every operation remains in the removable HP log.
- Next Turn is always available as a map-overlay command whenever combatants exist, regardless of the active sidebar tool.
- AC (plain number) and HP per combatant, both optional and GM-only (never shown on the display, even when the tracker itself is).
- HP is a **log**, not a single mutable number: set the initial value, then use `+`, `−`, or `=` for later changes. Each entry becomes a removable pill, and deleting a bad entry recalculates the total automatically. History stays collapsed behind a clearly labeled count until opened.
- "Show on display" reveals turn order, reaction availability, names, and only the custom columns explicitly marked for display — never AC or HP.
- The Initiative button beneath Open Display opens the controller without changing the active map tool. A control-only upright tracker preview appears over the map while the controller is open; drag it to position the display tracker, resize from its corner, or rotate the display in exact 90° steps.
- The Initiative controller is a draggable, resizable floating window over the control map. It remains open across tab changes, can be minimized or closed, and its geometry persists with the session.

## Shared color picker (Draw, Markers, AoE, Dungeon)

- The original 5 preset swatches, plus a native color-wheel input (opens the OS/browser's full picker), plus a "Recently Used" row.
- The recent-colors list is **shared** across drawing, markers, AoE, and Dungeon — a color picked in one context is immediately available in the others. It's session-only, not saved with the map data.
- Capped at 8 entries, deduplicated (re-picking a recent color moves it to the front).

## Undo

Independent undo histories are maintained per map for Fog, Draw, Markers, Camera, Grid, Dungeon, and a combined AoE/Calibrate history. The Undo button relabels itself for the active tool and disables itself on tabs with no undo concept (Maps, Dice, Init). Switching tabs never discards another tool's history.

## Session persistence

- **Save/Load session** — always reachable from the sidebar footer regardless of active tab. Produces one JSON file with every map, its fog, drawing layer/visibility, markers, camera, grid, AoE shapes, calibration state, and dungeon segments, plus shared settings (fog opacity, grid color).
- **Silent autosave** — runs in the browser's IndexedDB a second or so after any change, with a one-click "Resume previous session?" banner on reload. This is a crash-recovery safety net, separate from the exportable file.
- **Defensive loading** — session files are sanitized on load; corrupted or hand-edited values are clamped to safe defaults rather than crashing or hanging the app.

## Display window

- Opens as a second, bare browser window with no toolbars.
- **Self-healing** — a background check restores its content automatically if it gets wiped (e.g. an accidental refresh).
- **Correctly sized for HiDPI/4K displays** — the canvas buffer matches the screen's actual physical pixel resolution (`viewport × devicePixelRatio`), not just the CSS viewport size, so it isn't upscaled and blurry on displays where the OS reports scaling other than 100% (very common on 4K TVs).

## What's shown where

| Layer | Control screen | Display screen |
|---|---|---|
| Map + fog | Yes (fog dimmable, control-only) | Yes (fog always fully opaque) |
| Freeform drawing | Yes | Only when the map's drawing layer is marked visible |
| Grid | Yes | Yes |
| AoE shapes | Yes (hidden ones shown dashed) | Only shapes marked visible |
| Dungeon segments | Yes | Never |
| Markers | Yes | Only markers marked visible |
| Initiative AC/HP | Yes | Never (turn order/names only, if shown) |

## Explicitly out of scope

- No player tokens or a full virtual-tabletop feature set — this is fog/drawing/grid/markers/AoE/dungeon-notes, not a VTT.
- No networked or multi-device play — one laptop plus one HDMI-connected screen.
- No zoom/pan on the control view itself — only the display camera zooms; your editing view always shows the full map.
- Browser-native pinch zoom is suppressed over the map so it cannot scale the toolbar. In Camera mode, wheel/trackpad pinch over the map changes the display camera instead; the sidebar remains fixed.

---

# Part 2 — Architecture and development

## Distribution contract

The release is still exactly one file: `tavern-mapper.html`. It contains all markup, CSS, application JavaScript, modules, and display-window code. End users can copy or download that file alone and open it directly; they do not need Node.js, npm, a server, or the source tree.

The build rejects external script, stylesheet, module, and network references so this offline contract cannot be broken accidentally.

## Source of truth

- `src/` is the authored application source.
- `tavern-mapper.html` is generated by `npm run build`; do not edit it by hand.

## Source layout

```text
src/
  app.html                     control-window markup
  styles.css                   complete authored stylesheet
  main.js                      stateful orchestration and event wiring
  core/
    autosave.mjs               IndexedDB storage and debounce policy
    geometry.mjs               shared geometry calculations
    map-limits.mjs             6144px map and 2400px preview limits
    undo.mjs                   immutable snapshots and bounded histories
  display/
    window-manager.mjs         DPR-aware popup and self-healing lifecycle
  features/
    aoe.mjs                    AoE geometry
    camera.mjs                 camera hit-testing, drag, and zoom math
    dice.mjs                   dice primitives
    dungeon.mjs                dungeon hit-testing, numbering, and labels
    initiative.mjs             initiative sorting and HP replay
  renderers/
    canvas2d.mjs               current map/fog/grid/marker/AoE/dungeon renderer
  ui/
    color-picker.mjs           shared picker and recent-color registry
    escape-html.mjs            display-output escaping
```

`scripts/build.mjs` bundles these modules with esbuild and assembles the standalone HTML artifact.

## Build and run

```sh
npm install
npm run build
```

Then open `tavern-mapper.html` directly. On this VS Code/dev-container setup:

```sh
"$BROWSER" tavern-mapper.html
```

## Validation

```sh
npm run test:unit   # 15 direct module contracts
npm test            # rebuild + 134 sequential Playwright behavior tests
npm run check       # build + unit + browser suites
```

The Playwright suite is intentionally sequential and stateful. Do not reorder or isolate existing cases without tracing their setup dependencies. New scenarios should use an isolated page where practical or restore map, tab, selection, visibility, and tool state afterward.

Renderer-independent coverage and the gates required before WebGL/WebGPU could become the default are documented in [TESTING.md](TESTING.md).

The measured accessibility, keyboard, responsive-layout, feedback, and interaction audit is documented in [UI_UX_AUDIT.md](UI_UX_AUDIT.md). Its recommendations use native HTML, CSS, and JavaScript only.

## High-resolution Canvas path

The current maximum map dimension is 6144px. The private control view uses a bounded 2400px backing canvas while logical map coordinates, fog, sessions, and display-camera crops retain full resolution.

The 6K work also:

- Retains original compressed image data for in-cap imports.
- Caches fog serialization until fog changes.
- Stores fog undo as replayable actions instead of full-resolution canvas copies.
- Coalesces high-frequency pointer redraws.
- Keeps the session JSON shape backward compatible.

Run the reusable benchmark with:

```sh
npm run benchmark:6k
```

It writes `benchmark-6k.json` with import, fog, camera, display, autosave, export, restore, two-map, and memory-floor measurements. Container timings are useful for regressions; release decisions should also use the intended laptop/TV hardware.

The conditional WebGL2/tiling plan is documented separately in [RENDERER_PROPOSAL.md](RENDERER_PROPOSAL.md). Tiling is not part of the current implementation and should be considered only if requirements move materially beyond the tested 6K Canvas path.
