# Tavern Mapper Rendering and High-Resolution Map Proposal

## Objective

Improve map resolution and rendering performance without changing Tavern Mapper's user-facing behavior or distribution model.

The application must continue to:

- Ship as one self-contained `tavern-mapper.html` file.
- Open directly from disk using `file://`.
- Require no server, installation, account, or network connection.
- Present every uploaded map as one continuous image.
- Preserve existing controls, coordinate behavior, saved-session shape, fog behavior, display privacy, and second-window operation.

## Current implementation status

The near-term Canvas 2D path is implemented:

- Maximum map dimension: 6144px.
- Maximum control-preview backing dimension: 2400px.
- Full-resolution logical coordinates, fog, sessions, and display-camera crops.
- Original compressed data retained for imports already within the cap.
- Fog data re-encoded only after fog changes.
- Fog undo stored as compact replayable actions instead of full-canvas snapshots.
- High-frequency interaction redraws coalesced by animation frame.
- Reusable `npm run benchmark:6k` command and checked-in `benchmark-6k.json` report.
- Current test inventory: 15 module contracts and 134 browser behavior cases.

The current benchmark verifies 6144×4096 import, fog, camera, popup display, autosave, export, restore, and two loaded maps without page errors. It also records a minimum decoded map+fog memory floor of approximately 192 MiB per 6144×4096 slide. Timings from the headless dev container are regression evidence, not a substitute for target-laptop measurements.

Not implemented: Worker preprocessing/encoding, WebGL2, WebGPU, tiling, GPU cache management, or cross-renderer framebuffer parity.

## Decision Required Before Implementation

The current requirement is implemented at 6144px with Canvas 2D. A larger target must be established before choosing any additional rendering architecture.

The original measured problem was that the 2400px cap felt restrictive. The first Canvas 2D optimization step now supports 6144px maps with a bounded 2400px control preview and a reusable benchmark. Common TTRPG map exports generally remain below 6K-8K. A tiled deep-zoom renderer remains justified only if maps materially above 8K become a real product requirement rather than hypothetical headroom.

Use this decision rule:

| Required map size | Recommended approach |
|---|---|
| Up to 6144px | Use the implemented Canvas 2D path and validate `npm run benchmark:6k` on target hardware |
| 6144-8192px | Profile first; add Worker preprocessing only for measured stalls, then consider WebGL2 if budgets still fail |
| Regularly above 8192px | Introduce WebGL2 and evaluate tiled rendering |
| 12K-16K or deep world maps | WebGL2 tiled multi-resolution rendering is justified |

## Revised Recommendation

Take the smallest measured step first:

1. Keep Canvas 2D as the renderer. **Done.**
2. Support and benchmark 6144px maps. **Done in the dev container; target-hardware run still recommended.**
3. Avoid re-encoding unchanged fog and remove full-canvas fog undo snapshots. **Done.**
4. Move expensive preprocessing/encoding to a Worker only if target-hardware profiling still shows unacceptable stalls. **Not yet justified.**
5. Escalate to WebGL2 only if 6K-8K maps fail agreed budgets or larger maps become confirmed requirements.

If a GPU renderer becomes necessary, use **WebGL2 first**, retain Canvas 2D as fallback, and keep WebGPU as a possible later backend.

### Why WebGL2

- Broad, mature desktop-browser support.
- Suitable for local `file://` applications.
- Sufficient for tiled images, fog masks, grids, AoE shapes, markers, and compositing.
- Predictable context-loss and restoration behavior.
- Lower implementation and compatibility risk than WebGPU.
- Easier to validate against the existing Canvas 2D renderer.

### Why not WebGPU initially

- Uneven browser and hardware support.
- More complex asynchronous initialization.
- Additional adapter and device-loss handling.
- No decisive advantage for this primarily 2D workload.
- A well-designed renderer abstraction can accommodate it later.

## Why WebGL2 If Escalation Is Needed

Do not simply upload a larger map as one large GPU texture.

A single RGBA image consumes approximately:

$$
\text{memory bytes} = width \times height \times 4
$$

A $10{,}000 \times 10{,}000$ image consumes approximately 400 MB before mipmaps, fog textures, working buffers, browser copies, and rendering overhead. With mipmaps, the map texture alone approaches 533 MB.

