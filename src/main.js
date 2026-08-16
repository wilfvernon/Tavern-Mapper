import {
  clamp,
  pointInConvexPoly,
} from './core/geometry.mjs';
import { createAutosaveScheduler, createAutosaveStore } from './core/autosave.mjs';
import {
  cloneValue,
  pushBounded,
  snapshotAoe,
  snapshotCamera,
  snapshotGrid,
} from './core/undo.mjs';
import { constrainedMapSize, MAX_CONTROL_PREVIEW_DIMENSION } from './core/map-limits.mjs';
import { computeAoeGeometry, rotationHandlePoint } from './features/aoe.mjs';
import {
  applyCameraDrag,
  cameraCursorFor,
  hitTestCamera,
  zoomCameraAt,
} from './features/camera.mjs';
import { rollDice } from './features/dice.mjs';
import { hitTestDungeon, nextDungeonNumber } from './features/dungeon.mjs';
import { computeHitPoints, sortCombatants } from './features/initiative.mjs';
import { createDisplayWindowManager } from './display/window-manager.mjs';
import {
  drawControlAoe,
  drawControlGrid,
  drawDungeon,
  drawDisplayAoe,
  drawDisplayGrid,
  drawDisplayMarkers,
  drawMarkers as drawCanvasMarkers,
  drawMarkerShape,
  applyFogAction,
  paintFogStroke,
} from './renderers/canvas2d.mjs';
import { createSharedColorPicker } from './ui/color-picker.mjs';
import { escapeHtml } from './ui/escape-html.mjs';

