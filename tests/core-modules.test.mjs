import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  distanceToLineSegment,
  gridMultiplesInRange,
  pointInConvexPoly,
} from '../src/core/geometry.mjs';
import { createAutosaveScheduler } from '../src/core/autosave.mjs';
import { pushBounded, snapshotAoe, snapshotCamera, snapshotGrid } from '../src/core/undo.mjs';
import { createDisplayHtml } from '../src/display/window-manager.mjs';
import { computeAoeGeometry, rotationHandlePoint } from '../src/features/aoe.mjs';
import { applyCameraDrag, cameraCursorFor, hitTestCamera, zoomCameraAt } from '../src/features/camera.mjs';
import { rollDice } from '../src/features/dice.mjs';
import { hitTestDungeon } from '../src/features/dungeon.mjs';
import { computeHitPoints, sortCombatants } from '../src/features/initiative.mjs';
import { updateRecentColors } from '../src/ui/color-picker.mjs';
import { escapeHtml } from '../src/ui/escape-html.mjs';

test('geometry helpers clamp values and generate normalized grid lines', () => {
  assert.equal(clamp(12, 0, 10), 10);
  assert.deepEqual(gridMultiplesInRange(10, 0, 30, -2), [8, 18, 28]);
  assert.deepEqual(gridMultiplesInRange(0, 0, 30, 0), []);
});

test('geometry helpers detect convex polygons and segment distance', () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(pointInConvexPoly(5, 5, square), true);
  assert.equal(pointInConvexPoly(15, 5, square), false);
  assert.equal(distanceToLineSegment(5, 4, 0, 0, 10, 0), 4);
});

test('AoE geometry preserves circle, square, and cone rules', () => {
  const circle = computeAoeGeometry({ type: 'circle', x: 10, y: 20, ft: 5 }, 2);
  assert.deepEqual(circle, { kind: 'circle', cx: 10, cy: 20, r: 10 });

  const cone = computeAoeGeometry({ type: 'cone', x: 0, y: 0, ft: 10, rotation: 0 }, 1);
  assert.deepEqual(cone.points, [[0, 0], [10, 5], [10, -5]]);
  assert.deepEqual(rotationHandlePoint({ type: 'cone', x: 0, y: 0, ft: 10, rotation: 0 }, 1), { x: 10, y: 0 });
});

test('dice rolls use injectable randomness and include modifiers', () => {
  const result = rollDice(20, 2, 3, () => 0.5);
  assert.deepEqual(result, { rolls: [11, 11], total: 25 });
});

test('initiative sorting and HP log replay preserve app semantics', () => {
  const combatants = [{ name: 'Low', score: 4 }, { name: 'High', score: 18 }];
  assert.deepEqual(sortCombatants(combatants).map(({ name }) => name), ['High', 'Low']);
  assert.equal(computeHitPoints({ hpLog: [
    { type: 'set', value: 20 },
    { type: 'delta', value: -6 },
    { type: 'delta', value: 2 },
  ] }), 16);
});

test('display text escaping covers HTML-significant characters', () => {
  assert.equal(escapeHtml('<Tom & Jane>'), '&lt;Tom &amp; Jane&gt;');
});

test('recent colors are shared, deduplicated, normalized, and capped', () => {
  let colors = ['#111111', '#222222'];
  colors = updateRecentColors(colors, '#ABCDEF', 3);
  colors = updateRecentColors(colors, '#111111', 3);
  assert.deepEqual(colors, ['#111111', '#abcdef', '#222222']);
});

test('camera operations preserve aspect ratio, bounds, and cursor semantics', () => {
  const camera = { x: 0, y: 0, w: 400, h: 300 };
  zoomCameraAt(camera, 400, 300, 200, 150, 0.5);
  assert.deepEqual(camera, { x: 100, y: 75, w: 200, h: 150 });
  assert.equal(hitTestCamera(camera, 200, 150), 'move');
  assert.equal(hitTestCamera(camera, 100, 75), 'nw');
  assert.equal(cameraCursorFor('ne'), 'nesw-resize');
  applyCameraDrag(camera, 400, 300, 'move', 500, 500);
  assert.deepEqual(camera, { x: 200, y: 150, w: 200, h: 150 });
});

test('autosave scheduling debounces writes and removes empty sessions', async () => {
  const callbacks = [];
  const writes = [];
  let hasData = true;
  const store = {
    write: async data => writes.push(data),
    remove: async () => writes.push('removed'),
  };
  const schedule = createAutosaveScheduler({
    store,
    serialize: () => 'session',
    hasData: () => hasData,
    setTimer: callback => { callbacks.push(callback); return callbacks.length; },
    clearTimer: () => {},
  });

  schedule();
  callbacks.pop()();
  await Promise.resolve();
  hasData = false;
  schedule();
  callbacks.pop()();
  await Promise.resolve();
  assert.deepEqual(writes, ['session', 'removed']);
});

test('display document preserves the standalone DPR and recovery hooks', () => {
  const html = createDisplayHtml();
  assert.match(html, /devicePixelRatio/);
  assert.match(html, /id="displayCanvas"/);
  assert.match(html, /__fogRedraw/);
  assert.match(html, /__updateDisplayExtras/);
});

test('dungeon hit testing selects strokes by brush radius and topmost order', () => {
  const lower = { id: 1, strokes: [{ brushSize: 20, points: [{ x: 0, y: 0 }, { x: 20, y: 0 }] }] };
  const upper = { id: 2, strokes: [{ brushSize: 10, points: [{ x: 10, y: 0 }] }] };
  assert.equal(hitTestDungeon([lower, upper], 10, 0), upper);
  assert.equal(hitTestDungeon([lower], 10, 8), lower);
  assert.equal(hitTestDungeon([lower], 10, 20), null);
});

test('undo snapshots are detached and histories remain bounded', () => {
  const camera = { x: 1, y: 2, w: 3, h: 4 };
  assert.deepEqual(snapshotCamera(camera), camera);
  assert.deepEqual(snapshotGrid({ enabled: true, size: 50, offsetX: 1, offsetY: 2, opacity: 0.5 }), {
    enabled: true, size: 50, offsetX: 1, offsetY: 2, opacity: 0.5,
  });
  const slide = { aoeShapes: [{ id: 1 }], aoeCalibration: 100, aoeZoomLock: false };
  const snapshot = snapshotAoe(slide);
  slide.aoeShapes[0].id = 2;
  assert.equal(snapshot.shapes[0].id, 1);
  const history = [];
  pushBounded(history, 1, 2);
  pushBounded(history, 2, 2);
  pushBounded(history, 3, 2);
  assert.deepEqual(history, [2, 3]);
});