For a confirmed 12K+ target, use a tiled, multi-resolution map representation. For a 4K-6K target, this cost is probably unnecessary.

## Scope and Relative Complexity

These levels compare architectural scope; they are deliberately not calendar estimates.

| Option | Scope | Complexity | Principal risks |
|---|---|---:|---|
| 6K Canvas path | Bounded preview, cached serialization, compact fog undo, benchmark | Implemented | Memory pressure on weaker machines |
| Worker preprocessing | Inline Blob Worker plus fallback and persistence sequencing | Medium | Worker/file compatibility, races |
| WebGL2 parity renderer | Renderer contract, backend, fallback, context recovery, parity infrastructure | Large | Visual parity, lifecycle, browser/GPU differences |
| Tiled multi-resolution WebGL2 | Tile levels, cache, seams, tiled fog, stress testing | Very large | Complexity, memory management, artifacts |
| WebGPU backend | Separate backend, fallback, device loss, browser qualification | Large additional project | Compatibility and operational complexity |

The full tiled proposal is comparable in scope to a substantial portion of the existing application. It is not justified by the already-solved move from 2400px to 6144px.

## Relationship to the Existing Module Refactor

This work is not independent of the modular refactor.

The refactor has extracted Canvas 2D drawing into `src/renderers/canvas2d.mjs` and separated renderer-independent geometry, camera, dungeon, undo, autosave, dice, initiative, display-lifecycle, and UI helpers. Future renderer work must continue that architecture rather than start a second restructuring effort.

Sequence them as follows:

1. Finish the renderer-neutral boundary as part of the existing modular refactor.
2. Make Canvas 2D satisfy that boundary without behavior changes.
3. Implement Canvas performance improvements behind that boundary.
4. Add another backend only if benchmark or map-size gates require it.

Do not build WebGL2 and finish the module split as parallel, competing refactors.

## Proposed Architecture

```text
Application state
    |
    v
Renderer-neutral scene description
    |
    +-- Canvas2DRenderer
    |      Current renderer and preferred near-term path
    |
    +-- WebGL2Renderer
    |      Conditional backend if measurements justify it
    |
    +-- WebGPURenderer
           Possible future backend
```

Feature code must operate only in global map coordinates and must not know that tiles exist.

A conceptual renderer contract:

```js
renderer.initialize(surface, options);
renderer.setMap(mapResource);
renderer.resize(cssWidth, cssHeight, devicePixelRatio);
renderer.updateFog(update);
renderer.render(scene);
renderer.handleResourceLoss();
renderer.dispose();
```

A renderer-neutral scene should include:

```js
{
  map,
  camera,
  fog,
  drawing,
  grid,
  aoeShapes,
  markers,
  dungeonSegments,
  calibrationGuides,
  visibility
}
```

Control and display windows should use the same scene state but have separate renderer instances.

## Conditional Tiled Map Representation

This section applies only if regular use of maps above approximately 8K is confirmed or the optimized Canvas path fails agreed performance budgets.

Split imported maps into fixed-size tiles and generate progressively smaller resolution levels.

Example:

```text
Level 0: original resolution
Level 1: 1/2 width and height
Level 2: 1/4 width and height
Level 3: 1/8 width and height
...
```

Recommended initial tile size:

```text
1024 x 1024 pixels
```

At render time:

1. Choose the resolution level closest to the current screen-pixel density.
2. Determine which tiles intersect the camera viewport.
3. Upload missing visible tiles to the GPU.
4. Render only visible tiles.
5. Evict old textures through an LRU cache.
6. Keep GPU memory below a configurable budget.

An initial development cache ceiling might be:

```text
256 MB
```

This must not remain an unconditional production constant. A production policy should:

- Use a conservative default for unknown/integrated GPUs.
- Apply lower limits on constrained devices.
- Consider renderer allocation failures and observed pressure.
- Allow a bounded higher tier where capability and testing justify it.
- Always enforce an absolute ceiling and release map resources eagerly.

WebGL does not expose a reliable "available GPU memory" value, so adaptation must be policy-based rather than pretending precise VRAM detection is possible.

## User-Facing Behavior

