# Tavern Mapper UI/UX Audit

Date: 2026-08-16

Scope: authored markup, CSS, browser semantics, keyboard/focus behavior, interaction feedback, responsive layout, and repeated-session ergonomics. All recommendations use native HTML, CSS, and JavaScript; no UI library is required.

## Implementation status

Implemented in the first remediation pass:

- Programmatic names for audited inputs, color swatches, and marker shape buttons.
- Semantic active states for tabs and mode/shape/color controls.
- Arrow-key tab navigation.
- Visible `:focus-visible`, centralized disabled, danger, and text-input styling.
- Keyboard-operable sidebar resize handle, slide rows, dungeon rows, and file-picker labels.
- Inline selected-marker naming; double-click now focuses this field instead of opening a rename prompt.
- Polite live feedback for save, load, image import, and import/load failures.
- Pointer Events for map interactions and sidebar resizing, including a tested touch-pointer dungeon stroke.
- Stacked narrow-screen layout and coarse-pointer target sizing.
- Tooltip semantics and `aria-describedby` linkage for selected dungeon list rows.

Current automated verification: 14 module contracts and 127 browser behavior tests.

Remaining deeper opportunities:

- Keyboard selection/manipulation directly on the canvas for markers and AoE shapes. Sidebar controls are keyboard-accessible, but canvas spatial navigation has no complete keyboard model.
- A collapsible mobile control drawer. The current narrow layout stacks controls above the map and is usable, but consumes up to 52% of viewport height.
- Replacing remaining non-destructive `alert()` calls with inline status plus richer recovery actions.
- Gradual removal of repeated inline styles.

## Executive summary

The desktop interaction model is coherent and visually consistent for a mouse-driven GM workflow. The strongest parts are contrast, persistent access to core commands, visible selected-state feedback, and control/display privacy.

The largest opportunities are not visual redesign. They are semantic accessibility, keyboard/touch support, responsive behavior, and clearer operation feedback.

Baseline measured findings before remediation:

- Core contrast ratios pass WCAG AA comfortably:
  - Main text/background: 14.76:1
  - Dim text/background: 5.81:1
  - Dim text/panel: 5.29:1
  - Accent/background: 6.95:1
- 22 icon/swatch buttons had no accessible name; the current count is 0.
- 22 of 28 non-file inputs lacked a programmatically associated label; the current count is 0.
- Navigation exposes zero `role="tab"`, `aria-selected`, or `aria-pressed` states.
- There were zero `aria-live` regions; the current application has three live regions covering display status, dice results, and operation feedback.
- The sidebar resize handle was not keyboard-focusable and had no separator semantics; it now exposes a focusable vertical separator with value metadata and arrow-key control.
- At a 360px viewport the sidebar previously remained 280px and left only 74px for the map canvas. The current layout stacks vertically and gives the canvas area the full 360px width.

## Priority 1: Accessible names and control relationships — Implemented

### Problem

Most controls have visible text nearby but no programmatic relationship between that text and the input. Screen readers announce many sliders and fields only as generic controls.

The 22 empty buttons are the marker/AoE/dungeon color swatches and marker shape buttons. Their color or canvas image is visible, but they have no accessible name.

### Recommendation

- Add `for` attributes to every visual label and matching `id` to its control.
- Use `aria-label` for compact controls where a visible label would be redundant.
- Give color swatches names such as `Marker color #ff5b5b`.
- Give shape buttons names such as `Marker shape: skull`.
- Use `aria-pressed="true|false"` for shape, color, mode, advantage, and Paint/Select buttons.
- Use `<output for="...">` for live range values where practical.

Example:

```html
<label for="markerSize">Marker size</label>
<input id="markerSize" type="range" min="6" max="60" value="12"
       aria-describedby="markerSizeLabel">
<output id="markerSizeLabel" for="markerSize">12px</output>
```

## Priority 2: Navigation semantics — Implemented

### Problem

The Maps/Map/Display/Tools navigation and sub-tabs are visually understandable, but assistive technology receives them as unrelated buttons. Active state exists only as a CSS class.

### Recommendation

- Give tab rows `role="tablist"`.
- Give each tab button `role="tab"`, `aria-selected`, and `aria-controls`.
- Give panels `role="tabpanel"` and `aria-labelledby`.
- Implement Left/Right arrow navigation within each visible tablist.
- Keep the current click behavior and visual styling.

For mode button groups that are not page tabs, use `aria-pressed` instead of tab semantics.

## Priority 3: Keyboard and non-mouse interaction — Partially implemented

### Problem

The core map canvas relies on mouse events, right-click, double-click, hover cursors, and drag gestures. The sidebar resize handle and clickable slide/dungeon rows are also mouse-only.

This limits keyboard users and makes touch/pen behavior unreliable because the application uses `mousedown`/`mousemove` rather than Pointer Events.

### Recommendation

- Migrate map input from mouse events to Pointer Events (`pointerdown`, `pointermove`, `pointerup`, pointer capture).
- Preserve current mouse behavior while gaining touch and pen support.
- Make slide rows and dungeon rows real `<button>` elements where possible, or add `tabindex="0"`, roles, and Enter/Space handling.
- Make the resize handle focusable with `role="separator"`, `aria-orientation="vertical"`, and arrow-key resizing.
- Add keyboard alternatives for canvas selection:
  - Marker list/inspector with rename, visibility, size, and delete commands.
  - AoE list or previous/next selected-shape controls.
  - Dungeon list already provides a useful selection path; make it keyboard-operable.
- Keep right-click and double-click as shortcuts, not the only route to an action.

## Priority 4: Responsive workspace — First pass implemented

### Problem

The layout avoids horizontal overflow but does not adapt. Measured canvas widths:

| Viewport | Sidebar | Canvas area |
|---:|---:|---:|
| 1280px | 280px | 994px |
| 768px | 280px | 482px |
| 480px | 280px | 194px |
| 360px | 280px | 74px |

At phone width, the map is effectively unusable. This may be acceptable if phones are explicitly unsupported, but tablets and narrow laptop windows would still benefit from adaptation.

### Recommendation

Add a native CSS breakpoint around 700-800px:

- Make the sidebar a collapsible overlay or bottom sheet.
- Give the canvas the full viewport while controls are collapsed.
- Provide one clear icon button to open/close controls.
- Preserve the fixed footer inside the expanded controls.
- Keep touch targets at least about 40-44px on coarse-pointer devices.

If mobile is intentionally out of scope, state a supported minimum viewport in README and show a compact warning rather than a 74px canvas.

## Priority 5: Status and operation feedback — First pass implemented

### Problem

Several consequential operations are silent:

- Successful session save
- Successful session load
- Autosave completion/failure
- Large image import/downscaling
- Unreadable images are skipped silently

The display connection status exists, but it is not announced as a live region.

### Recommendation

- Add a small reusable status/toast region using `role="status"` and `aria-live="polite"`.
- Announce save/load completion, import failures, and display connection changes.
- Show a brief busy state for large map import or session restore.
- Set `aria-busy="true"` on the canvas area during import/restore.
- Report skipped files instead of swallowing image decode errors.
- Keep notifications concise and non-blocking.

No library is needed: one DOM region and a small queue/timer helper are sufficient.

## Priority 6: Native dialogs and marker naming — Marker naming implemented

### Problem

Marker creation/rename uses `prompt()`. Destructive operations use `confirm()`, and failures use `alert()`.

Native confirms are acceptable for destructive actions, but prompt-based marker naming interrupts flow, cannot match the rest of the UI, and leaves no persistent marker-name inspector.

### Recommendation

- Add a marker name field to the selected-marker inspector.
- Let a newly created marker receive a default/empty label and focus that field.
- Keep double-click as a rename shortcut that focuses the inspector field.
- Retain native `confirm()` for destructive map/segment/initiative actions until a custom dialog is justified.
- Replace non-destructive `alert()` messages with the status region.

## Priority 7: Visual consistency and states — Foundation implemented

### Problem

- `input[type="text"]` lacks the global styling applied to number inputs and textareas.
- Disabled-state styling is partly applied through JavaScript instead of one CSS rule.
- Focus relies on browser defaults and is not consistently designed against dark surfaces.
- Destructive actions look like ordinary buttons.
- Inline styles are widespread, making state and spacing consistency harder to maintain.

### Recommendation

- Apply shared styles to text, number, color, textarea, and select controls.
- Add a strong `:focus-visible` ring using the existing accent token.
- Add centralized `button:disabled` styling.
- Add a restrained `.danger` style for destructive actions.
- Move repeated inline styles into semantic classes (`field-label`, `compact-row`, `color-input`, `panel-list`).
- Do this incrementally; avoid a wholesale visual rewrite.

Suggested CSS foundation:

```css
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

input[type="text"],
input[type="number"],
textarea {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  color: var(--text);
}
```

## Priority 8: Tooltip semantics — Implemented

### Problem

The dungeon description tooltip is visually useful but is not exposed as a tooltip to assistive technology. Its content is duplicated in the inspector, which reduces the severity.

### Recommendation

- Add `role="tooltip"` to the tooltip.
- When a dungeon segment is selected, connect the selected list row or inspector with `aria-describedby`.
- Keep the notes field as the authoritative keyboard-accessible description.
- Allow Escape to dismiss, which the application already does through deselection.

## What is already working well

- Strong text and accent contrast.
- Header and footer remain reachable while the tool panel scrolls.
- Selected marker, AoE, and dungeon states have visible glow feedback.
- Hover and drag cursors communicate map interactions well for mouse users.
- Marker/AoE display visibility is explicit and private data stays off the display.
- Dungeon Paint and Select are explicit modes.
- Form fields are protected from global Delete/Backspace shortcuts.
- Empty, resume, popup-blocked, connected, and reconnected states exist.
- The app has a consistent compact visual language appropriate for a repeated-use GM tool.

## Recommended implementation order

### Pass 1: Low-risk semantic and visual fixes

1. Add accessible names to swatches and shape buttons.
2. Associate labels with inputs.
3. Add `aria-pressed`/`aria-selected` state synchronization.
4. Add `:focus-visible`, disabled, danger, and text-input styles.
5. Add one `aria-live` status region.
6. Add tooltip role and descriptions.

These changes should not alter application state or session serialization.

### Pass 2: Keyboard-operable sidebar interactions

1. Convert dungeon and slide rows to semantic buttons or keyboard-operable rows.
2. Make sidebar resizing keyboard-accessible.
3. Add a marker name inspector field.
4. Add keyboard selection paths for map entities.

### Pass 3: Pointer Events and narrow layouts

1. Migrate canvas interactions to Pointer Events with pointer capture.
2. Add coarse-pointer target sizing.
3. Add a collapsible narrow-screen sidebar.
4. Test desktop mouse, touch, pen, DPR scaling, and popup behavior.

## Validation additions

Before calling the audit complete, add tests for:

- Every interactive control has an accessible name.
- Labels resolve to their intended inputs.
- Active tabs/modes expose semantic state.
- Keyboard activation of slide and dungeon rows.
- Keyboard resizing of the sidebar.
- Visible focus at each major navigation layer.
- Live-region updates for save/load/import failures.
- Pointer Events with mouse and touch emulation.
- Narrow viewport behavior at 768px, 480px, and 360px.
- No text clipping at the minimum supported sidebar width.
