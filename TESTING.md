# Testing strategy

The end-to-end suite treats rendered browser pixels as the public contract. It does not claim a `2d`, `webgl2`, or `webgpu` context from an application surface, so the same behavior tests can run against each renderer.

## Current gates

| Contract | Coverage |
|---|---|
| Map loading, switching, 6144px downscaling, bounded control preview | End-to-end |
| Fog painting, opacity separation, undo | End-to-end framebuffer assertions |
| Grid state and per-map isolation | End-to-end |
| Marker opt-in display, hidden-marker privacy, and dungeon display exclusion | Before/after display framebuffer assertions |
| Marker/AoE/dungeon selection glow and interaction cursors | End-to-end framebuffer and cursor assertions |
| Dungeon flat-opacity overlap and canvas-boundary stroke termination | Isolated end-to-end framebuffer/state assertions |
| Dungeon numbering/label layout/tooltips and marker size defaults/editing/persistence | Unit and end-to-end assertions |
| Accessible names/states, keyboard rows/resize/tabs, live status, narrow layout, touch pointer input | End-to-end assertions |
| Camera state, dimmed viewport, direct zoom/readout, center/fit, pointer controls, and undo | End-to-end framebuffer/state assertions |
| Inline map rename, keyboard map switching, and session-name persistence | End-to-end |
| AoE geometry, editing, visibility, calibration | Unit and end-to-end framebuffer assertions |
| Display DPR sizing | End-to-end at DPR 2 |
| Session export/import and malformed data | End-to-end |
| Autosave and resume | End-to-end with IndexedDB |
| Dice and initiative display output | End-to-end |
| Test runner failure propagation | Nonzero process exit on any failed case |

## Required before a WebGL/WebGPU renderer becomes default

These are migration gates, not optional follow-ups:

1. Run the same behavior suite against every available backend through an explicit renderer selection hook such as `?renderer=canvas2d`, `?renderer=webgl2`, and `?renderer=webgpu`.
2. Add framebuffer parity fixtures for map, fog, grid, AoE, calibration, markers, dungeon, and camera crops. Compare with a small per-channel tolerance rather than exact hashes across GPU vendors.
3. Test WebGL context loss/restoration and WebGPU `device.lost`, including preservation of authored state and successful redraw after recovery.
4. Test fallback order when WebGPU is unavailable, adapter/device creation fails, or required WebGL extensions are absent.
5. Test resize, DPR changes, and display-window movement between screens after renderer initialization.
6. Test maximum-size maps against GPU texture limits and verify tiling/downscaling behavior explicitly.
7. Add alpha, premultiplication, color-space, texture-filtering, and layer-order fixtures. These commonly differ between Canvas 2D and GPU compositors.
8. Add repeated create/destroy and map-switch stress tests with bounded GPU memory growth.
9. Add pointer, wheel, and touch-coordinate tests at non-1 DPR and under CSS scaling.
10. Run browser coverage in Chromium and Firefox for WebGL; run WebGPU gates only where the browser/CI adapter supports it, while always exercising the fallback path.

Do not replace behavior assertions with checks for API calls, shader compilation, or mocked GPU objects. A renderer can issue plausible commands and still produce the wrong frame.