Tiling must remain completely invisible to users.

The map must continue to behave as one continuous image:

- Coordinates remain global map coordinates.
- Fog strokes cross tile boundaries normally.
- Markers and AoE shapes retain their positions.
- Dungeon segments remain continuous.
- Grid and calibration calculations remain unchanged.
- Camera movement remains seamless.
- Save/load behavior remains compatible.
- Users upload one image and interact with one map.
- Users never manage, select, or see individual tiles.

If a user can identify a tile boundary, the renderer is incorrect.

## Control and Display Resolution

The control and display views should select resolution independently.

### Control view

The control view normally displays the entire map. It can use a lower-resolution pyramid level because many original map pixels correspond to one screen pixel.

### Display view

The display window shows the camera crop. It should use higher-resolution tiles when zoomed into part of the map.

This allows the display to remain sharp without uploading or rendering the entire original image at full resolution.

## Conditional GPU Fog Architecture

This section applies only after WebGL2 is justified and framebuffer parity is established.

Represent fog as a texture mask rather than a second full-size RGBA image.

Recommended approach:

- Use a single-channel mask texture where supported.
- Treat the mask as global map-space data.
- Update only dirty regions.
- Use `texSubImage2D` for WebGL2 updates.
- Batch brush events into one update per animation frame.
- Perform soft-edge compositing in the fragment shader where practical.

A single-channel mask uses approximately one quarter of the memory of an RGBA fog texture.

Fog must remain logically continuous across map tile boundaries.

## Conditional WebGL2 Rendering Layers

Suggested WebGL2 implementation:

- Map: textured tile quads.
- Fog: sampled mask texture or tiled mask textures.
- Freeform drawing: transparent color texture or replayed vector strokes, composited only when display-visible.
- Grid: shader-generated grid or line geometry.
- AoE: small dynamic vertex buffers.
- Markers: control renderer plus only markers explicitly opted into the display.
- Dungeon segments: control renderer only.
- Calibration guides: temporary line geometry.
- Camera guides: control renderer only.
- Dice and initiative: retain HTML overlays initially.

Preserve current layer ordering exactly.

## Near-Term Import and Persistence Work

Completed before considering tiles or WebGL2:

1. Retain the current single-image model.
2. Track whether fog changed since its last encoding.
3. Re-encode only changed fog; retain original compressed map data for in-cap imports.
4. Replace full-canvas fog undo snapshots with compact replayable actions.
5. Benchmark 6144×4096 import, redraw, autosave, export, restore, display, and two-map behavior.

Remaining only if target-hardware profiling requires it:

1. Move encoding and optional downscaling to an inline Blob Worker.
2. Preserve synchronous fallback if Worker initialization fails.
3. Extend the benchmark matrix to 8192px before changing the current cap.

Only if tiling is approved should the import process become:

Recommended import process:

1. Decode the source image with `createImageBitmap`.
2. Preserve one compressed representation for session export.
3. Generate map tiles and lower-resolution levels.
4. Move tile generation to a worker where supported.
5. Return tile metadata to the main application.
6. Upload tiles only when needed by a renderer.

The worker can remain compatible with the single-file requirement by being created from an in-memory `Blob` URL.

## Persistence

Do not serialize generated tiles into exported session JSON.

Persist:

- The original compressed map image once.
- Existing map metadata.
- Fog state.
- Camera, grid, AoE, markers, calibration, and dungeon data.

Generated map tiles should be treated as derived cache data.

IndexedDB may cache generated tiles for faster resume, but the exported session should not contain redundant tile copies.

## Resolution Limit

Do not assume tiling is required before raising the cap. Instead:

1. Establish performance budgets and representative target hardware.
2. Benchmark the current renderer at 4096px, 6144px, and 8192px.
3. Raise the cap to the highest size that stays within those budgets.
4. Add a defensive lower fallback when decode/allocation fails.
5. Revisit WebGL2 and tiling only if the desired size cannot meet the budgets.

If tiling is later proven necessary:

- Replace the fixed cap with capability-aware limits.
- Query `MAX_TEXTURE_SIZE` and `MAX_RENDERBUFFER_SIZE`.
- Do not interpret the GPU maximum as a sensible allocation target.
- Apply an application-controlled memory budget.
- Benchmark representative hardware.

