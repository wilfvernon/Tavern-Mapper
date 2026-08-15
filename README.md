# Tavern Mapper

A single self-contained HTML file for running fog-of-war, area-of-effect templates, a battle grid, dungeon planning notes, and GM-only annotations across one or more maps — with a private control screen for you and a clean, UI-free display for a second screen (e.g. a TV set up like a table over HDMI).

No install, no server, no internet connection, no account. Everything runs client-side in your browser from one `.html` file.

This document has two parts: **Part 1** is the complete as-built scope, so it's clear what actually exists today. **Part 2** is a proposal for restructuring how the app is built — not what it does — because the file has grown to the point where that's worth a real decision rather than continuing by default.

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

- **Map** — Fog, Markers, Grid, Dungeon (things drawn directly on the map surface)
- **Display** — Camera, Calibrate (how the map is framed and scaled)
- **Tools** — AoE, Dice, Init (gameplay utilities)

Clicking a category shows only its own tabs and remembers which one you were last on, so switching between categories doesn't reset your place. The sidebar itself can be resized by dragging the handle on its right edge.

## Maps (slideshow)

- Add any number of map images via the file picker (multi-select) or by dragging files onto the map area.
- Each map keeps its own independent fog, markers, camera framing, grid, calibration, AoE shapes, and dungeon segments — switching away and back preserves everything exactly as left.
- Reorder maps by dragging their thumbnails; Prev/Next buttons cycle through them.
- Removing a map requires confirmation — there is no undo for it.
- New maps default to fully revealed fog and no grid.
- Uploaded images are downscaled to a maximum of 2400px on the longest side at load time (see Part 2 for why this cap exists and what changing it costs today).

## Fog

- Circular brush, reveal or re-cover, adjustable size, soft-edge (feathered) toggle.
- "Cover entire map" / "Reveal entire map" for instant resets.
- A control-only opacity slider lets you see through fog to align strokes against the map underneath — the display screen always renders fog fully opaque regardless of this setting.

## Markers (GM-only — never shown on the display)

- 7 hand-drawn shapes (not emoji, so they can take any color): X, circle, square, triangle, star, skull, treasure chest.
- Click empty space to drop one and label it; click an existing marker to select it (drag to move); double-click to rename (clear text to delete); right-click to delete instantly; Delete/Backspace or a sidebar button removes the selected one; Escape deselects.

## Camera (what the display screen frames)

- A draggable, resizable viewfinder rectangle on your full map view — drag inside to pan, drag a corner to zoom (aspect-locked), scroll/pinch to zoom at the cursor.
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
- **Lock to zoom** — captures the calibration and camera framing as a reference point, then continuously auto-adjusts calibration every time you zoom afterward, so a real-world foot stays the same physical size on the TV regardless of zoom level.
- **Snap to calibrated zoom** — returns to the exact framing used when you locked it, not just an equivalent scale.

## AoE (area-of-effect templates)