(function () {
  const fileInput = document.getElementById('fileInput');
  const workCanvas = document.getElementById('workCanvas');
  const canvasArea = document.getElementById('canvasArea');
  const emptyState = document.getElementById('emptyState');
  const dimsLabel = document.getElementById('dimsLabel');
  const openDisplayBtn = document.getElementById('openDisplayBtn');
  const displayStatus = document.getElementById('displayStatus');
  const appStatus = document.getElementById('appStatus');

  const slideListEl = document.getElementById('slideList');
  const prevSlideBtn = document.getElementById('prevSlideBtn');
  const nextSlideBtn = document.getElementById('nextSlideBtn');
  const saveSessionBtn = document.getElementById('saveSessionBtn');
  const loadSessionInput = document.getElementById('loadSessionInput');
  const resumeBanner = document.getElementById('resumeBanner');
  const resumeText = document.getElementById('resumeText');
  const resumeBtn = document.getElementById('resumeBtn');
  const discardBtn = document.getElementById('discardBtn');

  const mapsModeBtn = document.getElementById('mapsModeBtn');
  const mapsControls = document.getElementById('mapsControls');
  const catMapBtn = document.getElementById('catMapBtn');
  const catDisplayBtn = document.getElementById('catDisplayBtn');
  const catToolsBtn = document.getElementById('catToolsBtn');
  const subTabsMap = document.getElementById('subTabsMap');
  const subTabsDisplay = document.getElementById('subTabsDisplay');
  const subTabsTools = document.getElementById('subTabsTools');
  const brushModeBtn = document.getElementById('brushModeBtn');
  const markerModeBtn = document.getElementById('markerModeBtn');
  const cameraModeBtn = document.getElementById('cameraModeBtn');
  const gridModeBtn = document.getElementById('gridModeBtn');
  const dungeonModeBtn = document.getElementById('dungeonModeBtn');
  const fogControls = document.getElementById('fogControls');
  const markerControls = document.getElementById('markerControls');
  const cameraControls = document.getElementById('cameraControls');
  const gridControls = document.getElementById('gridControls');
  const dungeonControls = document.getElementById('dungeonControls');
  const dungeonBrushSizeEl = document.getElementById('dungeonBrushSize');
  const dungeonBrushSizeLabel = document.getElementById('dungeonBrushSizeLabel');
  const dungeonColorSwatches = document.getElementById('dungeonColorSwatches');
  const dungeonColorSwatchesRecent = document.getElementById('dungeonColorSwatchesRecent');
  const dungeonColorWheel = document.getElementById('dungeonColorWheel');
  const dungeonPaintToolBtn = document.getElementById('dungeonPaintToolBtn');
  const dungeonSelectToolBtn = document.getElementById('dungeonSelectToolBtn');
  const dungeonNewSegmentBtn = document.getElementById('dungeonNewSegmentBtn');
  const dungeonNotesPanel = document.getElementById('dungeonNotesPanel');
  const dungeonSegmentName = document.getElementById('dungeonSegmentName');
  const dungeonSegmentNotes = document.getElementById('dungeonSegmentNotes');
  const dungeonDeleteSegmentBtn = document.getElementById('dungeonDeleteSegmentBtn');
  const dungeonSegmentList = document.getElementById('dungeonSegmentList');
  const dungeonTooltip = document.getElementById('dungeonTooltip');

  const revealModeBtn = document.getElementById('revealModeBtn');
  const coverModeBtn = document.getElementById('coverModeBtn');
  const brushSize = document.getElementById('brushSize');
  const brushSizeLabel = document.getElementById('brushSizeLabel');
  const brushDot = document.getElementById('brushDot');
  const softEdge = document.getElementById('softEdge');
  const fogOpacity = document.getElementById('fogOpacity');
  const fogOpacityLabel = document.getElementById('fogOpacityLabel');
  const undoBtn = document.getElementById('undoBtn');
  const resetFogBtn = document.getElementById('resetFogBtn');
  const clearFogBtn = document.getElementById('clearFogBtn');

  const colorSwatches = document.getElementById('colorSwatches');
  const colorSwatchesRecent = document.getElementById('colorSwatchesRecent');
  const markerColorWheel = document.getElementById('markerColorWheel');
  const markerVisibleToggle = document.getElementById('markerVisibleToggle');
  const markerSizeEl = document.getElementById('markerSize');
  const markerSizeLabel = document.getElementById('markerSizeLabel');
  const markerNamePanel = document.getElementById('markerNamePanel');
  const markerNameEl = document.getElementById('markerName');
  const shapeSwatches = document.getElementById('shapeSwatches');
  const deleteSelectedMarkerBtn = document.getElementById('deleteSelectedMarkerBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const fitFullBtn = document.getElementById('fitFullBtn');
  const centerCameraBtn = document.getElementById('centerCameraBtn');
  const cameraZoomEl = document.getElementById('cameraZoom');
  const cameraZoomLabel = document.getElementById('cameraZoomLabel');

  const gridEnabledEl = document.getElementById('gridEnabled');
  const gridColorEl = document.getElementById('gridColor');
  const gridSizeEl = document.getElementById('gridSize');
  const gridSizeLabel = document.getElementById('gridSizeLabel');
  const gridOffsetXEl = document.getElementById('gridOffsetX');
  const gridOffsetXLabel = document.getElementById('gridOffsetXLabel');
  const gridOffsetYEl = document.getElementById('gridOffsetY');
  const gridOffsetYLabel = document.getElementById('gridOffsetYLabel');
  const gridOpacityEl = document.getElementById('gridOpacity');
  const gridOpacityLabel = document.getElementById('gridOpacityLabel');
  const undoContextLabel = document.getElementById('undoContextLabel');

  const aoeModeBtn = document.getElementById('aoeModeBtn');
  const aoeControls = document.getElementById('aoeControls');
  const calibrateModeBtn = document.getElementById('calibrateModeBtn');
  const calibrateControls = document.getElementById('calibrateControls');
  const aoeCircleBtn = document.getElementById('aoeCircleBtn');
  const aoeSquareBtn = document.getElementById('aoeSquareBtn');
  const aoeConeBtn = document.getElementById('aoeConeBtn');
  const aoeFtLabel = document.getElementById('aoeFtLabel');
  const aoeFtEl = document.getElementById('aoeFt');
  const aoeRotationEl = document.getElementById('aoeRotation');
  const aoeRotationLabel = document.getElementById('aoeRotationLabel');
  const aoeColorSwatches = document.getElementById('aoeColorSwatches');
  const aoeColorSwatchesRecent = document.getElementById('aoeColorSwatchesRecent');
  const aoeColorWheel = document.getElementById('aoeColorWheel');
  const aoeVisibleToggle = document.getElementById('aoeVisibleToggle');

  const diceModeBtn = document.getElementById('diceModeBtn');
  const diceControls = document.getElementById('diceControls');
  const diceTypeButtons = document.getElementById('diceTypeButtons');
  const diceCountEl = document.getElementById('diceCount');
  const diceModifierEl = document.getElementById('diceModifier');
  const diceAdvBtn = document.getElementById('diceAdvBtn');
  const diceNormalBtn = document.getElementById('diceNormalBtn');
  const diceDisBtn = document.getElementById('diceDisBtn');
  const rollDiceBtn = document.getElementById('rollDiceBtn');
  const diceResultEl = document.getElementById('diceResult');
  const diceHistoryList = document.getElementById('diceHistoryList');
  const dicePoolRow = document.getElementById('dicePoolRow');
  const dicePoolTotal = document.getElementById('dicePoolTotal');
  const clearPoolBtn = document.getElementById('clearPoolBtn');
  const revealPoolBtn = document.getElementById('revealPoolBtn');

  const initModeBtn = document.getElementById('initModeBtn');
  const initiativeControls = document.getElementById('initiativeControls');
  const combatantNameEl = document.getElementById('combatantName');
  const combatantScoreEl = document.getElementById('combatantScore');
  const addCombatantBtn = document.getElementById('addCombatantBtn');
  const roundLabel = document.getElementById('roundLabel');
  const nextTurnBtn = document.getElementById('nextTurnBtn');
  const resetInitiativeBtn = document.getElementById('resetInitiativeBtn');
  const initiativeShowOnDisplay = document.getElementById('initiativeShowOnDisplay');
  const combatantList = document.getElementById('combatantList');
  const deleteSelectedAoeBtn = document.getElementById('deleteSelectedAoeBtn');
  const aoeCalibrationGridNote = document.getElementById('aoeCalibrationGridNote');
  const aoeCalibrationManualRow = document.getElementById('aoeCalibrationManualRow');
  const aoeCalibrationEl = document.getElementById('aoeCalibration');
  const calibRefLenButtons = document.getElementById('calibRefLenButtons');
  const calibCustomFt = document.getElementById('calibCustomFt');
  const calibDrawLineBtn = document.getElementById('calibDrawLineBtn');
  const calibShowSquareBtn = document.getElementById('calibShowSquareBtn');
  const aoeZoomLockToggle = document.getElementById('aoeZoomLockToggle');
  const calibSnapZoomBtn = document.getElementById('calibSnapZoomBtn');

  const ctx = workCanvas.getContext('2d');

  function announceStatus(message) {
    appStatus.textContent = '';
    requestAnimationFrame(() => { appStatus.textContent = message; });
  }

  function syncSemanticButton(button) {
    if (!(button instanceof HTMLButtonElement)) return;
    const active = button.classList.contains('active');
    if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active));
    if (button.closest('.mode-row') || button.classList.contains('shape-swatch')) {
      button.setAttribute('aria-pressed', String(active));
    }
  }

  const semanticObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') syncSemanticButton(mutation.target);
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('button')) syncSemanticButton(node);
        node.querySelectorAll?.('button').forEach(syncSemanticButton);
      });
    });
  });
  semanticObserver.observe(document.querySelector('.controls'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  document.querySelectorAll('button').forEach(syncSemanticButton);

  document.querySelectorAll('[role="tablist"]').forEach((tablist) => {
    tablist.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...tablist.querySelectorAll('[role="tab"]')].filter(tab => !tab.disabled);
      const current = Math.max(0, tabs.indexOf(document.activeElement));
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  });

  document.querySelectorAll('label.file-btn[tabindex="0"]').forEach((label) => {
    label.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      document.getElementById(label.htmlFor)?.click();
    });
  });

  // ---------- Sidebar resize ----------
  (function initSidebarResize() {
    const handle = document.getElementById('sidebarResizeHandle');
    const controlsEl = document.querySelector('.controls');
    const MIN_W = 220, MAX_W = 560;
    let dragging = false;
    function setWidth(width) {
      const nextWidth = Math.max(MIN_W, Math.min(MAX_W, width));
      controlsEl.style.width = nextWidth + 'px';
      handle.setAttribute('aria-valuenow', String(Math.round(nextWidth)));
    }
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      handle.setPointerCapture?.(e.pointerId);
      handle.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = controlsEl.getBoundingClientRect();
      setWidth(e.clientX - rect.left);
    });
    function finishResize() {
      if (dragging) { dragging = false; handle.classList.remove('dragging'); }
    }
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
    handle.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = controlsEl.getBoundingClientRect().width;
      if (event.key === 'Home') setWidth(MIN_W);
      else if (event.key === 'End') setWidth(MAX_W);
      else setWidth(current + (event.key === 'ArrowRight' ? 16 : -16));
    });
  })();

  // ---------- Slide data model ----------
  // Each slide: { id, name, mapCanvas, fogCanvas, fogCtx, markers:[], camera:{x,y,w,h}, undoStack:[] }
  let slides = [];
  let currentSlideId = null;
  let nextSlideId = 1;

  function cs() { return slides.find(s => s.id === currentSlideId) || null; }

  let appMode = 'maps';  // 'maps' | 'brush' | 'markers' | 'camera' | 'grid' | 'aoe' | 'dice' | 'init'
  let fogDir = 'reveal';  // 'reveal' | 'cover'
  let drawing = false;
  let activeFogAction = null;
  let lastX = 0, lastY = 0;
  const UNDO_LIMIT = 25;
  let fogViewOpacity = 0.55;
  let gridColor = '#ffffff';

  // ---------- Dice roller state (global, not per-slide — rolling isn't tied to a specific map) ----------
  const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100];
  let diceSides = 20;
  let diceAdvMode = 'normal'; // 'normal' | 'adv' | 'dis'
  let diceHistory = []; // {id, label, rollsA, totalA, rollsB, totalB, kept, finalTotal}
  let diceRevealedId = null;
  let nextDiceId = 1;
  const DICE_HISTORY_LIMIT = 50;
  let dicePool = []; // {id, sides, value} — quick one-click rolls, separate from the structured history below
  let nextPoolId = 1;
  let dicePoolRevealed = false;

  // ---------- Initiative tracker state (global, not per-slide — combat isn't tied to a specific map) ----------
  let initiative = { combatants: [], currentCombatantId: null, round: 1, showOnDisplay: false };
  let nextCombatantId = 1;
  let nextHpLogId = 1;

  let displayWindowManager = null;

  const MARKER_COLORS = ['#ff5b5b', '#ffd23f', '#4fa3ff', '#4fd67f', '#c77dff'];
  let markerColor = MARKER_COLORS[0];
  const MARKER_SHAPES = ['x', 'circle', 'square', 'triangle', 'star', 'skull', 'chest'];
  let markerShape = 'x';
  let markerVisibleDefault = false;
  let markerSizeDefault = 12;
  let nextMarkerId = 1;
  let selectedMarkerId = null;
  let draggingMarker = null;
  let dragGrabOffset = { dx: 0, dy: 0 };
  const shapeSwatchCtxs = [];

  let cameraDrag = null; // 'move' | 'nw' | 'ne' | 'sw' | 'se' | null

  const AOE_COLORS = ['#ff5b5b', '#ffd23f', '#4fa3ff', '#4fd67f', '#c77dff'];
  let aoeColor = AOE_COLORS[0];
  let aoeShapeType = 'circle'; // 'circle' | 'square' | 'cone'
  let aoeFt = 20;
  let aoeRotationDeg = 0;
  let nextAoeId = 1;
  let selectedAoeId = null;
  let draggingAoe = null;
  let rotatingAoe = null; // the shape currently being rotated via its on-canvas handle

  // ---------- Calibration tools (transient — not persisted) ----------
  let calibRefFt = 5;             // reference length the current calibration action represents
  let calibratingLine = false;    // "Draw a line" mode is armed/active
  let draggingCalibLine = false;
  let calibLineStart = null;      // {x,y} in map-pixel space
  let calibLineCurrent = null;
  let calibShowingSquare = false; // "Show reference square" is active

  // ---------- Dungeon Mode (transient GM-only annotations, painted like fog but as selectable, notable segments) ----------
  const DUNGEON_COLORS = ['#ff5b5b', '#ffd23f', '#4fa3ff', '#4fd67f', '#c77dff'];
  let dungeonColor = DUNGEON_COLORS[0];
  let nextDungeonId = 1;
  let dungeonActiveSegmentId = null;
  let dungeonPainting = false;
  let dungeonTool = 'paint';

  // ---------- Category tab system (Maps standalone; Map/Display/Tools group the rest) ----------
  const TAB_CATEGORY = {
    brush: 'map', markers: 'map', grid: 'map', dungeon: 'map',
    camera: 'display', calibrate: 'display',
    aoe: 'tools', dice: 'tools', init: 'tools'
  };
  let lastActiveInCategory = { map: 'brush', display: 'camera', tools: 'aoe' };

  let dragGrabOffsetAoe = { dx: 0, dy: 0 };
  const HANDLE_SIZE = 14;

  // ---------- Shared color picker (presets + wheel + cross-context "recently used") ----------
  const { setup: setupColorPicker, highlight: highlightColorPicker } = createSharedColorPicker();

  setupColorPicker(colorSwatches, colorSwatchesRecent, markerColorWheel, MARKER_COLORS, markerColor, (hex) => {
    markerColor = hex;
    renderShapeSwatchPreviews();
  }, 'Marker color');

  MARKER_SHAPES.forEach((shape) => {
    const b = document.createElement('button');
    b.className = 'shape-swatch' + (shape === markerShape ? ' active' : '');
    b.dataset.shape = shape;
    b.type = 'button';
    b.setAttribute('aria-label', 'Marker shape: ' + shape);
    b.title = 'Marker shape: ' + shape;
    const c = document.createElement('canvas');
    c.width = 30; c.height = 30;
    b.appendChild(c);
    shapeSwatchCtxs.push({ shape, canvas: c });
    b.addEventListener('click', () => {
      markerShape = shape;
      [...shapeSwatches.children].forEach(ch => ch.classList.remove('active'));
      b.classList.add('active');
    });
    shapeSwatches.appendChild(b);
  });

  function renderShapeSwatchPreviews() {
    shapeSwatchCtxs.forEach(({ shape, canvas }) => {
      const c2 = canvas.getContext('2d');
      c2.clearRect(0, 0, canvas.width, canvas.height);
      drawMarkerShape(c2, shape, 15, 16, 10, markerColor);
    });
  }
  renderShapeSwatchPreviews();

  setupColorPicker(aoeColorSwatches, aoeColorSwatchesRecent, aoeColorWheel, AOE_COLORS, aoeColor, (hex) => {
    aoeColor = hex;
    const s = cs();
    const shape = s && selectedAoeId !== null ? s.aoeShapes.find(a => a.id === selectedAoeId) : null;
    if (shape) { shape.color = hex; pushAoeUndo(s); redraw(); }
  }, 'AoE color');

  setupColorPicker(dungeonColorSwatches, dungeonColorSwatchesRecent, dungeonColorWheel, DUNGEON_COLORS, dungeonColor, (hex) => {
    dungeonColor = hex;
    const s = cs();
    const seg = s && dungeonActiveSegmentId !== null ? s.dungeonSegments.find(sg => sg.id === dungeonActiveSegmentId) : null;
    if (seg) { seg.color = hex; pushDungeonUndo(s); renderDungeonSegments(); redraw(); }
  }, 'Dungeon segment color');

  DICE_SIDES.forEach((sides) => {
    const b = document.createElement('button');
    b.textContent = 'd' + sides;
    if (sides === diceSides) b.classList.add('active');
    b.addEventListener('click', () => {
      diceSides = sides;
      [...diceTypeButtons.children].forEach(ch => ch.classList.remove('active'));
      b.classList.add('active');
      rollIntoPool(sides);
    });
    diceTypeButtons.appendChild(b);
  });

  // ---------- Loading images into slides ----------
  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const reader = new FileReader();
      let imageReady = false;
      let dataReady = false;
      let sourceDataUrl = null;
      const objectUrl = URL.createObjectURL(file);
      const finish = () => {
        if (!imageReady || !dataReady) return;
        URL.revokeObjectURL(objectUrl);
        resolve({ image, sourceDataUrl });
      };
      image.onload = () => { imageReady = true; finish(); };
      image.onerror = (error) => { URL.revokeObjectURL(objectUrl); reject(error); };
      reader.onload = () => { sourceDataUrl = reader.result; dataReady = true; finish(); };
      reader.onerror = () => { URL.revokeObjectURL(objectUrl); reject(reader.error); };
      image.src = objectUrl;
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    let imported = 0;
    let failed = 0;
    for (const f of files) {
      try {
        const loaded = await loadImageFromFile(f);
        addSlideFromImage(loaded.image, f.name.replace(/\.[^/.]+$/, ''), loaded.sourceDataUrl);
        imported++;
      } catch (e) {
        failed++;
      }
    }
    if (imported) announceStatus(`Added ${imported} map${imported === 1 ? '' : 's'}.`);
    if (failed) announceStatus(`${failed} image${failed === 1 ? '' : 's'} could not be read.`);
  }

  function addSlideFromImage(img, name, sourceDataUrl) {
    const constrained = constrainedMapSize(img.naturalWidth, img.naturalHeight);
    const w = constrained.width;
    const h = constrained.height;

    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = w; mapCanvas.height = h;
    mapCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = w; fogCanvas.height = h;
    const fogCtx = fogCanvas.getContext('2d');
    // Default: no fog at all (fully transparent) — a blank canvas already starts this way.

    const thumbCanvas = document.createElement('canvas');
    const thumbW = 92, thumbH = Math.round(thumbW * (h / w));
    thumbCanvas.width = thumbW; thumbCanvas.height = thumbH;
    thumbCanvas.getContext('2d').drawImage(mapCanvas, 0, 0, thumbW, thumbH);

    const slide = {
      id: nextSlideId++,
      name: name || ('Map ' + (slides.length + 1)),
      mapCanvas, fogCanvas, fogCtx,
      mapDataUrl: constrained.scaled ? mapCanvas.toDataURL('image/jpeg', 0.9) : sourceDataUrl,
      thumb: thumbCanvas.toDataURL('image/jpeg', 0.7),
      markers: [],
      camera: { x: 0, y: 0, w, h },
      grid: { enabled: false, size: 100, offsetX: 0, offsetY: 0, opacity: 1 },
      aoeShapes: [],
      aoeCalibration: 100, // pixels per 5ft square, used only when this map has no grid
      aoeZoomLock: false,
      aoeZoomLockRefCalibration: null,
      aoeZoomLockRefCamW: null,
      aoeZoomLockRefCamera: null,
      dungeonSegments: [],
      fogBaseImage: null,
      fogActions: [],
      fogCommittedActions: [],
      fogDataUrl: null,
      fogDirty: true,
      markersUndoStack: [],
      cameraUndoStack: [],
      gridUndoStack: [],
      aoeUndoStack: [],
      dungeonUndoStack: []
    };
    slide.markersUndoStack.push(cloneValue(slide.markers));
    slide.cameraUndoStack.push(snapshotCamera(slide.camera));
    slide.gridUndoStack.push(snapshotGrid(slide.grid));
    slide.aoeUndoStack.push(snapshotAoe(slide));
    slide.dungeonUndoStack.push(cloneValue(slide.dungeonSegments));
    slides.push(slide);

    renderSlideList();
    if (currentSlideId === null) selectSlide(slide.id);
  }

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(evt => {
    canvasArea.addEventListener(evt, (e) => {
      e.preventDefault();
      canvasArea.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    canvasArea.addEventListener(evt, (e) => {
      if (evt === 'dragleave' && e.target !== canvasArea) return;
      canvasArea.classList.remove('drag-over');
    });
  });
  canvasArea.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });

  // ---------- Session save / load ----------
  function serializeSession() {
    return {
      version: 1,
      currentIndex: slides.findIndex(s => s.id === currentSlideId),
      fogViewOpacity: fogViewOpacity,
      gridColor: gridColor,
      diceHistory: diceHistory,
      dicePool: dicePool,
      initiative: { combatants: initiative.combatants, currentCombatantId: initiative.currentCombatantId, round: initiative.round, showOnDisplay: initiative.showOnDisplay },
      slides: slides.map(s => ({
        name: s.name,
        mapDataUrl: s.mapDataUrl,
        fogDataUrl: getFogDataUrl(s),
        thumb: s.thumb,
        markers: s.markers,
        camera: s.camera,
        grid: s.grid,
        aoeShapes: s.aoeShapes,
        aoeCalibration: s.aoeCalibration,
        aoeZoomLock: s.aoeZoomLock,
        aoeZoomLockRefCalibration: s.aoeZoomLockRefCalibration,
        aoeZoomLockRefCamW: s.aoeZoomLockRefCamW,
        aoeZoomLockRefCamera: s.aoeZoomLockRefCamera,
        dungeonSegments: s.dungeonSegments
      }))
    };
  }

  function getFogDataUrl(slide) {
    if (slide.fogDirty || !slide.fogDataUrl) {
      slide.fogDataUrl = slide.fogCanvas.toDataURL('image/png');
      slide.fogDirty = false;
    }
    return slide.fogDataUrl;
  }

  saveSessionBtn.addEventListener('click', () => {
    if (slides.length === 0) { alert('Nothing to save yet — add a map first.'); return; }
    const data = serializeSession();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    a.download = 'tavern-mapper-session-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announceStatus('Session saved.');
  });

  function loadImageFromDataUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async function restoreSession(data) {
    const restored = [];
    for (const sd of data.slides) {
      const mapImg = await loadImageFromDataUrl(sd.mapDataUrl);
      const fogImg = await loadImageFromDataUrl(sd.fogDataUrl);

      const mapCanvas = document.createElement('canvas');
      mapCanvas.width = mapImg.naturalWidth;
      mapCanvas.height = mapImg.naturalHeight;
      mapCanvas.getContext('2d').drawImage(mapImg, 0, 0);

      const fogCanvas = document.createElement('canvas');
      fogCanvas.width = mapCanvas.width;
      fogCanvas.height = mapCanvas.height;
      const fogCtx = fogCanvas.getContext('2d');
      fogCtx.drawImage(fogImg, 0, 0);

      const rawGrid = Object.assign({ enabled: false, size: 100, offsetX: 0, offsetY: 0, opacity: 1 }, sd.grid || {});
      const safeSize = (typeof rawGrid.size === 'number' && rawGrid.size >= 20 && isFinite(rawGrid.size)) ? rawGrid.size : 100;
      const clampOffset = (v) => (typeof v === 'number' && isFinite(v)) ? Math.max(-150, Math.min(150, v)) : 0;
      const safeOpacity = (typeof rawGrid.opacity === 'number' && isFinite(rawGrid.opacity)) ? Math.max(0, Math.min(1, rawGrid.opacity)) : 1;

      const rawCamera = sd.camera || {};
      const safeCamera = {
        w: (typeof rawCamera.w === 'number' && rawCamera.w > 0) ? Math.min(rawCamera.w, mapCanvas.width) : mapCanvas.width,
        h: (typeof rawCamera.h === 'number' && rawCamera.h > 0) ? Math.min(rawCamera.h, mapCanvas.height) : mapCanvas.height,
      };
      safeCamera.x = (typeof rawCamera.x === 'number' && isFinite(rawCamera.x)) ? Math.max(0, Math.min(rawCamera.x, mapCanvas.width - safeCamera.w)) : 0;
      safeCamera.y = (typeof rawCamera.y === 'number' && isFinite(rawCamera.y)) ? Math.max(0, Math.min(rawCamera.y, mapCanvas.height - safeCamera.h)) : 0;

      const safeAoeCalibration = (typeof sd.aoeCalibration === 'number' && sd.aoeCalibration >= 10 && isFinite(sd.aoeCalibration)) ? sd.aoeCalibration : 100;
      const AOE_TYPES = ['circle', 'square', 'cone'];

      const rawLockCam = sd.aoeZoomLockRefCamera;
      const safeLockCam = (rawLockCam && typeof rawLockCam.w === 'number' && rawLockCam.w > 0 && typeof rawLockCam.h === 'number' && rawLockCam.h > 0
        && typeof rawLockCam.x === 'number' && isFinite(rawLockCam.x) && typeof rawLockCam.y === 'number' && isFinite(rawLockCam.y))
        ? { x: rawLockCam.x, y: rawLockCam.y, w: Math.min(rawLockCam.w, mapCanvas.width), h: Math.min(rawLockCam.h, mapCanvas.height) }
        : null;
      const safeLockRefCalibration = (typeof sd.aoeZoomLockRefCalibration === 'number' && sd.aoeZoomLockRefCalibration > 0 && isFinite(sd.aoeZoomLockRefCalibration)) ? sd.aoeZoomLockRefCalibration : null;
      const safeLockRefCamW = (typeof sd.aoeZoomLockRefCamW === 'number' && sd.aoeZoomLockRefCamW > 0 && isFinite(sd.aoeZoomLockRefCamW)) ? sd.aoeZoomLockRefCamW : null;
      // zoom-lock only makes sense if every piece of its reference survived sanitization intact
      const safeZoomLock = !!sd.aoeZoomLock && !!safeLockCam && safeLockRefCalibration !== null && safeLockRefCamW !== null;

      const slide = {
        id: nextSlideId++,
        name: sd.name || 'Map',
        mapCanvas, fogCanvas, fogCtx,
        mapDataUrl: sd.mapDataUrl,
        thumb: sd.thumb,
        markers: Array.isArray(sd.markers) ? sd.markers.map(m => ({
          id: nextMarkerId++,
          x: (typeof m.x === 'number') ? m.x : 0,
          y: (typeof m.y === 'number') ? m.y : 0,
          color: m.color || MARKER_COLORS[0],
          shape: MARKER_SHAPES.includes(m.shape) ? m.shape : 'x',
          label: typeof m.label === 'string' ? m.label : '',
          visible: m.visible === true,
          size: (typeof m.size === 'number' && isFinite(m.size)) ? Math.max(6, Math.min(60, m.size)) : 12,
        })) : [],
        camera: safeCamera,
        grid: { enabled: !!rawGrid.enabled, size: safeSize, offsetX: clampOffset(rawGrid.offsetX), offsetY: clampOffset(rawGrid.offsetY), opacity: safeOpacity },
        aoeShapes: Array.isArray(sd.aoeShapes) ? sd.aoeShapes.map(a => ({
          id: nextAoeId++,
          type: AOE_TYPES.includes(a.type) ? a.type : 'circle',
          x: (typeof a.x === 'number' && isFinite(a.x)) ? a.x : 0,
          y: (typeof a.y === 'number' && isFinite(a.y)) ? a.y : 0,
          ft: (typeof a.ft === 'number' && a.ft > 0 && isFinite(a.ft)) ? a.ft : 20,
          rotation: (typeof a.rotation === 'number' && isFinite(a.rotation)) ? a.rotation : 0,
          color: a.color || AOE_COLORS[0],
          visible: (typeof a.visible === 'boolean') ? a.visible : true
        })) : [],
        aoeCalibration: safeAoeCalibration,
        aoeZoomLock: safeZoomLock,
        aoeZoomLockRefCalibration: safeZoomLock ? safeLockRefCalibration : null,
        aoeZoomLockRefCamW: safeZoomLock ? safeLockRefCamW : null,
        aoeZoomLockRefCamera: safeZoomLock ? safeLockCam : null,
        dungeonSegments: Array.isArray(sd.dungeonSegments) ? sd.dungeonSegments.map(seg => ({
          id: nextDungeonId++,
          number: (typeof seg.number === 'number' && seg.number > 0) ? Math.floor(seg.number) : null,
          name: typeof seg.name === 'string' ? seg.name : 'Segment',
          color: seg.color || DUNGEON_COLORS[0],
          notes: typeof seg.notes === 'string' ? seg.notes : '',
          strokes: Array.isArray(seg.strokes) ? seg.strokes.map(st => ({
            brushSize: (typeof st.brushSize === 'number' && st.brushSize > 0 && isFinite(st.brushSize)) ? st.brushSize : 60,
            points: Array.isArray(st.points) ? st.points.filter(pt => pt && typeof pt.x === 'number' && typeof pt.y === 'number' && isFinite(pt.x) && isFinite(pt.y)) : []
          })).filter(st => st.points.length > 0) : []
        })).map((segment, index) => ({ ...segment, number: segment.number || index + 1 })) : [],
        fogBaseImage: fogImg,
        fogActions: [],
        fogCommittedActions: [],
        fogDataUrl: sd.fogDataUrl,
        fogDirty: false,
        markersUndoStack: [],
        cameraUndoStack: [],
        gridUndoStack: [],
        aoeUndoStack: [],
        dungeonUndoStack: []
      };
      slide.markersUndoStack.push(cloneValue(slide.markers));
      slide.cameraUndoStack.push(snapshotCamera(slide.camera));
      slide.gridUndoStack.push(snapshotGrid(slide.grid));
      slide.aoeUndoStack.push(snapshotAoe(slide));
      slide.dungeonUndoStack.push(cloneValue(slide.dungeonSegments));
      restored.push(slide);
    }

    slides = restored;
    currentSlideId = null;

    if (typeof data.fogViewOpacity === 'number') {
      fogViewOpacity = data.fogViewOpacity;
      fogOpacity.value = Math.round(fogViewOpacity * 100);
      fogOpacityLabel.textContent = fogOpacity.value + '%';
    }
    if (data.gridColor) {
      gridColor = data.gridColor;
      gridColorEl.value = gridColor;
    }

    if (Array.isArray(data.diceHistory)) {
      diceHistory = data.diceHistory
        .filter(d => d && typeof d.label === 'string' && typeof d.finalTotal === 'number')
        .slice(-DICE_HISTORY_LIMIT)
        .map(d => ({ ...d, id: nextDiceId++ }));
    } else {
      diceHistory = [];
    }
    diceRevealedId = null; // a revealed announcement shouldn't resurrect on load; the display window itself resets anyway
    renderDiceHistory();
    diceResultEl.innerHTML = '';

    if (Array.isArray(data.dicePool)) {
      dicePool = data.dicePool
        .filter(e => e && typeof e.sides === 'number' && typeof e.value === 'number')
        .map(e => ({ id: nextPoolId++, sides: e.sides, value: e.value }));
    } else {
      dicePool = [];
    }
    dicePoolRevealed = false;
    renderDicePool();

    const rawInit = data.initiative || {};
    const rawCombatants = Array.isArray(rawInit.combatants)
      ? rawInit.combatants.filter(c => c && typeof c.name === 'string' && typeof c.score === 'number' && isFinite(c.score))
      : [];
    const currentIdxInRaw = rawCombatants.findIndex(c => c.id === rawInit.currentCombatantId);
    const safeCombatants = rawCombatants.map(c => {
      let hpLog;
      if (Array.isArray(c.hpLog)) {
        hpLog = c.hpLog
          .filter(e => e && (e.type === 'set' || e.type === 'delta') && typeof e.value === 'number' && isFinite(e.value))
          .map(e => ({ id: nextHpLogId++, type: e.type, value: e.value, raw: typeof e.raw === 'string' ? e.raw : String(e.value) }));
      } else if (typeof c.hp === 'number' && isFinite(c.hp)) {
        // backward compatibility with sessions saved before the HP log existed
        hpLog = [{ id: nextHpLogId++, type: 'set', value: c.hp, raw: String(c.hp) }];
      } else {
        hpLog = [];
      }
      return {
        id: nextCombatantId++,
        name: c.name,
        score: c.score,
        ac: (typeof c.ac === 'number' && isFinite(c.ac)) ? c.ac : null,
        hpLog
      };
    });
    initiative = {
      combatants: safeCombatants,
      // ids were just reassigned above, so match the previously-current combatant by its position
      // in the saved array instead — otherwise every load would silently reset whose turn it is.
      currentCombatantId: (currentIdxInRaw >= 0 && safeCombatants[currentIdxInRaw]) ? safeCombatants[currentIdxInRaw].id : null,
      round: (typeof rawInit.round === 'number' && rawInit.round >= 1) ? Math.floor(rawInit.round) : 1,
      showOnDisplay: !!rawInit.showOnDisplay
    };
    renderInitiative();

    renderSlideList();
    if (slides.length) {
      const idx = (typeof data.currentIndex === 'number' && slides[data.currentIndex]) ? data.currentIndex : 0;
      selectSlide(slides[idx].id);
    } else {
      workCanvas.style.display = 'none';
      emptyState.style.display = 'block';
      dimsLabel.textContent = '';
    }
    updateDisplayExtras();
  }

  loadSessionInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (slides.length > 0 && !confirm('Loading a session replaces all maps currently loaded, including their fog and markers. Continue?')) {
      loadSessionInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.slides)) throw new Error('bad format');
        await restoreSession(data);
        announceStatus(`Session loaded with ${data.slides.length} map${data.slides.length === 1 ? '' : 's'}.`);
      } catch (err) {
        announceStatus('Session could not be loaded.');
        alert('Could not read that session file — it may be corrupted or not a valid export from this app.');
      }
      loadSessionInput.value = '';
    };
    reader.onerror = () => {
      announceStatus('File could not be read.');
      alert('Could not read that file.');
      loadSessionInput.value = '';
    };
    reader.readAsText(file);
  });

  // ---------- Slide list UI + reordering ----------
  let draggingId = null;

  function startSlideRename(slide, row, nameElement) {
    if (row.querySelector('.slide-name-input')) return;
    row.draggable = false;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'slide-name-input';
    input.value = slide.name;
    input.setAttribute('aria-label', 'Map name');
    nameElement.replaceWith(input);
    input.focus();
    input.select();

    let finished = false;
    function finish(save) {
      if (finished) return;
      finished = true;
      if (save) {
        const nextName = input.value.trim();
        if (nextName) {
          slide.name = nextName;
          if (slide.id === currentSlideId) dimsLabel.textContent = slide.name + ' — ' + slide.mapCanvas.width + ' × ' + slide.mapCanvas.height + 'px';
          scheduleAutosave();
          announceStatus('Map renamed to ' + slide.name + '.');
        }
      }
      renderSlideList();
    }
    input.addEventListener('click', event => event.stopPropagation());
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') finish(true);
      if (event.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  }

  function renderSlideList() {
    slideListEl.innerHTML = '';
    slides.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'slide-item' + (s.id === currentSlideId ? ' active' : '');
      row.draggable = true;
      row.dataset.id = s.id;

      const img = document.createElement('img');
      img.className = 'slide-thumb';
      img.src = s.thumb;

      const name = document.createElement('div');
      name.className = 'slide-name';
      name.textContent = s.name;

      const edit = document.createElement('button');
      edit.className = 'slide-edit';
      edit.textContent = '✎';
      edit.title = 'Rename map';
      edit.setAttribute('aria-label', 'Rename map ' + s.name);
      edit.addEventListener('click', (event) => {
        event.stopPropagation();
        startSlideRename(s, row, name);
      });

      const remove = document.createElement('button');
      remove.className = 'slide-remove';
      remove.textContent = '✕';
      remove.title = 'Remove this map';
      remove.setAttribute('aria-label', 'Remove map ' + s.name);
      remove.addEventListener('click', (e) => { e.stopPropagation(); removeSlide(s.id); });

      row.appendChild(img);
      row.appendChild(name);
      row.appendChild(edit);
      row.appendChild(remove);

      row.addEventListener('click', () => selectSlide(s.id));
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'Open map ' + s.name);
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectSlide(s.id);
      });

      row.addEventListener('dragstart', () => { draggingId = s.id; });
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-hint'); });
      row.addEventListener('dragleave', () => row.classList.remove('drag-hint'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-hint');
        if (draggingId === null || draggingId === s.id) return;
        const fromIdx = slides.findIndex(x => x.id === draggingId);
        const toIdx = slides.findIndex(x => x.id === s.id);
        const [moved] = slides.splice(fromIdx, 1);
        slides.splice(toIdx, 0, moved);
        draggingId = null;
        renderSlideList();
        scheduleAutosave();
      });

      slideListEl.appendChild(row);
    });
  }

  function selectSlide(id) {
    currentSlideId = id;
    selectedMarkerId = null;
    draggingMarker = null;
    syncMarkerInspector(null);
    selectedAoeId = null;
    draggingAoe = null;
    rotatingAoe = null;
    calibratingLine = false;
    draggingCalibLine = false;
    calibLineStart = null;
    calibLineCurrent = null;
    calibShowingSquare = false;
    calibDrawLineBtn.textContent = 'Draw a line to calibrate…';
    calibDrawLineBtn.classList.remove('primary');
    calibShowSquareBtn.textContent = 'Show reference square';
    calibShowSquareBtn.classList.remove('primary');
    dungeonActiveSegmentId = null;
    dungeonPainting = false;
    dungeonNotesPanel.style.display = 'none';
    hideDungeonTooltip();
    const s = cs();
    if (!s) return;
    const preview = constrainedMapSize(s.mapCanvas.width, s.mapCanvas.height, MAX_CONTROL_PREVIEW_DIMENSION);
    workCanvas.width = preview.width;
    workCanvas.height = preview.height;
    workCanvas.dataset.mapWidth = s.mapCanvas.width;
    workCanvas.dataset.mapHeight = s.mapCanvas.height;
    workCanvas.style.display = 'block';
    emptyState.style.display = 'none';
    dimsLabel.textContent = s.name + ' — ' + s.mapCanvas.width + ' × ' + s.mapCanvas.height + 'px';
    gridEnabledEl.checked = s.grid.enabled;
    gridSizeEl.value = s.grid.size;
    gridSizeLabel.textContent = s.grid.size + 'px';
    gridOffsetXEl.value = s.grid.offsetX;
    gridOffsetXLabel.textContent = s.grid.offsetX + 'px';
    gridOffsetYEl.value = s.grid.offsetY;
    gridOffsetYLabel.textContent = s.grid.offsetY + 'px';
    gridOpacityEl.value = Math.round(((typeof s.grid.opacity === 'number') ? s.grid.opacity : 1) * 100);
    gridOpacityLabel.textContent = gridOpacityEl.value + '%';
    updateCalibrationUI();
    renderDungeonSegments();
    renderSlideList();
    redraw();
  }

  function removeSlide(id) {
    const idx = slides.findIndex(s => s.id === id);
    if (idx === -1) return;
    const s = slides[idx];
    const ok = confirm('Remove "' + s.name + '"? This deletes its fog, markers, and camera framing permanently — there is no undo for this.');
    if (!ok) return;
    slides.splice(idx, 1);
    if (currentSlideId === id) {
      if (slides.length === 0) {
        currentSlideId = null;
        workCanvas.style.display = 'none';
        emptyState.style.display = 'block';
        dimsLabel.textContent = '';
      } else {
        selectSlide(slides[Math.min(idx, slides.length - 1)].id);
      }
    }
    renderSlideList();
    scheduleAutosave();
  }

  prevSlideBtn.addEventListener('click', () => {
    if (slides.length < 2 || !cs()) return;
    const idx = slides.findIndex(s => s.id === currentSlideId);
    const newIdx = (idx - 1 + slides.length) % slides.length;
    selectSlide(slides[newIdx].id);
  });
  nextSlideBtn.addEventListener('click', () => {
    if (slides.length < 2 || !cs()) return;
    const idx = slides.findIndex(s => s.id === currentSlideId);
    const newIdx = (idx + 1) % slides.length;
    selectSlide(slides[newIdx].id);
  });

  // ---------- AoE templates ----------
  // Pixels-per-foot for a given map: locked to its grid (1 square = 5ft) when a grid is on,
  // otherwise falls back to that map's manual calibration.
  function pxPerFoot(s) {
    return s.grid.enabled ? (s.grid.size / 5) : (s.aoeCalibration / 5);
  }

  // ---------- Calibration tool overlays (transient guides, not saved shapes) ----------
  function drawCalibLineOnCtx(targetCtx, transform, scale) {
    if (!calibLineStart || !calibLineCurrent) return;
    const [sx, sy] = transform(calibLineStart.x, calibLineStart.y);
    const [ex, ey] = transform(calibLineCurrent.x, calibLineCurrent.y);
    targetCtx.save();
    targetCtx.strokeStyle = '#ffd23f';
    targetCtx.lineWidth = Math.max(2, 3 * scale);
    targetCtx.setLineDash([8 * scale, 5 * scale]);
    targetCtx.beginPath();
    targetCtx.moveTo(sx, sy);
    targetCtx.lineTo(ex, ey);
    targetCtx.stroke();
    targetCtx.setLineDash([]);
    [[sx, sy], [ex, ey]].forEach(([hx, hy]) => {
      targetCtx.beginPath();
      targetCtx.arc(hx, hy, Math.max(4, 5 * scale), 0, Math.PI * 2);
      targetCtx.fillStyle = '#ffd23f';
      targetCtx.fill();
    });
    const midX = (sx + ex) / 2, midY = (sy + ey) / 2;
    const label = calibRefFt + 'ft';
    targetCtx.font = Math.max(13, 14 * scale) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
    const textW = targetCtx.measureText(label).width;
    targetCtx.fillStyle = 'rgba(10,11,14,0.85)';
    targetCtx.fillRect(midX - textW / 2 - 6, midY - 22 * scale, textW + 12, 20 * scale);
    targetCtx.fillStyle = '#ffd23f';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(label, midX - textW / 2, midY - 12 * scale);
    targetCtx.restore();
  }

  function drawCalibSquareOnCtx(targetCtx, s, transform, scale) {
    if (!calibShowingSquare) return;
    const ppf = pxPerFoot(s);
    const center = { x: s.camera.x + s.camera.w / 2, y: s.camera.y + s.camera.h / 2 };
    const geom = computeAoeGeometry({ type: 'square', x: center.x, y: center.y, ft: calibRefFt, rotation: 0 }, ppf);
    targetCtx.save();
    targetCtx.strokeStyle = '#ffd23f';
    targetCtx.lineWidth = Math.max(2, 3 * scale);
    targetCtx.setLineDash([8 * scale, 5 * scale]);
    targetCtx.beginPath();
    geom.points.forEach(([px, py], i) => {
      const [sx, sy] = transform(px, py);
      if (i === 0) targetCtx.moveTo(sx, sy); else targetCtx.lineTo(sx, sy);
    });
    targetCtx.closePath();
    targetCtx.stroke();
    targetCtx.setLineDash([]);
    const [cx, cy] = transform(center.x, center.y);
    const label = calibRefFt + 'ft square';
    targetCtx.font = Math.max(13, 14 * scale) + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
    const textW = targetCtx.measureText(label).width;
    targetCtx.fillStyle = 'rgba(10,11,14,0.85)';
    targetCtx.fillRect(cx - textW / 2 - 6, cy - 10 * scale, textW + 12, 20 * scale);
    targetCtx.fillStyle = '#ffd23f';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(label, cx - textW / 2, cy);
    targetCtx.restore();
  }

  function hitTestAoe(s, x, y) {
    const ppf = pxPerFoot(s);
    for (let i = s.aoeShapes.length - 1; i >= 0; i--) {
      const shape = s.aoeShapes[i];
      const geom = computeAoeGeometry(shape, ppf);
      if (geom.kind === 'circle') {
        if (Math.hypot(x - geom.cx, y - geom.cy) <= geom.r) return shape;
      } else if (pointInConvexPoly(x, y, geom.points)) {
        return shape;
      }
    }
    return null;
  }

  // ---------- Dungeon Mode: freehand-painted, individually selectable segments with notes ----------
  // GM-only by design (same reasoning as Markers) — rendered only on the control canvas below,
  // never referenced by drawCompositeToCtx, so there's no path for it to reach the display.
  function updateCalibrationUI() {
    const s = cs();
    if (!s) return;
    if (s.grid.enabled) {
      aoeCalibrationGridNote.style.display = 'block';
      aoeCalibrationGridNote.textContent = "Using this map's grid: 1 square = 5ft (" + Math.round(s.grid.size) + 'px).';
      aoeCalibrationManualRow.style.display = 'none';
    } else {
      aoeCalibrationGridNote.style.display = 'none';
      aoeCalibrationManualRow.style.display = 'block';
      aoeCalibrationEl.value = Math.round(s.aoeCalibration);
      aoeZoomLockToggle.checked = !!s.aoeZoomLock;
      calibSnapZoomBtn.style.display = (s.aoeZoomLock && s.aoeZoomLockRefCamera) ? 'block' : 'none';
      // Locked calibration is a live-derived readout, not directly editable — except while a fresh
      // calibration is actively in progress (the reference square), which temporarily overrides it.
      aoeCalibrationEl.disabled = !!s.aoeZoomLock && !calibShowingSquare;
    }
  }

  function syncAoeInspector(shape) {
    if (!shape) return;
    aoeShapeType = shape.type;
    [aoeCircleBtn, aoeSquareBtn, aoeConeBtn].forEach(b => b.classList.remove('active'));
    ({ circle: aoeCircleBtn, square: aoeSquareBtn, cone: aoeConeBtn })[shape.type].classList.add('active');
    aoeFtLabel.textContent = shape.type === 'circle' ? 'Radius (ft)' : shape.type === 'square' ? 'Side length (ft)' : 'Length (ft)';
    aoeFt = shape.ft;
    aoeFtEl.value = shape.ft;
    const deg = ((Math.round(shape.rotation * 180 / Math.PI) % 360) + 360) % 360;
    aoeRotationDeg = deg;
    aoeRotationEl.value = deg;
    aoeRotationLabel.textContent = deg + '°';
    aoeColor = shape.color;
    highlightColorPicker(aoeColorSwatches, aoeColorSwatchesRecent, shape.color);
    aoeColorWheel.value = shape.color;
    aoeVisibleToggle.checked = shape.visible !== false;
  }

  function syncDungeonInspector(seg) {
    if (!seg) return;
    dungeonNotesPanel.style.display = 'block';
    dungeonSegmentName.value = seg.name;
    dungeonSegmentNotes.value = seg.notes;
    dungeonColor = seg.color;
    highlightColorPicker(dungeonColorSwatches, dungeonColorSwatchesRecent, seg.color);
    dungeonColorWheel.value = seg.color;
  }

  function syncMarkerInspector(marker) {
    markerVisibleToggle.checked = marker ? marker.visible === true : markerVisibleDefault;
    const size = marker ? marker.size || 12 : markerSizeDefault;
    markerSizeEl.value = size;
    markerSizeLabel.textContent = size + 'px';
    markerNamePanel.style.display = marker ? 'block' : 'none';
    markerNameEl.value = marker ? marker.label : '';
  }

  function hideDungeonTooltip() {
    dungeonTooltip.style.display = 'none';
  }

  function showDungeonTooltip(segment, clientX, clientY) {
    const areaRect = canvasArea.getBoundingClientRect();
    dungeonTooltip.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = `#${segment.number} ${segment.name}`;
    const description = document.createElement('span');
    description.textContent = segment.notes || 'No description.';
    dungeonTooltip.appendChild(title);
    dungeonTooltip.appendChild(description);
    dungeonTooltip.style.display = 'block';
    const tooltipRect = dungeonTooltip.getBoundingClientRect();
    dungeonTooltip.style.left = Math.max(8, Math.min(clientX - areaRect.left + 14, areaRect.width - tooltipRect.width - 8)) + 'px';
    dungeonTooltip.style.top = Math.max(8, Math.min(clientY - areaRect.top + 14, areaRect.height - tooltipRect.height - 8)) + 'px';
  }

  function renderDungeonSegments() {
    const s = cs();
    dungeonSegmentList.innerHTML = '';
    if (!s) return;
    s.dungeonSegments.forEach((seg) => {
      const row = document.createElement('div');
      row.className = 'list-row' + (seg.id === dungeonActiveSegmentId ? ' selected' : '');
      row.style.cursor = 'pointer';
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `Select dungeon segment #${seg.number} ${seg.name}`);
      if (seg.id === dungeonActiveSegmentId) row.setAttribute('aria-describedby', 'dungeonTooltip');
      const swatch = document.createElement('span');
      swatch.style.cssText = 'width:14px; height:14px; border-radius:50%; flex:none; display:inline-block;';
      swatch.style.background = seg.color;
      const main = document.createElement('div');
      main.className = 'row-main';
      const title = document.createElement('div');
      title.className = 'row-title';
      title.textContent = `#${seg.number} ${seg.name}`;
      const sub = document.createElement('div');
      sub.className = 'row-sub';
      sub.textContent = seg.notes ? (seg.notes.length > 44 ? seg.notes.slice(0, 44) + '…' : seg.notes) : 'No notes yet';
      main.appendChild(title);
      main.appendChild(sub);
      row.appendChild(swatch);
      row.appendChild(main);
      row.addEventListener('click', () => {
        dungeonActiveSegmentId = seg.id;
        syncDungeonInspector(seg);
        renderDungeonSegments();
        redraw();
      });
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        row.click();
      });
      dungeonSegmentList.appendChild(row);
    });
  }

  // ---------- Dice roller ----------
  function performDiceRoll() {
    const count = Math.max(1, Math.min(20, parseInt(diceCountEl.value, 10) || 1));
    const modifier = parseInt(diceModifierEl.value, 10) || 0;
    const a = rollDice(diceSides, count, modifier);
    let b = null, kept = null;
    if (diceAdvMode !== 'normal') {
      b = rollDice(diceSides, count, modifier);
      kept = (diceAdvMode === 'adv') ? (b.total > a.total ? 'B' : 'A') : (b.total < a.total ? 'B' : 'A');
    }
    const finalTotal = kept === 'B' ? b.total : a.total;
    const modStr = modifier === 0 ? '' : (modifier > 0 ? '+' + modifier : String(modifier));
    let label = count + 'd' + diceSides + modStr;
    if (diceAdvMode === 'adv') label += ' (adv)';
    if (diceAdvMode === 'dis') label += ' (dis)';

    const entry = { id: nextDiceId++, label, rollsA: a.rolls, totalA: a.total, rollsB: b ? b.rolls : null, totalB: b ? b.total : null, kept, finalTotal };
    diceHistory.push(entry);
    if (diceHistory.length > DICE_HISTORY_LIMIT) diceHistory.shift();
    renderDiceResult(entry);
    renderDiceHistory();
    scheduleAutosave();
  }

  function renderDiceResult(entry) {
    diceResultEl.innerHTML = '<strong>' + entry.label + ' = ' + entry.finalTotal + '</strong> (' + entry.rollsA.join(', ') + (entry.rollsB ? ' vs ' + entry.rollsB.join(', ') : '') + ')';
  }

  function renderDiceHistory() {
    diceHistoryList.innerHTML = '';
    for (let i = diceHistory.length - 1; i >= 0; i--) {
      const entry = diceHistory[i];
      const row = document.createElement('div');
      row.className = 'list-row' + (entry.id === diceRevealedId ? ' revealed' : '');
      const main = document.createElement('div');
      main.className = 'row-main';
      const title = document.createElement('div');
      title.className = 'row-title';
      title.textContent = entry.label + ' = ' + entry.finalTotal;
      const sub = document.createElement('div');
      sub.className = 'row-sub';
      sub.textContent = entry.rollsA.join(', ') + (entry.rollsB ? ' vs ' + entry.rollsB.join(', ') + ' (kept ' + entry.kept + ')' : '');
      main.appendChild(title);
      main.appendChild(sub);
      const revealBtn = document.createElement('button');
      revealBtn.textContent = entry.id === diceRevealedId ? 'Hide' : 'Show on display';
      revealBtn.addEventListener('click', () => {
        diceRevealedId = (diceRevealedId === entry.id) ? null : entry.id;
        if (diceRevealedId !== null) dicePoolRevealed = false; // only one thing shown on the display banner at a time
        renderDiceHistory();
        renderDicePool();
        updateDisplayExtras();
        scheduleAutosave();
      });
      row.appendChild(main);
      row.appendChild(revealBtn);
      diceHistoryList.appendChild(row);
    }
  }

  // ---------- Dice pool (quick one-click rolls) ----------
  function rollIntoPool(sides) {
    const value = 1 + Math.floor(Math.random() * sides);
    dicePool.push({ id: nextPoolId++, sides, value });
    renderDicePool();
    if (dicePoolRevealed) updateDisplayExtras();
    scheduleAutosave();
  }

  function renderDicePool() {
    dicePoolRow.innerHTML = '';
    dicePool.forEach((entry) => {
      const pill = document.createElement('span');
      pill.className = 'hp-log-pill';
      const text = document.createElement('span');
      text.textContent = 'd' + entry.sides + ':' + entry.value;
      const del = document.createElement('button');
      del.textContent = '×';
      del.title = 'Remove this roll';
      del.addEventListener('click', () => {
        dicePool = dicePool.filter(e => e.id !== entry.id);
        renderDicePool();
        if (dicePoolRevealed) updateDisplayExtras();
        scheduleAutosave();
      });
      pill.appendChild(text);
      pill.appendChild(del);
      dicePoolRow.appendChild(pill);
    });
    const total = dicePool.reduce((sum, e) => sum + e.value, 0);
    dicePoolTotal.textContent = dicePool.length ? total : '—';
    revealPoolBtn.textContent = dicePoolRevealed ? 'Hide pool' : 'Show pool on display';
  }

  clearPoolBtn.addEventListener('click', () => {
    dicePool = [];
    renderDicePool();
    if (dicePoolRevealed) updateDisplayExtras();
    scheduleAutosave();
  });

  revealPoolBtn.addEventListener('click', () => {
    dicePoolRevealed = !dicePoolRevealed;
    if (dicePoolRevealed) { diceRevealedId = null; renderDiceHistory(); } // mutual exclusivity with history reveal
    renderDicePool();
    updateDisplayExtras();
    scheduleAutosave();
  });

  rollDiceBtn.addEventListener('click', performDiceRoll);
  diceAdvBtn.addEventListener('click', () => {
    diceAdvMode = 'adv';
    [diceAdvBtn, diceNormalBtn, diceDisBtn].forEach(b => b.classList.remove('active'));
    diceAdvBtn.classList.add('active');
  });
  diceNormalBtn.addEventListener('click', () => {
    diceAdvMode = 'normal';
    [diceAdvBtn, diceNormalBtn, diceDisBtn].forEach(b => b.classList.remove('active'));
    diceNormalBtn.classList.add('active');
  });
  diceDisBtn.addEventListener('click', () => {
    diceAdvMode = 'dis';
    [diceAdvBtn, diceNormalBtn, diceDisBtn].forEach(b => b.classList.remove('active'));
    diceDisBtn.classList.add('active');
  });

  // ---------- Initiative tracker ----------
  function sortedCombatants() {
    return sortCombatants(initiative.combatants);
  }

  // Until "Next Turn" is pressed for the first time, nothing is officially "current" yet —
  // display the top scorer as the effective current turn without locking it into state, so
  // adding combatants (even ones that outscore an earlier addition) doesn't get stuck.
  function effectiveCurrentId() {
    if (initiative.currentCombatantId !== null) return initiative.currentCombatantId;
    const sorted = sortedCombatants();
    return sorted.length ? sorted[0].id : null;
  }

  // HP is tracked as a log of entries (each a "set" to an absolute value, or a "delta" of +/-N),
  // rather than a single mutated number — so a mistaken entry can be deleted and the running
  // total recalculates from what's left, instead of being lost the moment it's applied.
  function parseHpEntry(rawValue) {
    const trimmed = rawValue.trim();
    if (trimmed === '') return null;
    if (/^[+-]\d+$/.test(trimmed)) {
      return { id: nextHpLogId++, type: 'delta', value: parseInt(trimmed, 10), raw: trimmed };
    }
    const val = parseInt(trimmed, 10);
    if (!isFinite(val)) return null;
    return { id: nextHpLogId++, type: 'set', value: val, raw: trimmed };
  }

  function computeHp(combatant) {
    return computeHitPoints(combatant);
  }

  let expandedHpLogIds = new Set(); // which combatants currently have their HP log expanded (session-only, not persisted)

  function renderInitiative() {
    roundLabel.textContent = initiative.round;
    initiativeShowOnDisplay.checked = initiative.showOnDisplay;
    const currentId = effectiveCurrentId();
    combatantList.innerHTML = '';
    sortedCombatants().forEach((c) => {
      const row = document.createElement('div');
      row.className = 'combatant-row' + (c.id === currentId ? ' current-turn' : '');

      const top = document.createElement('div');
      top.className = 'combatant-top';
      const main = document.createElement('div');
      main.className = 'row-main';
      const title = document.createElement('div');
      title.className = 'row-title';
      title.textContent = (c.id === currentId ? '▶ ' : '') + c.name;
      const sub = document.createElement('div');
      sub.className = 'row-sub';
      sub.textContent = 'Initiative ' + c.score;
      main.appendChild(title);
      main.appendChild(sub);
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => {
        initiative.combatants = initiative.combatants.filter(x => x.id !== c.id);
        if (initiative.currentCombatantId === c.id) initiative.currentCombatantId = null;
        renderInitiative();
        updateDisplayExtras();
        scheduleAutosave();
      });
      top.appendChild(main);
      top.appendChild(removeBtn);

      const stats = document.createElement('div');
      stats.className = 'combatant-stats';

      const acLabel = document.createElement('span');
      acLabel.textContent = 'AC';
      const acInput = document.createElement('input');
      acInput.type = 'number';
      acInput.placeholder = '—';
      acInput.value = (typeof c.ac === 'number') ? c.ac : '';
      const commitAc = () => {
        const val = parseInt(acInput.value, 10);
        c.ac = isFinite(val) ? val : null;
        scheduleAutosave();
      };
      acInput.addEventListener('change', commitAc);

      const hpLabel = document.createElement('span');
      hpLabel.textContent = 'HP';
      const hpReadout = document.createElement('span');
      hpReadout.className = 'hp-readout';
      const currentHp = computeHp(c);
      hpReadout.textContent = (currentHp === null) ? '—' : currentHp;

      const logCount = (c.hpLog || []).length;
      const expandBtn = document.createElement('button');
      expandBtn.textContent = expandedHpLogIds.has(c.id) ? '▴' : ('▾' + (logCount ? ' ' + logCount : ''));
      expandBtn.title = 'Show/hide the HP log for this combatant';
      expandBtn.addEventListener('click', () => {
        if (expandedHpLogIds.has(c.id)) expandedHpLogIds.delete(c.id); else expandedHpLogIds.add(c.id);
        renderInitiative();
      });

      const hpInput = document.createElement('input');
      hpInput.type = 'text';
      hpInput.placeholder = '+/- or set';
      const commitHp = () => {
        const entry = parseHpEntry(hpInput.value);
        if (entry) {
          c.hpLog = c.hpLog || [];
          c.hpLog.push(entry);
          hpInput.value = '';
          expandedHpLogIds.add(c.id); // reveal the log automatically right after logging a new entry
          renderInitiative();
          updateDisplayExtras();
          scheduleAutosave();
        }
      };
      hpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commitHp(); hpInput.blur(); }
      });
      hpInput.addEventListener('blur', commitHp);

      stats.appendChild(acLabel);
      stats.appendChild(acInput);
      stats.appendChild(hpLabel);
      stats.appendChild(hpReadout);
      stats.appendChild(expandBtn);
      stats.appendChild(hpInput);

      row.appendChild(top);
      row.appendChild(stats);

      if (expandedHpLogIds.has(c.id) && logCount) {
        const logRow = document.createElement('div');
        logRow.className = 'hp-log-row';
        c.hpLog.forEach((entry) => {
          const pill = document.createElement('span');
          pill.className = 'hp-log-pill';
          const text = document.createElement('span');
          text.textContent = entry.raw;
          const del = document.createElement('button');
          del.textContent = '×';
          del.title = 'Remove this entry';
          del.addEventListener('click', () => {
            c.hpLog = c.hpLog.filter(e => e.id !== entry.id);
            renderInitiative();
            updateDisplayExtras();
            scheduleAutosave();
          });
          pill.appendChild(text);
          pill.appendChild(del);
          logRow.appendChild(pill);
        });
        row.appendChild(logRow);
      }

      combatantList.appendChild(row);
    });
  }

  addCombatantBtn.addEventListener('click', () => {
    const name = combatantNameEl.value.trim();
    const score = parseInt(combatantScoreEl.value, 10);
    if (!name || !isFinite(score)) return;
    initiative.combatants.push({ id: nextCombatantId++, name, score, ac: null, hpLog: [] });
    combatantNameEl.value = '';
    combatantScoreEl.value = '';
    renderInitiative();
    updateDisplayExtras();
    scheduleAutosave();
  });

  nextTurnBtn.addEventListener('click', () => {
    const sorted = sortedCombatants();
    if (sorted.length === 0) return;
    const idx = sorted.findIndex(c => c.id === effectiveCurrentId());
    let nextIdx = idx + 1;
    if (nextIdx >= sorted.length) { nextIdx = 0; initiative.round++; }
    initiative.currentCombatantId = sorted[nextIdx].id;
    renderInitiative();
    updateDisplayExtras();
    scheduleAutosave();
  });

  resetInitiativeBtn.addEventListener('click', () => {
    if (initiative.combatants.length > 0 && !confirm('Clear all combatants and start a new encounter?')) return;
    initiative = { combatants: [], currentCombatantId: null, round: 1, showOnDisplay: initiative.showOnDisplay };
    renderInitiative();
    updateDisplayExtras();
    scheduleAutosave();
  });

  initiativeShowOnDisplay.addEventListener('change', () => {
    initiative.showOnDisplay = initiativeShowOnDisplay.checked;
    updateDisplayExtras();
    scheduleAutosave();
  });

  // ---------- Pushing dice/initiative state to the display window (HTML overlays, not canvas) ----------
  function updateDisplayExtras() {
    const displayWindow = displayWindowManager?.getWindow();
    if (!displayWindow || displayWindow.closed) return;
    try {
      const banner = displayWindow.document.getElementById('rollBanner');
      if (banner) {
        const entry = diceRevealedId !== null ? diceHistory.find(d => d.id === diceRevealedId) : null;
        if (entry) {
          banner.textContent = entry.label + ' = ' + entry.finalTotal;
          banner.style.display = 'block';
        } else if (dicePoolRevealed && dicePool.length > 0) {
          const total = dicePool.reduce((sum, e) => sum + e.value, 0);
          banner.textContent = dicePool.map(e => 'd' + e.sides + ':' + e.value).join(', ') + ' = ' + total;
          banner.style.display = 'block';
        } else {
          banner.style.display = 'none';
        }
      }
      const panel = displayWindow.document.getElementById('initiativePanel');
      if (panel) {
        if (initiative.showOnDisplay && initiative.combatants.length > 0) {
          const sorted = sortedCombatants();
          const currentId = effectiveCurrentId();
          let html = '<div class="init-round">Round ' + initiative.round + '</div>';
          sorted.forEach((c) => {
            const isCurrent = c.id === currentId;
            html += '<div class="init-row' + (isCurrent ? ' init-current' : '') + '">' +
              '<span>' + (isCurrent ? '▶ ' : '') + escapeHtml(c.name) + '</span><span>' + c.score + '</span></div>';
          });
          panel.innerHTML = html;
          panel.style.display = 'block';
        } else {
          panel.style.display = 'none';
        }
      }
    } catch (err) { /* display window not ready */ }
  }
  window.__updateDisplayExtras = updateDisplayExtras;

  gridEnabledEl.addEventListener('change', () => {
    const s = cs(); if (!s) { gridEnabledEl.checked = false; return; }
    s.grid.enabled = gridEnabledEl.checked;
    pushGridUndo(s);
    updateCalibrationUI();
    redraw();
  });
  gridColorEl.addEventListener('input', () => { gridColor = gridColorEl.value; redraw(); });
  gridSizeEl.addEventListener('input', () => {
    const s = cs(); if (!s) return;
    s.grid.size = parseInt(gridSizeEl.value, 10);
    gridSizeLabel.textContent = s.grid.size + 'px';
    if (s.grid.enabled) updateCalibrationUI();
    redraw();
  });
  gridSizeEl.addEventListener('change', () => { const s = cs(); if (s) pushGridUndo(s); });
  gridSizeLabel.textContent = gridSizeEl.value + 'px';
  gridOffsetXEl.addEventListener('input', () => {
    const s = cs(); if (!s) return;
    s.grid.offsetX = parseInt(gridOffsetXEl.value, 10);
    gridOffsetXLabel.textContent = s.grid.offsetX + 'px';
    redraw();
  });
  gridOffsetXEl.addEventListener('change', () => { const s = cs(); if (s) pushGridUndo(s); });
  gridOffsetYEl.addEventListener('input', () => {
    const s = cs(); if (!s) return;
    s.grid.offsetY = parseInt(gridOffsetYEl.value, 10);
    gridOffsetYLabel.textContent = s.grid.offsetY + 'px';
    redraw();
  });
  gridOffsetYEl.addEventListener('change', () => { const s = cs(); if (s) pushGridUndo(s); });
  gridOffsetXLabel.textContent = gridOffsetXEl.value + 'px';
  gridOffsetYLabel.textContent = gridOffsetYEl.value + 'px';
  gridOpacityEl.addEventListener('input', () => {
    const s = cs(); if (!s) return;
    s.grid.opacity = parseInt(gridOpacityEl.value, 10) / 100;
    gridOpacityLabel.textContent = gridOpacityEl.value + '%';
    redraw();
  });
  gridOpacityEl.addEventListener('change', () => { const s = cs(); if (s) pushGridUndo(s); });
  gridOpacityLabel.textContent = gridOpacityEl.value + '%';

  // ---------- Autosave (IndexedDB, silent, crash recovery only — not the exportable file) ----------
  const autosaveStore = createAutosaveStore();
  const scheduleAutosave = createAutosaveScheduler({
    store: autosaveStore,
    serialize: serializeSession,
    hasData: () => slides.length > 0,
  });

  resumeBtn.addEventListener('click', async () => {
    if (slides.length > 0 && !confirm('Resuming replaces all maps currently loaded, including their fog and markers. Continue?')) {
      return;
    }
    try {
      const rec = await autosaveStore.read();
      if (rec && rec.data) await restoreSession(rec.data);
    } catch (err) {
      alert('Could not restore the autosaved session.');
    }
    resumeBanner.style.display = 'none';
  });
  discardBtn.addEventListener('click', () => {
    autosaveStore.remove().catch(() => {});
    resumeBanner.style.display = 'none';
  });

  (async function checkForAutosave() {
    try {
      const rec = await autosaveStore.read();
      if (rec && rec.data && Array.isArray(rec.data.slides) && rec.data.slides.length) {
        const when = new Date(rec.savedAt).toLocaleString();
        const count = rec.data.slides.length;
        resumeText.textContent = 'Found an autosaved session from ' + when + ' (' + count + ' map' + (count === 1 ? '' : 's') + ').';
        resumeBanner.style.display = 'flex';
      }
    } catch (err) { /* IndexedDB unavailable — autosave silently disabled, rest of the app is unaffected */ }
  })();

  // ---------- Compositing ----------
  // TV-facing composite: map + fog only, cropped to camera viewport, fog always fully opaque.
  function drawCompositeToCtx(targetCtx, targetW, targetH) {
    targetCtx.save();
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, 0, targetW, targetH);

    const s = cs();
    if (!s) { targetCtx.restore(); return; }

    const cam = s.camera;
    const scale = Math.min(targetW / cam.w, targetH / cam.h);
    const dw = cam.w * scale, dh = cam.h * scale;
    const dx = (targetW - dw) / 2, dy = (targetH - dh) / 2;

    targetCtx.globalAlpha = 1;
    targetCtx.drawImage(s.mapCanvas, cam.x, cam.y, cam.w, cam.h, dx, dy, dw, dh);
    targetCtx.drawImage(s.fogCanvas, cam.x, cam.y, cam.w, cam.h, dx, dy, dw, dh);
    drawDisplayGrid(targetCtx, s, cam, dx, dy, dw, dh, scale, gridColor);
    drawDisplayAoe(targetCtx, s, cam, dx, dy, scale, pxPerFoot(s));
    const calibTransform = (px, py) => [dx + (px - cam.x) * scale, dy + (py - cam.y) * scale];
    drawCalibLineOnCtx(targetCtx, calibTransform, scale);
    drawCalibSquareOnCtx(targetCtx, s, calibTransform, scale);
    drawDisplayMarkers(targetCtx, s.markers, cam, dx, dy, dw, dh, scale);
    targetCtx.restore();
  }

  function drawCameraOverlay(s) {
    const displayScale = s.mapCanvas.width / workCanvas.width;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 10, 0.52)';
    ctx.beginPath();
    ctx.rect(0, 0, s.mapCanvas.width, s.mapCanvas.height);
    ctx.rect(s.camera.x, s.camera.y, s.camera.w, s.camera.h);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#7c9cff';
    ctx.lineWidth = 3 * displayScale;
    ctx.setLineDash([8 * displayScale, 6 * displayScale]);
    ctx.strokeRect(s.camera.x, s.camera.y, s.camera.w, s.camera.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#7c9cff';
    const hs = 10 * displayScale;
    const corners = [
      [s.camera.x, s.camera.y], [s.camera.x + s.camera.w, s.camera.y],
      [s.camera.x, s.camera.y + s.camera.h], [s.camera.x + s.camera.w, s.camera.y + s.camera.h]
    ];
    corners.forEach(([cx, cy]) => ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs));
    const label = 'DISPLAY VIEW';
    const fontSize = 11 * displayScale;
    ctx.font = `700 ${fontSize}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'top';
    const labelWidth = ctx.measureText(label).width;
    const labelX = s.camera.x + 8 * displayScale;
    const labelY = s.camera.y + 8 * displayScale;
    ctx.fillStyle = 'rgba(10,11,14,0.88)';
    ctx.fillRect(labelX - 4 * displayScale, labelY - 3 * displayScale, labelWidth + 8 * displayScale, fontSize + 6 * displayScale);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, labelX, labelY);
    ctx.restore();
  }

  function syncCameraControls(s) {
    const zoomPercent = Math.round(s.mapCanvas.width / s.camera.w * 100);
    cameraZoomEl.value = Math.max(100, Math.min(2000, zoomPercent));
    cameraZoomLabel.textContent = zoomPercent + '%';
  }

  // Runs on every redraw (i.e. after every state-changing action in the app) rather than being
  // hooked into each individual place the camera can change — zoom buttons, wheel/pinch, corner
  // drag, fit-whole-map, and even undoing a camera action all already funnel through redraw(),
  // so this stays correct without needing to be threaded through every one of them individually.
  function reapplyZoomLockCalibration(s) {
    if (!s || s.grid.enabled || !s.aoeZoomLock || !s.aoeZoomLockRefCamW) return;
    if (calibratingLine || calibShowingSquare) return; // suppressed while a fresh calibration is in progress
    const newCal = s.aoeZoomLockRefCalibration * (s.camera.w / s.aoeZoomLockRefCamW);
    s.aoeCalibration = Math.max(10, Math.min(2000, newCal));
    if (appMode === 'aoe' && aoeCalibrationEl) {
      aoeCalibrationEl.value = Math.round(s.aoeCalibration);
    }
  }

  function redraw() {
    const s = cs();
    if (!s) return;
    reapplyZoomLockCalibration(s);
    syncCameraControls(s);
    const scaleX = workCanvas.width / s.mapCanvas.width;
    const scaleY = workCanvas.height / s.mapCanvas.height;
    ctx.clearRect(0, 0, workCanvas.width, workCanvas.height);
    ctx.drawImage(s.mapCanvas, 0, 0, workCanvas.width, workCanvas.height);
    ctx.save();
    ctx.globalAlpha = fogViewOpacity;
    ctx.drawImage(s.fogCanvas, 0, 0, workCanvas.width, workCanvas.height);
    ctx.restore();
    ctx.save();
    ctx.scale(scaleX, scaleY);
    drawDungeon(ctx, s.dungeonSegments, dungeonActiveSegmentId, s.mapCanvas.width, s.mapCanvas.height);
    drawControlGrid(ctx, s, gridColor);
    drawControlAoe(ctx, s, selectedAoeId, pxPerFoot(s));
    const identityTransform = (px, py) => [px, py];
    drawCalibLineOnCtx(ctx, identityTransform, 1);
    drawCalibSquareOnCtx(ctx, s, identityTransform, 1);
    drawCanvasMarkers(ctx, s.markers, selectedMarkerId);
    if (appMode === 'camera') drawCameraOverlay(s);
    ctx.restore();

    const displayWindow = displayWindowManager?.getWindow();
    if (displayWindow && !displayWindow.closed) {
      try {
        const dc = displayWindow.document.getElementById('displayCanvas');
        if (dc) drawCompositeToCtx(dc.getContext('2d'), dc.width, dc.height);
      } catch (err) { /* display window not ready */ }
    }
    scheduleAutosave();
  }
  let pendingRedrawFrame = null;
  function scheduleRedrawFrame() {
    if (pendingRedrawFrame !== null) return;
    pendingRedrawFrame = requestAnimationFrame(() => {
      pendingRedrawFrame = null;
      redraw();
    });
  }
  window.__fogRedraw = redraw;

  function canvasCoords(e) {
    const rect = workCanvas.getBoundingClientRect();
    const s = cs();
    const scaleX = s.mapCanvas.width / rect.width;
    const scaleY = s.mapCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function findMarkerNear(s, x, y) {
    const rect = workCanvas.getBoundingClientRect();
    const scale = s.mapCanvas.width / rect.width;
    for (let index = s.markers.length - 1; index >= 0; index--) {
      const marker = s.markers[index];
      const threshold = (marker.size || 12) + 6 * scale;
      if (Math.hypot(marker.x - x, marker.y - y) < threshold) return marker;
    }
    return null;
  }

  // ---------- Canvas interaction ----------
  workCanvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const s = cs();
    if (!s) return;
    const p = canvasCoords(e);

    if (appMode === 'brush') {
      drawing = true;
      lastX = p.x; lastY = p.y;
      activeFogAction = {
        type: 'stroke',
        points: [{ x: p.x, y: p.y }],
        brushSize: parseInt(brushSize.value, 10),
        revealing: fogDir === 'reveal',
        softEdge: softEdge.checked,
      };
      applyFogAction(s.fogCtx, activeFogAction, s.fogCanvas.width, s.fogCanvas.height);
      s.fogDirty = true;
      redraw();
      return;
    }

    if (appMode === 'dungeon') {
      const hit = hitTestDungeon(s.dungeonSegments, p.x, p.y);
      if (dungeonTool === 'select') {
        dungeonActiveSegmentId = hit ? hit.id : null;
        dungeonNotesPanel.style.display = hit ? 'block' : 'none';
        if (hit) {
          syncDungeonInspector(hit);
          showDungeonTooltip(hit, e.clientX, e.clientY);
        } else {
          hideDungeonTooltip();
        }
        renderDungeonSegments();
        redraw();
        return;
      }
      let seg = null;
      if (hit) {
        dungeonActiveSegmentId = hit.id;
        seg = hit;
        syncDungeonInspector(seg);
        showDungeonTooltip(hit, e.clientX, e.clientY);
      } else if (dungeonActiveSegmentId !== null) {
        seg = s.dungeonSegments.find(sg => sg.id === dungeonActiveSegmentId) || null;
      }
      if (!seg) {
        const number = nextDungeonNumber(s.dungeonSegments);
        seg = { id: nextDungeonId++, number, name: 'Segment ' + number, color: dungeonColor, notes: '', strokes: [] };
        s.dungeonSegments.push(seg);
        dungeonActiveSegmentId = seg.id;
        syncDungeonInspector(seg);
      }
      const brushSizePx = parseInt(dungeonBrushSizeEl.value, 10);
      seg.strokes.push({ points: [{ x: p.x, y: p.y }], brushSize: brushSizePx });
      dungeonPainting = true;
      renderDungeonSegments();
      redraw();
      return;
    }

    if (appMode === 'markers') {
      const existing = findMarkerNear(s, p.x, p.y);
      if (existing) {
        selectedMarkerId = existing.id;
        syncMarkerInspector(existing);
        draggingMarker = existing;
        dragGrabOffset = { dx: p.x - existing.x, dy: p.y - existing.y };
        redraw();
      } else if (selectedMarkerId !== null) {
        selectedMarkerId = null; // click away deselects rather than dropping a new marker
        syncMarkerInspector(null);
        redraw();
      } else {
        const val = prompt('Label for this marker (e.g. "poison dart trap"):', '');
        if (val === null) return;
        const marker = { id: nextMarkerId++, x: p.x, y: p.y, color: markerColor, shape: markerShape, label: val.trim(), visible: markerVisibleDefault, size: markerSizeDefault };
        s.markers.push(marker);
        selectedMarkerId = marker.id;
        syncMarkerInspector(marker);
        pushMarkersUndo(s);
        redraw();
      }
      return;
    }

    if (appMode === 'camera') {
      const scale = s.mapCanvas.width / workCanvas.getBoundingClientRect().width;
      cameraDrag = hitTestCamera(s.camera, p.x, p.y, scale, HANDLE_SIZE);
      if (!cameraDrag) {
        s.camera.x = clamp(p.x - s.camera.w / 2, 0, s.mapCanvas.width - s.camera.w);
        s.camera.y = clamp(p.y - s.camera.h / 2, 0, s.mapCanvas.height - s.camera.h);
        pushCameraUndo(s);
        redraw();
      } else {
        lastX = p.x; lastY = p.y;
      }
      return;
    }

    if (calibratingLine) {
      calibLineStart = { x: p.x, y: p.y };
      calibLineCurrent = { x: p.x, y: p.y };
      draggingCalibLine = true;
      redraw();
      return;
    }

    if (appMode === 'aoe') {
      if (selectedAoeId !== null) {
        const sel = s.aoeShapes.find(a => a.id === selectedAoeId);
        if (sel && (sel.type === 'square' || sel.type === 'cone')) {
          const handle = rotationHandlePoint(sel, pxPerFoot(s));
          const rect = workCanvas.getBoundingClientRect();
          const scale = s.mapCanvas.width / rect.width;
          if (Math.hypot(p.x - handle.x, p.y - handle.y) < 16 * scale) {
            rotatingAoe = sel;
            redraw();
            return;
          }
        }
      }
      const existing = hitTestAoe(s, p.x, p.y);
      if (existing) {
        selectedAoeId = existing.id;
        draggingAoe = existing;
        dragGrabOffsetAoe = { dx: p.x - existing.x, dy: p.y - existing.y };
        syncAoeInspector(existing);
        redraw();
      } else if (selectedAoeId !== null) {
        selectedAoeId = null;
        redraw();
      } else {
        const shape = { id: nextAoeId++, type: aoeShapeType, x: p.x, y: p.y, ft: aoeFt, rotation: aoeRotationDeg * Math.PI / 180, color: aoeColor, visible: true };
        s.aoeShapes.push(shape);
        selectedAoeId = shape.id;
        pushAoeUndo(s);
        redraw();
      }
      return;
    }
  });

  workCanvas.addEventListener('contextmenu', (e) => {
    const s = cs();
    if (!s || (appMode !== 'markers' && appMode !== 'aoe')) return;
    e.preventDefault();
    const p = canvasCoords(e);
    if (appMode === 'markers') {
      const existing = findMarkerNear(s, p.x, p.y);
      if (existing) {
        s.markers = s.markers.filter(m => m !== existing);
        if (selectedMarkerId === existing.id) { selectedMarkerId = null; syncMarkerInspector(null); }
        pushMarkersUndo(s);
        redraw();
      }
    } else if (appMode === 'aoe') {
      const scale = s.mapCanvas.width / workCanvas.getBoundingClientRect().width;
      const existing = hitTestAoe(s, p.x, p.y)
        || [...s.aoeShapes].reverse().find(shape => Math.hypot(shape.x - p.x, shape.y - p.y) <= 12 * scale);
      if (existing) {
        s.aoeShapes = s.aoeShapes.filter(a => a !== existing);
        if (selectedAoeId === existing.id) selectedAoeId = null;
        pushAoeUndo(s);
        redraw();
      }
    }
  });

  workCanvas.addEventListener('dblclick', (e) => {
    const s = cs();
    if (appMode !== 'markers' || !s) return;
    const p = canvasCoords(e);
    const existing = findMarkerNear(s, p.x, p.y);
    if (!existing) return;
    selectedMarkerId = existing.id;
    syncMarkerInspector(existing);
    redraw();
    markerNameEl.focus();
    markerNameEl.select();
  });

  workCanvas.addEventListener('dblclick', (e) => {
    const s = cs();
    if (appMode !== 'aoe' || !s) return;
    const p = canvasCoords(e);
    const existing = hitTestAoe(s, p.x, p.y);
    if (!existing) return;
    existing.visible = existing.visible === false ? true : false;
    if (selectedAoeId === existing.id) aoeVisibleToggle.checked = existing.visible !== false;
    pushAoeUndo(s);
    redraw();
  });

  window.addEventListener('pointermove', (e) => {
    const s = cs();
    if (!s) return;

    if (appMode === 'brush' && drawing) {
      const p = canvasCoords(e);
      paintFogStroke(s.fogCtx, lastX, lastY, p.x, p.y, activeFogAction.brushSize, activeFogAction.revealing, activeFogAction.softEdge);
      activeFogAction.points.push({ x: p.x, y: p.y });
      s.fogDirty = true;
      lastX = p.x; lastY = p.y;
      scheduleRedrawFrame();
      return;
    }

    if (appMode === 'dungeon' && dungeonPainting) {
      const p = canvasCoords(e);
      const seg = s.dungeonSegments.find(sg => sg.id === dungeonActiveSegmentId);
      if (seg && seg.strokes.length) {
        seg.strokes[seg.strokes.length - 1].points.push({ x: p.x, y: p.y });
        scheduleRedrawFrame();
      }
      return;
    }

    if (appMode === 'markers' && draggingMarker) {
      const p = canvasCoords(e);
      draggingMarker.x = p.x - dragGrabOffset.dx;
      draggingMarker.y = p.y - dragGrabOffset.dy;
      workCanvas.style.cursor = 'grabbing';
      scheduleRedrawFrame();
      return;
    }

    if (appMode === 'markers' && !draggingMarker) {
      const p = canvasCoords(e);
      workCanvas.style.cursor = findMarkerNear(s, p.x, p.y) ? 'grab' : 'crosshair';
    }

    if (appMode === 'dungeon' && !dungeonPainting) {
      const p = canvasCoords(e);
      const hit = hitTestDungeon(s.dungeonSegments, p.x, p.y);
      workCanvas.style.cursor = dungeonTool === 'select' ? (hit ? 'pointer' : 'default') : 'crosshair';
    }

    if (appMode === 'camera' && cameraDrag) {
      const p = canvasCoords(e);
      applyCameraDrag(s.camera, s.mapCanvas.width, s.mapCanvas.height, cameraDrag, p.x - lastX, p.y - lastY);
      lastX = p.x; lastY = p.y;
      workCanvas.style.cursor = cameraCursorFor(cameraDrag);
      scheduleRedrawFrame();
      return;
    }

    if (appMode === 'camera' && !cameraDrag) {
      const p = canvasCoords(e);
      const scale = s.mapCanvas.width / workCanvas.getBoundingClientRect().width;
      workCanvas.style.cursor = cameraCursorFor(hitTestCamera(s.camera, p.x, p.y, scale, HANDLE_SIZE));
    }

    if (appMode === 'aoe' && draggingAoe) {
      const p = canvasCoords(e);
      draggingAoe.x = p.x - dragGrabOffsetAoe.dx;
      draggingAoe.y = p.y - dragGrabOffsetAoe.dy;
      workCanvas.style.cursor = 'grabbing';
      scheduleRedrawFrame();
      return;
    }

    if (draggingCalibLine) {
      const p = canvasCoords(e);
      calibLineCurrent = { x: p.x, y: p.y };
      const lengthMapPx = Math.hypot(calibLineCurrent.x - calibLineStart.x, calibLineCurrent.y - calibLineStart.y);
      if (lengthMapPx > 2) {
        s.aoeCalibration = Math.max(10, Math.min(2000, (lengthMapPx / calibRefFt) * 5));
        aoeCalibrationEl.value = Math.round(s.aoeCalibration);
      }
      scheduleRedrawFrame();
      return;
    }

    if (appMode === 'aoe' && rotatingAoe) {
      const p = canvasCoords(e);
      const angle = Math.atan2(p.y - rotatingAoe.y, p.x - rotatingAoe.x);
      rotatingAoe.rotation = angle;
      const deg = ((Math.round(angle * 180 / Math.PI) % 360) + 360) % 360;
      aoeRotationDeg = deg;
      aoeRotationEl.value = deg;
      aoeRotationLabel.textContent = deg + '°';
      workCanvas.style.cursor = 'grabbing';
      scheduleRedrawFrame();
      return;
    }

    if (appMode === 'aoe' && !draggingAoe && selectedAoeId !== null) {
      const sel = s.aoeShapes.find(a => a.id === selectedAoeId);
      if (sel && (sel.type === 'square' || sel.type === 'cone')) {
        const p = canvasCoords(e);
        const handle = rotationHandlePoint(sel, pxPerFoot(s));
        const rect = workCanvas.getBoundingClientRect();
        const scale = s.mapCanvas.width / rect.width;
        const overHandle = Math.hypot(p.x - handle.x, p.y - handle.y) < 16 * scale;
        workCanvas.style.cursor = overHandle || hitTestAoe(s, p.x, p.y) ? 'grab' : 'crosshair';
      } else {
        const p = canvasCoords(e);
        workCanvas.style.cursor = hitTestAoe(s, p.x, p.y) ? 'grab' : 'crosshair';
      }
    } else if (appMode === 'aoe' && !draggingAoe && !rotatingAoe) {
      const p = canvasCoords(e);
      workCanvas.style.cursor = hitTestAoe(s, p.x, p.y) ? 'grab' : 'crosshair';
    }
  });

  function finishDungeonPainting() {
    if (!dungeonPainting) return;
    dungeonPainting = false;
    const s = cs();
    if (s) {
      pushDungeonUndo(s);
      scheduleAutosave();
    }
  }

  workCanvas.addEventListener('pointerleave', finishDungeonPainting);

  function finishPointerInteraction() {
    const s = cs();
    if (drawing && s) {
      drawing = false;
      pushFogAction(s, activeFogAction);
      activeFogAction = null;
    }
    finishDungeonPainting();
    if (draggingMarker && s) { draggingMarker = null; pushMarkersUndo(s); scheduleAutosave(); workCanvas.style.cursor = 'grab'; }
    else if (draggingMarker) { draggingMarker = null; }
    if (cameraDrag && s) { pushCameraUndo(s); }
    cameraDrag = null;
    if (draggingAoe && s) { draggingAoe = null; pushAoeUndo(s); }
    else if (draggingAoe) { draggingAoe = null; }
    if (rotatingAoe && s) { rotatingAoe = null; pushAoeUndo(s); workCanvas.style.cursor = 'grab'; }
    else if (rotatingAoe) { rotatingAoe = null; workCanvas.style.cursor = 'crosshair'; }
    if (draggingCalibLine) {
      draggingCalibLine = false;
      calibratingLine = false;
      calibLineStart = null;
      calibLineCurrent = null;
      calibDrawLineBtn.textContent = 'Draw a line to calibrate…';
      calibDrawLineBtn.classList.remove('primary');
      if (s) {
        if (s.aoeZoomLock) reanchorZoomLockReference(s);
        pushAoeUndo(s);
      }
      redraw();
    }
  }
  window.addEventListener('pointerup', finishPointerInteraction);
  window.addEventListener('pointercancel', finishPointerInteraction);

  let cameraWheelUndoTimer = null;
  workCanvas.addEventListener('wheel', (e) => {
    const s = cs();
    if (appMode !== 'camera' || !s) return;
    e.preventDefault();
    const p = canvasCoords(e);
    zoomCameraAt(s.camera, s.mapCanvas.width, s.mapCanvas.height, p.x, p.y, Math.exp(e.deltaY * 0.01));
    redraw();
    // Debounced so a smooth pinch/scroll gesture becomes one undo step, not dozens.
    clearTimeout(cameraWheelUndoTimer);
    cameraWheelUndoTimer = setTimeout(() => pushCameraUndo(s), 500);
  }, { passive: false });

  zoomInBtn.addEventListener('click', () => {
    const s = cs(); if (!s) return;
    zoomCameraAt(s.camera, s.mapCanvas.width, s.mapCanvas.height, s.camera.x + s.camera.w / 2, s.camera.y + s.camera.h / 2, 0.8);
    pushCameraUndo(s);
    redraw();
  });
  zoomOutBtn.addEventListener('click', () => {
    const s = cs(); if (!s) return;
    zoomCameraAt(s.camera, s.mapCanvas.width, s.mapCanvas.height, s.camera.x + s.camera.w / 2, s.camera.y + s.camera.h / 2, 1.25);
    pushCameraUndo(s);
    redraw();
  });
  fitFullBtn.addEventListener('click', () => {
    const s = cs(); if (!s) return;
    s.camera = { x: 0, y: 0, w: s.mapCanvas.width, h: s.mapCanvas.height };
    pushCameraUndo(s);
    redraw();
  });
  centerCameraBtn.addEventListener('click', () => {
    const s = cs(); if (!s) return;
    s.camera.x = (s.mapCanvas.width - s.camera.w) / 2;
    s.camera.y = (s.mapCanvas.height - s.camera.h) / 2;
    pushCameraUndo(s);
    redraw();
  });
  cameraZoomEl.addEventListener('input', () => {
    const s = cs(); if (!s) return;
    const zoomPercent = parseInt(cameraZoomEl.value, 10);
    const targetWidth = s.mapCanvas.width * 100 / zoomPercent;
    const factor = targetWidth / s.camera.w;
    zoomCameraAt(s.camera, s.mapCanvas.width, s.mapCanvas.height, s.camera.x + s.camera.w / 2, s.camera.y + s.camera.h / 2, factor);
    cameraZoomLabel.textContent = zoomPercent + '%';
    redraw();
  });
  cameraZoomEl.addEventListener('change', () => {
    const s = cs(); if (s) pushCameraUndo(s);
  });

  // ---------- Mode switching ----------
  function setAppMode(newMode) {
    appMode = newMode;
    if (newMode !== 'markers') { selectedMarkerId = null; draggingMarker = null; syncMarkerInspector(null); }
    if (newMode !== 'aoe') { selectedAoeId = null; draggingAoe = null; rotatingAoe = null; workCanvas.style.cursor = ''; }
    if (newMode !== 'camera') { workCanvas.style.cursor = ''; }
    if (newMode !== 'dungeon') {
      dungeonPainting = false;
      dungeonActiveSegmentId = null;
      dungeonNotesPanel.style.display = 'none';
      hideDungeonTooltip();
    }
    [mapsModeBtn, brushModeBtn, markerModeBtn, cameraModeBtn, gridModeBtn, dungeonModeBtn, calibrateModeBtn, aoeModeBtn, diceModeBtn, initModeBtn].forEach(b => b.classList.remove('active'));
    mapsControls.style.display = 'none';
    fogControls.style.display = 'none';
    markerControls.style.display = 'none';
    cameraControls.style.display = 'none';
    gridControls.style.display = 'none';
    dungeonControls.style.display = 'none';
    calibrateControls.style.display = 'none';
    aoeControls.style.display = 'none';
    diceControls.style.display = 'none';
    initiativeControls.style.display = 'none';
    if (newMode === 'maps') { mapsModeBtn.classList.add('active'); mapsControls.style.display = 'flex'; }
    if (newMode === 'brush') { brushModeBtn.classList.add('active'); fogControls.style.display = 'flex'; }
    if (newMode === 'markers') { markerModeBtn.classList.add('active'); markerControls.style.display = 'flex'; workCanvas.style.cursor = 'crosshair'; }
    if (newMode === 'camera') { cameraModeBtn.classList.add('active'); cameraControls.style.display = 'flex'; }
    if (newMode === 'grid') { gridModeBtn.classList.add('active'); gridControls.style.display = 'flex'; }
    if (newMode === 'dungeon') {
      dungeonModeBtn.classList.add('active');
      dungeonControls.style.display = 'flex';
      workCanvas.style.cursor = dungeonTool === 'select' ? 'default' : 'crosshair';
      renderDungeonSegments();
    }
    if (newMode === 'calibrate') { calibrateModeBtn.classList.add('active'); calibrateControls.style.display = 'flex'; updateCalibrationUI(); }
    if (newMode === 'aoe') { aoeModeBtn.classList.add('active'); aoeControls.style.display = 'flex'; workCanvas.style.cursor = 'crosshair'; updateCalibrationUI(); }
    if (newMode === 'dice') { diceModeBtn.classList.add('active'); diceControls.style.display = 'flex'; }
    if (newMode === 'init') { initModeBtn.classList.add('active'); initiativeControls.style.display = 'flex'; renderInitiative(); }
    const labels = { brush: 'Undo (Fog)', markers: 'Undo (Markers)', camera: 'Undo (Camera)', grid: 'Undo (Grid)', dungeon: 'Undo (Dungeon)', aoe: 'Undo (AoE)', calibrate: 'Undo (AoE)' };
    const undoApplies = newMode in labels;
    undoContextLabel.textContent = undoApplies ? labels[newMode] : 'Undo';
    undoBtn.disabled = !undoApplies;
    undoBtn.style.opacity = undoApplies ? '1' : '0.4';
    undoBtn.style.cursor = undoApplies ? 'pointer' : 'not-allowed';

    // Category tab sync: show only the relevant sub-row, mark its category button active,
    // and remember this as the tab to return to next time this category is selected.
    const cat = TAB_CATEGORY[newMode];
    [catMapBtn, catDisplayBtn, catToolsBtn].forEach(b => b.classList.remove('active'));
    subTabsMap.style.display = 'none';
    subTabsDisplay.style.display = 'none';
    subTabsTools.style.display = 'none';
    if (cat) {
      lastActiveInCategory[cat] = newMode;
      if (cat === 'map') { catMapBtn.classList.add('active'); subTabsMap.style.display = 'flex'; }
      if (cat === 'display') { catDisplayBtn.classList.add('active'); subTabsDisplay.style.display = 'flex'; }
      if (cat === 'tools') { catToolsBtn.classList.add('active'); subTabsTools.style.display = 'flex'; }
    }
    redraw();
  }
  catMapBtn.addEventListener('click', () => setAppMode(lastActiveInCategory.map));
  catDisplayBtn.addEventListener('click', () => setAppMode(lastActiveInCategory.display));
  catToolsBtn.addEventListener('click', () => setAppMode(lastActiveInCategory.tools));
  mapsModeBtn.addEventListener('click', () => setAppMode('maps'));
  brushModeBtn.addEventListener('click', () => setAppMode('brush'));
  markerModeBtn.addEventListener('click', () => setAppMode('markers'));
  cameraModeBtn.addEventListener('click', () => setAppMode('camera'));
  gridModeBtn.addEventListener('click', () => setAppMode('grid'));
  dungeonModeBtn.addEventListener('click', () => setAppMode('dungeon'));
  calibrateModeBtn.addEventListener('click', () => setAppMode('calibrate'));
  aoeModeBtn.addEventListener('click', () => setAppMode('aoe'));
  diceModeBtn.addEventListener('click', () => setAppMode('dice'));
  initModeBtn.addEventListener('click', () => setAppMode('init'));


  // ---------- Undo (per-slide, per-mode — each tab remembers its own history independently) ----------
  function pushFogAction(s, action) {
    if (!action) return;
    s.fogActions.push(action);
    if (s.fogActions.length > UNDO_LIMIT) {
      s.fogCommittedActions.push(s.fogActions.shift());
    }
    s.fogDirty = true;
    scheduleAutosave();
  }

  function replayFog(s) {
    s.fogCtx.clearRect(0, 0, s.fogCanvas.width, s.fogCanvas.height);
    s.fogCtx.globalCompositeOperation = 'source-over';
    if (s.fogBaseImage) s.fogCtx.drawImage(s.fogBaseImage, 0, 0);
    [...s.fogCommittedActions, ...s.fogActions].forEach((action) => {
      applyFogAction(s.fogCtx, action, s.fogCanvas.width, s.fogCanvas.height);
    });
    s.fogDirty = true;
  }
  function pushMarkersUndo(s) {
    pushBounded(s.markersUndoStack, cloneValue(s.markers), UNDO_LIMIT);
  }
  function pushCameraUndo(s) {
    pushBounded(s.cameraUndoStack, snapshotCamera(s.camera), UNDO_LIMIT);
  }
  function pushGridUndo(s) {
    pushBounded(s.gridUndoStack, snapshotGrid(s.grid), UNDO_LIMIT);
  }
  function pushAoeUndo(s) {
    pushBounded(s.aoeUndoStack, snapshotAoe(s), UNDO_LIMIT);
  }

  function undoFog(s) {
    if (s.fogActions.length === 0) return;
    s.fogActions.pop();
    replayFog(s);
    redraw();
  }
  function undoMarkers(s) {
    if (s.markersUndoStack.length <= 1) return;
    s.markersUndoStack.pop();
    const prev = s.markersUndoStack[s.markersUndoStack.length - 1];
    s.markers = cloneValue(prev);
    selectedMarkerId = null;
    draggingMarker = null;
    syncMarkerInspector(null);
    redraw();
  }
  function undoCamera(s) {
    if (s.cameraUndoStack.length <= 1) return;
    s.cameraUndoStack.pop();
    const prev = s.cameraUndoStack[s.cameraUndoStack.length - 1];
    s.camera = { x: prev.x, y: prev.y, w: prev.w, h: prev.h };
    redraw();
  }
  function undoGrid(s) {
    if (s.gridUndoStack.length <= 1) return;
    s.gridUndoStack.pop();
    const prev = s.gridUndoStack[s.gridUndoStack.length - 1];
    s.grid.enabled = prev.enabled;
    s.grid.size = prev.size;
    s.grid.offsetX = prev.offsetX;
    s.grid.offsetY = prev.offsetY;
    s.grid.opacity = prev.opacity;
    gridEnabledEl.checked = s.grid.enabled;
    gridSizeEl.value = s.grid.size; gridSizeLabel.textContent = s.grid.size + 'px';
    gridOffsetXEl.value = s.grid.offsetX; gridOffsetXLabel.textContent = s.grid.offsetX + 'px';
    gridOffsetYEl.value = s.grid.offsetY; gridOffsetYLabel.textContent = s.grid.offsetY + 'px';
    gridOpacityEl.value = Math.round(s.grid.opacity * 100); gridOpacityLabel.textContent = gridOpacityEl.value + '%';
    updateCalibrationUI(); // grid on/off affects whether AoE calibration is automatic or manual
    redraw();
  }
  function undoAoe(s) {
    if (s.aoeUndoStack.length <= 1) return;
    s.aoeUndoStack.pop();
    const prev = s.aoeUndoStack[s.aoeUndoStack.length - 1];
    s.aoeShapes = cloneValue(prev.shapes);
    s.aoeCalibration = prev.calibration;
    s.aoeZoomLock = !!prev.zoomLock;
    s.aoeZoomLockRefCalibration = prev.zoomLockRefCalibration;
    s.aoeZoomLockRefCamW = prev.zoomLockRefCamW;
    s.aoeZoomLockRefCamera = prev.zoomLockRefCamera ? { ...prev.zoomLockRefCamera } : null;
    selectedAoeId = null;
    draggingAoe = null;
    updateCalibrationUI();
    redraw();
  }

  function pushDungeonUndo(s) {
    pushBounded(s.dungeonUndoStack, cloneValue(s.dungeonSegments), UNDO_LIMIT);
  }
  function undoDungeon(s) {
    if (s.dungeonUndoStack.length <= 1) return;
    s.dungeonUndoStack.pop();
    const prev = s.dungeonUndoStack[s.dungeonUndoStack.length - 1];
    s.dungeonSegments = cloneValue(prev);
    dungeonActiveSegmentId = null;
    dungeonNotesPanel.style.display = 'none';
    renderDungeonSegments();
    redraw();
  }

  function performUndo() {
    const s = cs();
    if (!s) return;
    if (appMode === 'brush') undoFog(s);
    else if (appMode === 'markers') undoMarkers(s);
    else if (appMode === 'camera') undoCamera(s);
    else if (appMode === 'grid') undoGrid(s);
    else if (appMode === 'dungeon') undoDungeon(s);
    else if (appMode === 'aoe' || appMode === 'calibrate') undoAoe(s);
  }

  undoBtn.addEventListener('click', performUndo);
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement && document.activeElement.tagName;
    const isEditableField = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable);
    if (isEditableField) return; // let normal typing, editing, and native undo work in any form field
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); performUndo(); return; }
    if (e.key === 'Escape') {
      if (appMode === 'markers' && selectedMarkerId !== null) {
        selectedMarkerId = null;
        draggingMarker = null;
        syncMarkerInspector(null);
        redraw();
      }
      if (appMode === 'aoe' && selectedAoeId !== null) {
        selectedAoeId = null;
        draggingAoe = null;
        redraw();
      }
      if (appMode === 'dungeon' && dungeonActiveSegmentId !== null) {
        dungeonActiveSegmentId = null;
        dungeonNotesPanel.style.display = 'none';
        hideDungeonTooltip();
        renderDungeonSegments();
        redraw();
      }
      if (calibratingLine) {
        calibratingLine = false;
        draggingCalibLine = false;
        calibLineStart = null;
        calibLineCurrent = null;
        calibDrawLineBtn.textContent = 'Draw a line to calibrate…';
        calibDrawLineBtn.classList.remove('primary');
        redraw();
      }
      return;
    }
    if (appMode === 'markers' && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault(); // also guards against Backspace triggering browser back-navigation
      const s = cs();
      if (s && selectedMarkerId !== null) {
        s.markers = s.markers.filter(m => m.id !== selectedMarkerId);
        selectedMarkerId = null;
        syncMarkerInspector(null);
        pushMarkersUndo(s);
        redraw();
      }
    }
    if (appMode === 'aoe' && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      const s = cs();
      if (s && selectedAoeId !== null) {
        s.aoeShapes = s.aoeShapes.filter(a => a.id !== selectedAoeId);
        selectedAoeId = null;
        pushAoeUndo(s);
        redraw();
      }
    }
    if (appMode === 'dungeon' && (e.key === 'Delete' || e.key === 'Backspace') && dungeonActiveSegmentId !== null) {
      e.preventDefault();
      deleteDungeonSegment();
    }
  });

  deleteSelectedMarkerBtn.addEventListener('click', () => {
    const s = cs();
    if (!s || selectedMarkerId === null) return;
    s.markers = s.markers.filter(m => m.id !== selectedMarkerId);
    selectedMarkerId = null;
    syncMarkerInspector(null);
    pushMarkersUndo(s);
    redraw();
  });

  markerVisibleToggle.addEventListener('change', () => {
    const s = cs();
    const marker = s && selectedMarkerId !== null ? s.markers.find(item => item.id === selectedMarkerId) : null;
    if (marker) {
      marker.visible = markerVisibleToggle.checked;
      pushMarkersUndo(s);
      redraw();
    } else {
      markerVisibleDefault = markerVisibleToggle.checked;
    }
  });

  markerSizeEl.addEventListener('input', () => {
    const size = parseInt(markerSizeEl.value, 10);
    markerSizeLabel.textContent = size + 'px';
    const s = cs();
    const marker = s && selectedMarkerId !== null ? s.markers.find(item => item.id === selectedMarkerId) : null;
    if (marker) {
      marker.size = size;
      redraw();
    } else {
      markerSizeDefault = size;
      renderShapeSwatchPreviews();
    }
  });
  markerSizeEl.addEventListener('change', () => {
    const s = cs();
    if (s && selectedMarkerId !== null) pushMarkersUndo(s);
  });

  markerNameEl.addEventListener('input', () => {
    const s = cs();
    const marker = s && selectedMarkerId !== null ? s.markers.find(item => item.id === selectedMarkerId) : null;
    if (!marker) return;
    marker.label = markerNameEl.value;
    redraw();
  });
  markerNameEl.addEventListener('change', () => {
    const s = cs();
    if (s && selectedMarkerId !== null) pushMarkersUndo(s);
  });

  // ---------- AoE sidebar wiring ----------
  function setAoeShapeType(type) {
    aoeShapeType = type;
    [aoeCircleBtn, aoeSquareBtn, aoeConeBtn].forEach(b => b.classList.remove('active'));
    ({ circle: aoeCircleBtn, square: aoeSquareBtn, cone: aoeConeBtn })[type].classList.add('active');
    aoeFtLabel.textContent = type === 'circle' ? 'Radius (ft)' : type === 'square' ? 'Side length (ft)' : 'Length (ft)';
    const s = cs();
    const shape = (s && selectedAoeId !== null) ? s.aoeShapes.find(a => a.id === selectedAoeId) : null;
    if (shape) { shape.type = type; pushAoeUndo(s); redraw(); }
  }
  aoeCircleBtn.addEventListener('click', () => setAoeShapeType('circle'));
  aoeSquareBtn.addEventListener('click', () => setAoeShapeType('square'));
  aoeConeBtn.addEventListener('click', () => setAoeShapeType('cone'));

  aoeFtEl.addEventListener('input', () => {
    const val = parseFloat(aoeFtEl.value);
    if (!isFinite(val) || val <= 0) return;
    aoeFt = val;
    const s = cs();
    const shape = (s && selectedAoeId !== null) ? s.aoeShapes.find(a => a.id === selectedAoeId) : null;
    if (shape) { shape.ft = val; redraw(); }
  });
  aoeFtEl.addEventListener('change', () => {
    const s = cs();
    if (s && selectedAoeId !== null) pushAoeUndo(s);
  });

  aoeRotationEl.addEventListener('input', () => {
    const deg = parseInt(aoeRotationEl.value, 10);
    aoeRotationDeg = deg;
    aoeRotationLabel.textContent = deg + '°';
    const s = cs();
    const shape = (s && selectedAoeId !== null) ? s.aoeShapes.find(a => a.id === selectedAoeId) : null;
    if (shape) { shape.rotation = deg * Math.PI / 180; redraw(); }
  });
  aoeRotationEl.addEventListener('change', () => {
    const s = cs();
    if (s && selectedAoeId !== null) pushAoeUndo(s);
  });
  aoeRotationLabel.textContent = aoeRotationEl.value + '°';

  aoeCalibrationEl.addEventListener('input', () => {
    const s = cs(); if (!s) return;
    const val = parseFloat(aoeCalibrationEl.value);
    if (!isFinite(val) || val <= 0) return;
    s.aoeCalibration = val;
    redraw();
  });
  aoeCalibrationEl.addEventListener('change', () => {
    const s = cs(); if (!s) return;
    if (s.aoeZoomLock) reanchorZoomLockReference(s);
    pushAoeUndo(s);
  });

  function reanchorZoomLockReference(s) {
    s.aoeZoomLockRefCalibration = s.aoeCalibration;
    s.aoeZoomLockRefCamW = s.camera.w;
    s.aoeZoomLockRefCamera = { ...s.camera };
  }

  // ---------- Calibration tools: reference length, draw-a-line, reference square, zoom lock ----------
  [...calibRefLenButtons.children].forEach((b) => {
    b.addEventListener('click', () => {
      calibRefFt = parseInt(b.dataset.ft, 10);
      [...calibRefLenButtons.children].forEach(ch => ch.classList.remove('active'));
      b.classList.add('active');
      calibCustomFt.value = '';
      redraw();
    });
  });
  calibCustomFt.addEventListener('input', () => {
    const val = parseFloat(calibCustomFt.value);
    if (!isFinite(val) || val <= 0) return;
    calibRefFt = val;
    [...calibRefLenButtons.children].forEach(ch => ch.classList.remove('active'));
    redraw();
  });

  calibDrawLineBtn.addEventListener('click', () => {
    if (calibratingLine) {
      // cancel if already in progress
      calibratingLine = false;
      draggingCalibLine = false;
      calibLineStart = null;
      calibLineCurrent = null;
      calibDrawLineBtn.textContent = 'Draw a line to calibrate…';
      calibDrawLineBtn.classList.remove('primary');
      redraw();
      return;
    }
    const s = cs(); if (!s) return;
    calibratingLine = true;
    calibDrawLineBtn.textContent = 'Click and drag on the map… (click to cancel)';
    calibDrawLineBtn.classList.add('primary');
  });

  calibShowSquareBtn.addEventListener('click', () => {
    const s = cs(); if (!s) return;
    calibShowingSquare = !calibShowingSquare;
    calibShowSquareBtn.textContent = calibShowingSquare ? 'Hide reference square' : 'Show reference square';
    calibShowSquareBtn.classList.toggle('primary', calibShowingSquare);
    // Note: no re-anchoring here — the manual field's own 'change' handler already re-anchors
    // the zoom-lock reference on a genuine edit. Simply opening and closing this tool without
    // changing anything must not silently overwrite the existing reference.
    updateCalibrationUI();
    redraw();
  });

  aoeZoomLockToggle.addEventListener('change', () => {
    const s = cs(); if (!s) { aoeZoomLockToggle.checked = false; return; }
    s.aoeZoomLock = aoeZoomLockToggle.checked;
    if (s.aoeZoomLock) {
      reanchorZoomLockReference(s);
      calibSnapZoomBtn.style.display = 'block';
    } else {
      calibSnapZoomBtn.style.display = 'none';
    }
    pushAoeUndo(s);
    updateCalibrationUI();
    redraw();
  });

  calibSnapZoomBtn.addEventListener('click', () => {
    const s = cs();
    if (!s || !s.aoeZoomLockRefCamera) return;
    s.camera = { ...s.aoeZoomLockRefCamera };
    pushCameraUndo(s);
    redraw();
  });

  aoeVisibleToggle.addEventListener('change', () => {
    const s = cs();
    const shape = (s && selectedAoeId !== null) ? s.aoeShapes.find(a => a.id === selectedAoeId) : null;
    if (shape) { shape.visible = aoeVisibleToggle.checked; pushAoeUndo(s); redraw(); }
  });

  deleteSelectedAoeBtn.addEventListener('click', () => {
    const s = cs();
    if (!s || selectedAoeId === null) return;
    s.aoeShapes = s.aoeShapes.filter(a => a.id !== selectedAoeId);
    selectedAoeId = null;
    pushAoeUndo(s);
    redraw();
  });

  // ---------- Dungeon Mode sidebar wiring ----------
  dungeonBrushSizeEl.addEventListener('input', () => {
    dungeonBrushSizeLabel.textContent = dungeonBrushSizeEl.value + 'px';
  });
  dungeonBrushSizeLabel.textContent = dungeonBrushSizeEl.value + 'px';

  dungeonNewSegmentBtn.addEventListener('click', () => {
    dungeonTool = 'paint';
    dungeonPaintToolBtn.classList.add('active');
    dungeonSelectToolBtn.classList.remove('active');
    dungeonActiveSegmentId = null;
    dungeonNotesPanel.style.display = 'none';
    hideDungeonTooltip();
    renderDungeonSegments();
    redraw();
  });

  dungeonPaintToolBtn.addEventListener('click', () => {
    dungeonTool = 'paint';
    dungeonPaintToolBtn.classList.add('active');
    dungeonSelectToolBtn.classList.remove('active');
    workCanvas.style.cursor = 'crosshair';
  });

  dungeonSelectToolBtn.addEventListener('click', () => {
    dungeonTool = 'select';
    dungeonSelectToolBtn.classList.add('active');
    dungeonPaintToolBtn.classList.remove('active');
    workCanvas.style.cursor = 'default';
  });

  dungeonSegmentName.addEventListener('input', () => {
    const s = cs(); if (!s) return;
    const seg = s.dungeonSegments.find(sg => sg.id === dungeonActiveSegmentId);
    if (seg) { seg.name = dungeonSegmentName.value; renderDungeonSegments(); redraw(); }
  });
  dungeonSegmentName.addEventListener('change', () => {
    const s = cs(); if (s) pushDungeonUndo(s);
  });

  dungeonSegmentNotes.addEventListener('input', () => {
    const s = cs(); if (!s) return;
    const seg = s.dungeonSegments.find(sg => sg.id === dungeonActiveSegmentId);
    if (seg) { seg.notes = dungeonSegmentNotes.value; renderDungeonSegments(); }
  });
  dungeonSegmentNotes.addEventListener('change', () => {
    const s = cs(); if (s) pushDungeonUndo(s);
  });

  function deleteDungeonSegment() {
    const s = cs();
    if (!s || dungeonActiveSegmentId === null) return;
    const seg = s.dungeonSegments.find(sg => sg.id === dungeonActiveSegmentId);
    if (!seg) return;
    if (!confirm('Delete "' + seg.name + '" and its notes? This can only be undone with Ctrl+Z right after.')) return;
    s.dungeonSegments = s.dungeonSegments.filter(sg => sg.id !== seg.id);
    dungeonActiveSegmentId = null;
    dungeonNotesPanel.style.display = 'none';
    hideDungeonTooltip();
    pushDungeonUndo(s);
    renderDungeonSegments();
    redraw();
    scheduleAutosave();
  }
  dungeonDeleteSegmentBtn.addEventListener('click', deleteDungeonSegment);

  resetFogBtn.addEventListener('click', () => {
    const s = cs(); if (!s) return;
    const action = { type: 'cover' };
    applyFogAction(s.fogCtx, action, s.fogCanvas.width, s.fogCanvas.height);
    pushFogAction(s, action);
    redraw();
  });
  clearFogBtn.addEventListener('click', () => {
    const s = cs(); if (!s) return;
    const action = { type: 'clear' };
    applyFogAction(s.fogCtx, action, s.fogCanvas.width, s.fogCanvas.height);
    pushFogAction(s, action);
    redraw();
  });

  // ---------- Fog direction toggle ----------
  revealModeBtn.addEventListener('click', () => {
    fogDir = 'reveal';
    revealModeBtn.classList.add('active');
    coverModeBtn.classList.remove('active');
  });
  coverModeBtn.addEventListener('click', () => {
    fogDir = 'cover';
    coverModeBtn.classList.add('active');
    revealModeBtn.classList.remove('active');
  });

  // ---------- Brush size + fog opacity UI ----------
  function updateBrushLabel() {
    const size = brushSize.value;
    brushSizeLabel.textContent = size + 'px';
    const previewSize = Math.min(56, Math.max(8, size / 4));
    brushDot.style.width = previewSize + 'px';
    brushDot.style.height = previewSize + 'px';
  }
  brushSize.addEventListener('input', updateBrushLabel);
  updateBrushLabel();

  fogOpacity.addEventListener('input', () => {
    fogViewOpacity = parseInt(fogOpacity.value, 10) / 100;
    fogOpacityLabel.textContent = fogOpacity.value + '%';
    redraw();
  });
  fogOpacityLabel.textContent = fogOpacity.value + '%';
  fogViewOpacity = parseInt(fogOpacity.value, 10) / 100;

  // ---------- Display window ----------
  displayWindowManager = createDisplayWindowManager({
    statusElement: displayStatus,
    redraw,
    updateExtras: updateDisplayExtras,
  });
  openDisplayBtn.addEventListener('click', displayWindowManager.openOrFocus);

})();