Maps around 12K-16K should be treated as a separate deep-map requirement, not the default target for fixing the current 2400px complaint.

The final supported size should be determined by measurement rather than a hard promise.

## Gated Migration Plan

### Phase 1: Establish Baselines — Partially complete

Measure current Canvas 2D behavior using representative maps:

- 2400px
- 4096px
- 6144px
- 8192px

Measure:

- Import time.
- Peak memory.
- Frame time.
- Fog brush latency.
- Camera response.
- Autosave time.
- Display-window redraw time.

At the end of this phase, explicitly choose the required supported size. Do not proceed to GPU work without that decision.

### Phase 2: Optimize the Existing Path — Implemented for 6K

Implement:

- Dirty fog encoding for autosave.
- Compact fog undo actions.
- Bounded control preview.
- Original compressed map retention for in-cap imports.
- Animation-frame redraw coalescing.
- Reusable 6K performance instrumentation.

Then rerun the benchmark matrix.

**Current exit gate:** Run `npm run benchmark:6k` on the intended laptop. If 6K meets practical interaction and memory expectations there, stop here.

### Phase 3: Finish the Renderer Boundary If Needed

Move all remaining rendering commands out of application orchestration.

Feature code should produce scene data and map-space updates rather than call Canvas APIs directly.

### Phase 4: Complete Canvas2DRenderer

Make the current renderer implement the new renderer contract.

All existing tests must pass without changed behavior.

### Phase 5: Build Missing Visual-Parity Test Infrastructure

The current suite has renderer-neutral screenshots and narrow pixel assertions, but it does **not** yet have general tolerance-based framebuffer comparison or approved reference fixtures.

Before trusting a second renderer, add:

- PNG framebuffer capture for named scenarios.
- Per-channel or perceptual tolerance comparison.
- Diff-image artifacts on failure.
- Stable fixture setup with explicit fonts, DPR, viewport, and animation state.
- Baseline review/update workflow.
- Layer-specific parity scenarios.

This is new test infrastructure, not a minor extension of the current suite.

### Phase 6: Add WebGL2Renderer

Initially use the current 6144px map cap and one texture, reducing the parity fixture size only if a target GPU cannot allocate it safely.

The objective is framebuffer and behavior parity, not higher resolution yet.

### Phase 7: Add Explicit Backend Selection

Provide a development/test hook:

```text
?renderer=canvas2d
?renderer=webgl2
```

Use automatic fallback in normal operation.

**Exit gate:** If a single-texture WebGL2 renderer meets the confirmed target and memory budgets, stop here. Do not add tiling automatically.

### Phase 8: Add Tiled Map Rendering If Still Required

Implement:

- Tile generation.
- Multi-resolution levels.
- Visible-tile selection.
- Texture upload scheduling.
- LRU cache eviction.
- Edge overlap or equivalent seam prevention.

### Phase 9: Move Fog to GPU Masking

Implement:

- Single-channel mask textures.
- Dirty-region updates.
- Brush batching.
- Correct soft edges.
- Cross-tile brush behavior.

### Phase 10: Move Vector Overlays

Move grid, AoE, dungeon segments, markers, calibration, and camera guides into the renderer.

### Phase 11: Raise Resolution Limits

Benchmark memory and interaction performance before changing the import cap.

### Phase 12: Make WebGL2 the Default

Use Canvas 2D automatically when WebGL2 initialization or restoration fails.

### Phase 13: Evaluate WebGPU

Only implement WebGPU if profiling identifies a meaningful limitation that WebGL2 cannot solve.

## Current and Required Test Infrastructure

Current coverage includes 134 browser behavior cases, 15 direct module contracts, browser-composited screenshots, and narrow pixel assertions. It protects workflows, freeform drawing/erasing/privacy, map renaming, camera framing controls, display privacy, selection rendering, dungeon compositing, marker visibility/size, dungeon numbering/tooltips, accessibility semantics, keyboard interaction, touch-pointer input, responsive layout, 6K downscaling, persistence, and popup behavior.

It does not currently provide:

- General Canvas 2D versus WebGL2 framebuffer parity.
- Tolerance-based image comparison.
- Diff artifacts and baseline management.
- GPU context-loss simulation.
- Texture-cache or GPU-memory stress instrumentation.

Those capabilities must be implemented and proven before WebGL2 can become the default.

## Required GPU Test Gates

Before WebGL2 becomes the default:

- Run the existing behavior suite against Canvas 2D and WebGL2.
- Add framebuffer parity comparisons with per-channel tolerance.
- Test WebGL context loss and restoration.
- Test automatic fallback when WebGL initialization fails.
- Test DPR changes and resizing after initialization.
- Test popup destruction and recovery.
- Test maximum map dimensions and texture-limit handling.
- Test alpha, color-space, and texture-filtering behavior.
- Test exact layer ordering.
- Test tile-boundary seams.
- Test fog strokes crossing tile boundaries.
- Test markers and AoE shapes on both sides of boundaries.
- Test camera movement across many tiles.
- Test tile eviction and later reloading.
- Test session coordinates before and after tiling.
- Test repeated map switching for bounded GPU memory growth.
- Test pointer and touch coordinates at non-1 DPR and under CSS scaling.

Tests should inspect application state or browser-composited output. They should not merely assert that WebGL calls or shader compilations occurred.

## Suggested Performance Targets

```text
Interaction frame budget:       under 16.7 ms
Fog input-to-frame latency:     under 33 ms
Normal editing long tasks:      none over 50 ms
Display resize recovery:        under 250 ms
GPU map cache budget:           approximately 256 MB
Camera movement:                no full-map texture uploads
Fog brush update:               no full-mask uploads
Map switching:                  bounded memory growth
```

The GPU cache target applies only to a future tiled backend and must become a tiered, conservative policy as described above. It is not a requirement for the near-term Canvas work.

## Risks

### Tile seams

Mitigation:

- Add border pixels around tiles.
- Clamp sampling correctly.
- Use appropriate texture filtering.
- Add explicit seam tests at multiple zoom levels.

### Resolution-level popping

Mitigation:

- Select levels based on screen-pixel density.
- Preload neighboring levels.
- Optionally cross-fade during transitions.

### Browser decoding limits

Mitigation:

- Detect decoding failures.
- Provide a clear fallback.
- Downscale only when the source cannot be processed safely.

### GPU context loss

Mitigation:

- Keep application state and source map data independent of GPU resources.
- Recreate textures and buffers after restoration.
- Fall back to Canvas 2D if restoration fails.

### Memory pressure

Mitigation:

- Maintain a hard cache budget.
- Evict least-recently-used textures.
- Avoid storing redundant decoded full-resolution copies.
- Release GPU resources when maps are removed.

## Decision Summary

The recommended near-term decision is:

1. Treat 6144px as the current implemented target.
2. Run the checked-in benchmark on the intended laptop/TV setup.
3. Stop if the current Canvas path is satisfactory.
4. Consider Worker preprocessing only for measured main-thread stalls.
5. Use WebGL2 only if measurements or larger confirmed requirements justify it.
6. Use tiled multi-resolution rendering only for a confirmed 8K+ or deep-map requirement.

## Definition of Done for the Near-Term Resolution Work

The near-term work is complete when:

- The agreed maximum map size imports reliably on representative hardware.
- Interaction and fog latency meet the performance targets.
- Autosave does not re-encode unchanged slides.
- Encoding/preprocessing no longer causes unacceptable main-thread stalls.
- The standalone single-file contract remains intact.
- All existing unit and browser tests pass.

## Definition of Done for a Future GPU Migration

The migration is complete when:

- `tavern-mapper.html` remains one self-contained offline file.
- Existing workflows behave identically.
- Existing sessions remain compatible.
- Canvas 2D remains a working fallback.
- WebGL2 passes renderer parity and behavior tests.
- Larger maps remain sharp when zoomed.
- Fog remains continuous.
- GPU memory remains bounded.
- Context loss restores cleanly or falls back automatically.
- No full map or fog upload occurs during normal camera interaction.

If tiling is included, it additionally requires invisible tile boundaries, correct cross-tile fog, bounded cache eviction, and artifact-free level changes. Those are not requirements for a successful single-texture WebGL2 implementation.