- Circle (radius), square (side length), cone (length — per D&D 5e rules, a cone's base width equals its length).
- Rotation via a slider or by dragging an on-canvas handle directly (with `grab`/`grabbing` cursor feedback); for a cone the handle sits exactly at the base-center, for a square just outside one edge.
- Color via the shared picker (see below).
- Click an existing shape to select it — the sidebar becomes a live inspector; editing ft/rotation/color/type updates that specific shape immediately. Note: the shape-type buttons (Circle/Square/Cone) also retroactively change whichever shape is currently selected, not just the default for the next placement.
- Each shape has its own "show on display" toggle (default on); double-click as a shortcut. Hidden shapes still render on your own screen, dashed, so you always know what's prepped.
- Drag to move, Escape to deselect, Delete/Backspace/right-click/button to remove.

## Dungeon Mode (GM-only — never shown on the display)

- Paint freehand segments with a brush, similar to fog, but each segment is a distinct, individually selectable entity rather than a shared mask (hit-testing uses real point-to-line-segment geometry).
- Click an existing segment to select it and keep painting more area into it, or edit its name and a free-text notes field.
- "Start new segment" clears the active one so the next stroke begins something fresh; Escape deselects.
- Deleting a segment requires confirmation, since it can carry substantial written notes.
- Rendered as a translucent colored layer beneath the grid and AoE, with a brighter outline on whichever segment is active.

## Dice

- **Pool** — click any die-type button (d4–d100) and it rolls immediately, adding a removable pill to a running total. Mix different dice freely; remove a misclick and the total recalculates.
- **Formula roll** — a separate NdX+modifier roller with advantage/disadvantage, logged to a persistent history.
- Either the pool or a specific history entry can be revealed to the display (mutually exclusive — only one thing shows on the banner at a time).

## Initiative

- Add combatants with a name and initiative score; sorted automatically, highest first, with the current turn marked `▶`.
- Round counter and Next Turn lead the panel since they're the most-used control during play; Add Combatant sits at the bottom since it's a setup-time action.
- AC (plain number) and HP per combatant, both optional and GM-only (never shown on the display, even when the tracker itself is).
- HP is a **log**, not a single mutable number: type `+N`/`-N` for damage/healing or a plain number to set it outright, and each entry becomes a small removable pill. The current total is computed by replaying the log, so deleting a bad entry recalculates automatically rather than requiring reverse arithmetic. The log is collapsed behind a `▾ N` count badge by default and auto-expands right after you log something.
- "Show on display" reveals just the turn order and names — never AC/HP.

## Shared color picker (Markers, AoE, Dungeon)

- The original 5 preset swatches, plus a native color-wheel input (opens the OS/browser's full picker), plus a "Recently Used" row.
- The recent-colors list is **shared** across all three contexts — a color picked for a marker is immediately available for an AoE shape or a dungeon segment. It's session-only, not saved with the map data.
- Capped at 8 entries, deduplicated (re-picking a recent color moves it to the front).

## Undo

Five independent undo histories per map — Fog, Markers, Camera, Grid, and a combined AoE/Calibrate history (since calibration is stored as part of AoE's per-map data) — plus Dungeon's own. The Undo button relabels itself to show which history is active and disables itself on tabs with no undo concept (Maps, Dice, Init). Switching tabs never discards another tab's history.

## Session persistence

- **Save/Load session** — always reachable from the sidebar footer regardless of active tab. Produces one JSON file with every map, its fog, markers, camera, grid, AoE shapes, calibration state, and dungeon segments, plus shared settings (fog opacity, grid color).
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
| Grid | Yes | Yes |
| AoE shapes | Yes (hidden ones shown dashed) | Only shapes marked visible |
| Dungeon segments | Yes | Never |
| Markers | Yes | Never |
| Initiative AC/HP | Yes | Never (turn order/names only, if shown) |

## Explicitly out of scope

- No player tokens or a full virtual-tabletop feature set — this is fog/grid/markers/AoE/dungeon-notes, not a VTT.
- No networked or multi-device play — one laptop plus one HDMI-connected screen.
- No zoom/pan on the control view itself — only the display camera zooms; your editing view always shows the full map.

---

# Part 2 — Proposal: a modular refactor

## Why this is worth deciding now, not later

The file has grown from 2,057 lines / 63 functions / 104 state variables at the last complexity checkpoint to **3,461 lines / 96 functions / 193 state variables** today — roughly 70–85% growth across every dimension, driven by real features (AoE with rotation and calibration math, the dice pool, the HP log, category navigation, all of Dungeon Mode, the shared color picker). None of it was frivolous, but it's all still living in one flat JavaScript closure with no module boundaries.

Concretely, this has already cost real time and produced real bugs in this project specifically:

- **Cross-feature state bugs that module boundaries would have prevented structurally**, not just caught by testing — the zoom-lock calibration reference getting silently overwritten by an unrelated "show reference square" toggle; the AoE shape-type buttons retroactively mutating whatever shape happened to be selected. Both were real, both shipped once before being caught.
- **Two accidental content-deletions during editing** — a truncated function, a deleted import — both from text-replacement operations on a file this size, both caught only because of a verification habit, not because anything in the file's structure limits the blast radius of a mistake.
- **A 1,390-line test suite that's become load-bearing** — necessary, and a good thing to have, but its size is itself evidence that "read the file and reason about it" stopped being sufficient a while ago.

## What I'm proposing

Not a rewrite of what the app does — a change to how it's built, keeping the single-file, no-install distributable exactly as-is for you as the end user.

**Author in modules, bundle to one file at build time.** This is the same approach TiddlyWiki uses for the same reason: the *distributed* artifact is one HTML file, but the *source* is organized, with real boundaries a compiler enforces rather than boundaries that exist only as a convention I have to remember to respect.

Proposed module split (illustrative, not final):

```
src/
  core/
    state.js          — slide data model, session (de)serialization
    canvas-utils.js    — shared geometry (point-in-poly, distance-to-segment, etc.)
    undo.js            — generic snapshot/undo machinery, parameterized per-mode
  features/
    fog.js
    markers.js
    camera.js
    grid.js
    calibrate.js       — including the zoom-lock math specifically
    aoe.js
    dungeon.js
    dice.js
    initiative.js
  ui/
    tabs.js             — category navigation
    color-picker.js      — the shared picker component
    sidebar.js
  display/
    display-window.js    — composite rendering, self-healing, DPR handling
  main.js                — wiring, boot sequence
```

A build step (e.g. esbuild, which is fast and simple to configure) concatenates and inlines everything into the single `tavern-mapper.html` you already have, including the display-window template as a string. You'd still get one file to double-click — the module split is invisible to you as the user.

## Concrete benefits, including the resolution question

This directly changes the calculus on the earlier resolution discussion, in a few specific ways:

- **Autosave currently re-encodes every loaded map's fog on every write cycle, not just the one you're editing** — a known inefficiency I flagged earlier and never fixed. With real module boundaries around session state, adding per-slide dirty-tracking (only re-encode a slide whose fog actually changed) becomes a contained, low-risk change instead of a cross-cutting edit through a 3,000-line file. This alone removes the part of the resolution cost that scales with how many maps you have open, independent of the cap itself.
- **The live per-frame redraw cost — the part of the earlier benchmark that actually matters most for how the app feels to use — becomes tractable to optimize with clean layer ownership.** Right now, `redraw()` does a full-canvas blit every mousemove. With isolated rendering modules, techniques like dirty-rect tracking (only repaint the region that changed) or moving to `OffscreenCanvas` + a Web Worker for the expensive parts become realistic to implement correctly, rather than risky changes to a function everything else already depends on.
- **Encoding work (PNG/JPEG) could move off the main thread into a Web Worker**, which is the single biggest lever on the "would raising the resolution cap cause noticeable UI hitches" question — it directly targets the 300ms one-time map-load pause and the periodic autosave cost measured earlier. This is meaningfully harder to retrofit safely into the current single-closure structure than into isolated modules.
- **Together, these three changes would make raising the map resolution cap (2400px today) substantially cheaper than it is now** — not free, but no longer carrying the main-thread-blocking costs that were the real concern in that earlier conversation. Whether to actually raise it would still be your call, but the refactor is what removes the strongest argument against it.
- **A real type-checking pass (TypeScript, even loosely applied) would have caught both of the specific bug classes described above** at write-time rather than requiring me to think to test for them — the calibration-reference stomping and the shape-type retroactive-mutation bug were both "this function assumed a shape of data that didn't hold in this one call site" bugs, exactly what a type system is good at catching mechanically.
- **Smaller, isolated files make my own edits meaningfully safer** — a text-replacement mistake in a 150-line `fog.js` has an obviously smaller blast radius than the same mistake in a 3,000-line closure, and is much easier to verify correctly.

## What this costs

- **A real build step** — `npm run build` or equivalent, rather than editing the shipped HTML directly. Development iteration adds a compile step; the end result you download is unaffected.
- **Genuine restructuring effort** — pulling ~3,000 lines apart into ~15 modules along the boundaries above, then re-verifying the *entire* existing test suite passes against the rebuilt output before trusting it. This is not a quick pass; it's comparable in scope to one of the larger feature builds already done this session (Dungeon Mode, say), not a small cleanup.
- **Some ongoing discipline** — module boundaries only help if respected going forward; it's possible to write bad, tightly-coupled modules just as it's possible to write bad flat code. The payoff is that the *tooling* now makes violations visible (a module reaching into another's private state has to do so explicitly, through an export) rather than silent.

## My recommendation

Do this before the next subsystem-sized feature, not after. Dungeon Mode and the dice pool were each roughly Grid/AoE-sized additions, and I already flagged after the *first* complexity check that there was room for "one or two more" before a restructure became the right call — we've had more than that since. If there's another feature of similar size coming, I'd build the module boundaries first and add the feature into them, rather than adding a tenth subsystem to the flat closure and refactoring around it afterward.

If the app is close to feature-complete for what you actually need, the honest alternative is: leave it as-is, keep leaning on the test suite the way we have been, and accept that future changes carry slightly more risk than they would in a modular version. That's a legitimate choice too — it just shouldn't be the default by omission.
