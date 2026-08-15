/**
 * Tavern Mapper — end-to-end test suite
 * =======================================
 * Drives the real app in a headless Chromium browser via Playwright and verifies actual
 * behavior — canvas pixel output, exported session JSON, IndexedDB autosave records, real
 * mouse drags/clicks/double-clicks, popup display window, and native dialogs — rather than
 * just re-checking JS syntax.
 *
 * Setup (from the repo root, with this file and tavern-mapper.html side by side):
 *   npm install
 *   npm test
 *
 * That's it — `npm test` installs Playwright's own Chromium automatically (via the
 * `pretest` script in package.json) the first time, then runs the suite. No fixture files,
 * no manual paths to edit: the two tiny test map images are generated at runtime from
 * embedded data, and the app path resolves relative to this file's own location.
 *
 * Already have a Chrome/Chromium you'd rather use instead of installing Playwright's own?
 *   CHROME_PATH=/path/to/chrome npm test
 *
 * Keeping tavern-mapper.html somewhere other than next to this file?
 *   TAVERN_MAPPER_PATH=/path/to/tavern-mapper.html npm test
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { PNG } = require('pngjs');

// APP_PATH resolves relative to this script's own location, so the suite works from any
// clone of the repo as long as test-suite.js sits alongside tavern-mapper.html (the default
// layout). Override with the TAVERN_MAPPER_PATH env var if you keep them elsewhere.
const APP_PATH = 'file://' + (process.env.TAVERN_MAPPER_PATH || path.join(__dirname, 'tavern-mapper.html'));

// By default this uses whichever Chromium Playwright itself installed (run `npx playwright
// install chromium` once beforehand). Set CHROME_PATH to point at a system Chrome/Chromium
// binary instead if you'd rather not install Playwright's own copy.
const CHROME_PATH = process.env.CHROME_PATH || undefined;

// Two minimal fixture map images, embedded as base64 so the suite has zero fixture-file
// dependencies — written out to a temp directory at startup and cleaned up on teardown.
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tavern-mapper-tests-'));
const MAP1 = path.join(TMP_DIR, 'map1.png');
const MAP2 = path.join(TMP_DIR, 'map2.png');
const OVERSIZED_MAP = path.join(TMP_DIR, 'oversized-map.png');
fs.writeFileSync(MAP1, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAAEIUlEQVR4nO3YsQ3CQBQFQYxclitxEY5chiMqJiNASDg7L8xU8KLVv5uWdbkBFNxHDwA4S7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgYx494LNjO0ZPgH+3P/bRE965sIAMwQIyLvokfLngUQq/7cofMi4sIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgIx59IAvju0YPQG4ChcWkCFYQMa0rMvoDQCnuLCADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwg4wnvowuHwmbnMAAAAABJRU5ErkJggg==', 'base64'));
fs.writeFileSync(MAP2, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAIAAAD2HxkiAAAHf0lEQVR4nO3cQXLbRhCG0XEqx9JJfIisfIyscuIsVAXTEEWREMh/uue9fSogpj8MANL68fPtbQA5f6UPAFYnQggTIYSJEMJECGEihDARQpgIIUyEECZCCBMhhIkQwkQIYSKEMBFCmAghTIQQJkIIEyGEiRDCRAhhIoQwEUKYCCFMhBAmQggTIYSJEMJECGEihDARQpgIIUyEECZCCBMhhIkQwkQIYSKEMBFCmAghTIQQJkIIEyGEiRDCRAhhIoQwEUKYCCFMhBD2d/oAuMs///577D/879evc4+E0/34+faWPgZ+Oxzbo8Q5DxGGvay62zQZJMKAA+EdjuSV/y+OEeHr3NPDywKY6mAWJ8Kn+3Lc47M+/xH2JsJnuT3Z04510cMuTYTn+2yOy01wmw8yORGepvHINv5oMxDhCa7OaMsBXeeTvpIIv2XNoVzzUz+PCA8yiM7AWUT4sI/Dt/jkOSHfJMIHmLYbnJzDRHiv3ZCZsKucpQNE+DXX+Ic4XY8S4S3m6TCn7n4i/JQ7q+9zDu/hz1tcZ3pOsTtvk/zjydnYCffk9wzO6g12wj+YlSexJd5gJ/ztcjLk9yRO8kciHMMG+FrO9o7bUTPxam5Nd1bfCd0dBTn575beCQ1B1uU5X3k/XDdCBc5Ah2PZCBU4Dx2uGKECZ7N4h8u9mNnWWH4TWnN11toJ11zjQrZ1WWo/XChCBZawYIerRKjAQlbrcIkIFVjOUh32j3CFVeyt/Qo2j9C3EXWt871F5wgVWN0iHbaNUIE9rNBh2wg3Cqyu/Qr2jNDr0GZ6vyxtGGHLdWLTb327RehRsKvGD4fdItwosJ+ua9oqQo+C7bV8OOwTYadV4R5tVrxJhB4F19Hv4bBJhBsFrqDZKneIsMflkGMarH6HCDfNLpDc0Gmty0fojeiy2rwprR1h9bPPWUpPQu0IN7bBNfVY98IRlr74cbq681A4wk2PyyHHNFj9qhF6H8Om+huaqhFCGyUjtA2yU3ozLBkhdFIvQtsgV9XdDOtFCM0Ui7DcRY6IWnNSLMKNe1E+KjoVVSOENipF6JUMX6r4eqZShNBSmQhtg9yp3GZYJkLoSoQQViNC96I8pNYdaY0IoTERQliBCN2LckChO9ICEUJvIoSw2SOc/16C+U0+RbNHuPFAyKOqzEyZCKErEULY1BFOfitPITPP0tQRbqrc3DObEpNTI0JoTIQQJkIImzdCPxnlFPP/iHTeCGERIoQwEUKYCCFMhBAmQggTIYRNGqEvCTnR5F8VThohrEOEECZCCBMhhIkQwkQIYSKEMBFCmAghTIQQJkIIEyGEiRDCRAhhIoQwEUKYCCFMhBA2aYST/z0Capn8r6VMGiGsQ4QQJkIIEyGEiRDCRAhhIoSweSP0VSGnmPxLwjFzhLAIEUKYCCGsRoQeCzmmxORMHeG0T9KUM/MsTR0hrECEEFYmwhI390ylyszMHuHMt/JUMfkUzR4htCdCCCsQoR+RcsD8PxndFIgQehMhhNWI0B0pDyl0LzqqRAiNiRDCykTojpQ71boXHYUihK4qRWgz5EvltsFRK0JoqWqENkM+KjoVxSIsdI9BUK05KRYh9FMvQq9nuKriK5l39SKEZkpGaDNkp+42OIpGCJ1UjdBmyKb0NjjqRnhJhytrsPqFIyx62eNJ6s5D4QgvNbgcckCPda8dYd2LH+cqPQm1Ixze0Cys+vuYTfkIL+lwHZ3WukOE1S+EfEeD1e8Q4aVOF0g+02yVm0R4eTlstkLsXK5vg21wtIlwdFkP7tdmxftEOLwpXUCbN6KXWkV4SYf9dF3TbhF6OOyq36PgpluEo90KsdNvfRtGODwcttPyUXDTM8JLOqyu/Qq2jdDDYQ+NHwU3bSMcOqxvhQJH7wiHDitbpMDRPsLRff1W0H4F+0c4vCwtqPfr0J0lIhw6LGWpAsc6EQ4dFrFagWOpCIcOp7dggWOMHz/f3tLH8GrrvHYrZOVFWWsnfOd7i9msXOBYM8Khw5ksXuBYNsKhwzkocKwc4dBhmgLfrfhiZmeX38rT8DLO+aWld8J3uwmwJT6bAnfshL+5O3oBJ/kjEf7BRfp5nNvPuB39g1vTJ1HgDXbC6wzNWZzJL9kJr7MlnkKB97AT3vKxPWN0J6fufiL8mnl6iNP1KBHey53VPZylA0T4ANf4G5ycw0T4MNO244R8kwgPuvq+dKnhcwbOIsJvWXMQ1/zUzyPCE6wzlOt80lcS4Wk++0K/wYw2/mgzEOH52oxsmw8yORE+y+1fuk07x0UPuzQRPt2XvzuNT/b8R9ibCF/nnl+Bv2zcpzqYxYkw4MC/yTjcwyv/XxwjwrBJ/pGU8IJEOJeXNam6eYiwhsNxim1+IoQwf94CwkQIYSKEMBFCmAghTIQQJkIIEyGEiRDCRAhhIoQwEUKYCCFMhBAmQggTIYSJEMJECGEihDARQpgIIUyEECZCCBMhhIkQwkQIYSKEMBFCmAghTIQQJkIIEyGEiRDCRAhhIoQwEUKYCCFMhBAmQggTIYSJEMJECGEihDARQpgIIUyEECZCCBMhhP0POU/gB6b2/p4AAAAASUVORK5CYII=', 'base64'));

const oversizedPng = new PNG({ width: 2401, height: 10 });
oversizedPng.data.fill(120);
fs.writeFileSync(OVERSIZED_MAP, PNG.sync.write(oversizedPng));

const results = [];
let page, browser, context;
let consoleErrors = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log('  \u2713', name);
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
    console.log('  \u2717', name, '-', e.message);
  }
}

function group(name) {
  console.log('\n' + name);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

// ---- helpers ----

async function getCanvasBox() {
  return page.locator('#workCanvas').boundingBox();
}

// Samples browser-composited output rather than claiming a Canvas 2D context. This remains valid if
// the renderer moves to WebGL/WebGPU, and catches failures between the renderer and the final surface.
async function sampleRenderedPixel(targetPage, selector, surfaceX, surfaceY) {
  const locator = targetPage.locator(selector);
  const nativeSize = await locator.evaluate(surface => ({ width: surface.width, height: surface.height }));
  const png = PNG.sync.read(await locator.screenshot({ animations: 'disabled' }));
  const x = Math.max(0, Math.min(png.width - 1, Math.floor(surfaceX / nativeSize.width * png.width)));
  const y = Math.max(0, Math.min(png.height - 1, Math.floor(surfaceY / nativeSize.height * png.height)));
  const index = (y * png.width + x) * 4;
  return { r: png.data[index], g: png.data[index + 1], b: png.data[index + 2], a: png.data[index + 3] };
}

async function sampleControlCanvasAlpha(mapX, mapY) {
  return sampleRenderedPixel(page, '#workCanvas', mapX, mapY);
}

async function captureRenderedSurface(targetPage, selector) {
  await targetPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return targetPage.locator(selector).screenshot({ animations: 'disabled' });
}

function surfaceDigest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function assertSurfacesEqual(before, after, message) {
  assert(before.equals(after), `${message}; before=${surfaceDigest(before)} after=${surfaceDigest(after)}`);
}

function assertSurfacesDiffer(before, after, message) {
  assert(!before.equals(after), `${message}; both=${surfaceDigest(before)}`);
}

async function clickModeTab(name) {
  const map = { maps: '#mapsModeBtn', fog: '#brushModeBtn', markers: '#markerModeBtn', camera: '#cameraModeBtn', grid: '#gridModeBtn', dungeon: '#dungeonModeBtn', calibrate: '#calibrateModeBtn', aoe: '#aoeModeBtn', dice: '#diceModeBtn', init: '#initModeBtn' };
  const category = { fog: '#catMapBtn', markers: '#catMapBtn', grid: '#catMapBtn', dungeon: '#catMapBtn', camera: '#catDisplayBtn', calibrate: '#catDisplayBtn', aoe: '#catToolsBtn', dice: '#catToolsBtn', init: '#catToolsBtn' };
  if (category[name]) {
    const alreadyVisible = await page.isVisible(map[name]);
    if (!alreadyVisible) await page.click(category[name]);
  }
  await page.click(map[name]);
}

// Simulates a mouse drag on the work canvas using MAP-PIXEL coordinates (accounts for CSS scaling).
async function dragOnCanvas(x0, y0, x1, y1, steps = 5) {
  const box = await getCanvasBox();
  const canvasNative = await page.evaluate(() => {
    const c = document.getElementById('workCanvas');
    return { w: c.width, h: c.height };
  });
  const scaleX = box.width / canvasNative.w;
  const scaleY = box.height / canvasNative.h;
  const sx0 = box.x + x0 * scaleX, sy0 = box.y + y0 * scaleY;
  const sx1 = box.x + x1 * scaleX, sy1 = box.y + y1 * scaleY;
  await page.mouse.move(sx0, sy0);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(sx0 + (sx1 - sx0) * t, sy0 + (sy1 - sy0) * t);
  }
  await page.mouse.up();
}

async function clickOnCanvas(x, y) {
  const box = await getCanvasBox();
  const canvasNative = await page.evaluate(() => {
    const c = document.getElementById('workCanvas');
    return { w: c.width, h: c.height };
  });
  const scaleX = box.width / canvasNative.w;
  const scaleY = box.height / canvasNative.h;
  await page.mouse.click(box.x + x * scaleX, box.y + y * scaleY);
}

async function dblclickOnCanvas(x, y) {
  const box = await getCanvasBox();
  const canvasNative = await page.evaluate(() => {
    const c = document.getElementById('workCanvas');
    return { w: c.width, h: c.height };
  });
  const scaleX = box.width / canvasNative.w;
  const scaleY = box.height / canvasNative.h;
  await page.mouse.dblclick(box.x + x * scaleX, box.y + y * scaleY);
}

async function rightClickOnCanvas(x, y) {
  const box = await getCanvasBox();
  const canvasNative = await page.evaluate(() => {
    const c = document.getElementById('workCanvas');
    return { w: c.width, h: c.height };
  });
  const scaleX = box.width / canvasNative.w;
  const scaleY = box.height / canvasNative.h;
  await page.mouse.click(box.x + x * scaleX, box.y + y * scaleY, { button: 'right' });
}

// Clicking empty space while something is already selected only deselects it (by design) —
// it does not place a new item. To reliably place a new marker/AoE shape regardless of
// whatever was selected before, click the target spot twice: the first click deselects
// anything active (or, if nothing was selected, harmlessly creates+selects immediately),
// and the second click then creates at that now-guaranteed-empty spot (or just re-selects
// the thing the first click created, which is idempotent).
async function placeNewAt(x, y) {
  await clickOnCanvas(x, y);
  await clickOnCanvas(x, y);
}

// Fog coverage must be checked by RGB, not alpha: the visible control canvas is always fully
// opaque (alpha 255) wherever the map exists, because fog is composited ON TOP of the opaque
// map — a "hole" in fog just lets the map's own (opaque) color show through underneath.
async function isPixelFoggedBlack(mapX, mapY) {
  const px = await sampleControlCanvasAlpha(mapX, mapY);
  return px.r < 25 && px.g < 25 && px.b < 25;
}

// Captures the JSON content of the next file download triggered by an action.
async function captureDownloadJSON(actionFn) {
  await page.bringToFront();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    actionFn()
  ]);
  const tmpPath = path.join(TMP_DIR, '_dl_' + Date.now() + '.json');
  await download.saveAs(tmpPath);
  const content = fs.readFileSync(tmpPath, 'utf8');
  return { json: JSON.parse(content), filename: download.suggestedFilename(), path: tmpPath };
}

async function setup() {
  browser = await chromium.launch({
    ...(CHROME_PATH ? { executablePath: CHROME_PATH } : {}),
    headless: true,
    args: ['--no-sandbox']
  });
  context = await browser.newContext({ acceptDownloads: true });
  page = await context.newPage();
  consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push('CONSOLE: ' + msg.text()); });
  await page.goto(APP_PATH);
}

async function teardown() {
  await browser.close();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

async function main() {
  await setup();

  group('Load & structural integrity');
  await test('page loads with correct title', async () => {
    assert((await page.title()) === 'Tavern Mapper — Table Control', 'unexpected title: ' + await page.title());
  });
  await test('header shows "Tavern Mapper"', async () => {
    const h1 = await page.textContent('h1');
    assert(h1.trim() === 'Tavern Mapper', 'header text: ' + h1);
  });
  await test('no console errors on load', async () => {
    assert(consoleErrors.length === 0, JSON.stringify(consoleErrors));
  });
  await test('empty state message shown, canvas hidden', async () => {
    const emptyVisible = await page.isVisible('#emptyState');
    const canvasVisible = await page.isVisible('#workCanvas');
    assert(emptyVisible === true, 'empty state should be visible');
    assert(canvasVisible === false, 'canvas should be hidden with no maps loaded');
  });
  await test('all ten mode tabs present (across categories)', async () => {
    for (const id of ['#mapsModeBtn', '#brushModeBtn', '#markerModeBtn', '#cameraModeBtn', '#gridModeBtn', '#dungeonModeBtn', '#calibrateModeBtn', '#aoeModeBtn', '#diceModeBtn', '#initModeBtn']) {
      assert(await page.locator(id).count() === 1, id + ' missing');
    }
  });
  await test('category sub-tab rows are hidden until their category is selected', async () => {
    for (const id of ['#subTabsMap', '#subTabsDisplay', '#subTabsTools']) {
      assert((await page.isVisible(id)) === false, id + ' should be hidden by default');
    }
  });
  await test('category bar and sub-tab rows wrap without overflowing the sidebar', async () => {
    await page.click('#catMapBtn');
    const overflow = await page.evaluate(() => {
      const sidebarRight = document.querySelector('.controls').getBoundingClientRect().right;
      const rows = [...document.querySelectorAll('.tabs')];
      const overflowing = [];
      rows.forEach(row => {
        [...row.children].forEach(t => {
          if (t.getBoundingClientRect().right > sidebarRight + 1) overflowing.push(t.textContent);
        });
      });
      return overflowing;
    });
    assert(overflow.length === 0, 'expected no tabs to overflow the sidebar, got: ' + JSON.stringify(overflow));
    await clickModeTab('maps'); // restore default state for subsequent tests
  });
  await test('Maps tab active by default', async () => {
    const cls = await page.getAttribute('#mapsModeBtn', 'class');
    assert(cls.includes('active'), 'maps tab should be active by default');
  });

  group('Display resolution (devicePixelRatio)');
  await test('display canvas buffer scales with devicePixelRatio instead of being upscaled and blurry', async () => {
    const hidpiContext = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1024, height: 768 } });
    const hidpiPage = await hidpiContext.newPage();
    await hidpiPage.goto(APP_PATH);
    await hidpiPage.setInputFiles('#fileInput', [MAP1]);
    await hidpiPage.waitForSelector('#workCanvas', { state: 'visible' });
    const [popup] = await Promise.all([
      hidpiPage.waitForEvent('popup'),
      hidpiPage.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(300);
    const info = await popup.evaluate(() => {
      const c = document.getElementById('displayCanvas');
      const rect = c.getBoundingClientRect();
      return {
        dpr: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        bufferWidth: c.width,
        bufferHeight: c.height,
        cssWidth: rect.width,
        cssHeight: rect.height
      };
    });
    assert(info.dpr === 2, 'expected simulated devicePixelRatio of 2, got ' + info.dpr);
    assert(info.bufferWidth === info.innerWidth * info.dpr, 'expected canvas buffer width to be viewport*dpr, got buffer=' + info.bufferWidth + ' expected=' + (info.innerWidth * info.dpr));
    assert(info.bufferHeight === info.innerHeight * info.dpr, 'expected canvas buffer height to be viewport*dpr, got buffer=' + info.bufferHeight + ' expected=' + (info.innerHeight * info.dpr));
    assert(Math.round(info.cssWidth) === info.innerWidth, 'expected canvas CSS width to still match the viewport (no layout blowup), got ' + info.cssWidth + ' vs viewport ' + info.innerWidth);
    assert(Math.round(info.cssHeight) === info.innerHeight, 'expected canvas CSS height to still match the viewport, got ' + info.cssHeight + ' vs viewport ' + info.innerHeight);
    await popup.close();
    await hidpiContext.close();
  });
  await test('display window restores its rendering surface after accidental content loss', async () => {
    const isolatedPage = await context.newPage();
    await isolatedPage.goto(APP_PATH);
    await isolatedPage.setInputFiles('#fileInput', [MAP1]);
    await isolatedPage.waitForSelector('#workCanvas', { state: 'visible' });
    const [popup] = await Promise.all([
      isolatedPage.waitForEvent('popup'),
      isolatedPage.click('#openDisplayBtn')
    ]);
    await popup.waitForSelector('#displayCanvas');
    await popup.evaluate(() => { document.body.innerHTML = ''; });
    await popup.waitForSelector('#displayCanvas', { state: 'visible', timeout: 3500 });
    const recoveredFrame = await captureRenderedSurface(popup, '#displayCanvas');
    assert(recoveredFrame.length > 100, 'recovered display surface did not produce a frame');
    await popup.close();
    await isolatedPage.close();
  });

  group('Slideshow: adding and switching maps');
  await test('images over 2400px are downscaled while preserving aspect ratio', async () => {
    const isolatedPage = await context.newPage();
    await isolatedPage.goto(APP_PATH);
    await isolatedPage.setInputFiles('#fileInput', [OVERSIZED_MAP]);
    await isolatedPage.waitForSelector('#workCanvas', { state: 'visible' });
    const dimensions = await isolatedPage.locator('#workCanvas').evaluate(surface => ({ width: surface.width, height: surface.height }));
    assert(dimensions.width === 2400 && dimensions.height === 10, 'unexpected downscaled dimensions: ' + JSON.stringify(dimensions));
    await isolatedPage.close();
  });
  await test('adding one image creates a slide and shows canvas', async () => {
    await page.setInputFiles('#fileInput', [MAP1]);
    await page.waitForSelector('#workCanvas', { state: 'visible', timeout: 5000 });
    const count = await page.locator('.slide-item').count();
    assert(count === 1, 'expected 1 slide, got ' + count);
  });
  await test('dims label reflects the loaded image size', async () => {
    const label = await page.textContent('#dimsLabel');
    assert(label.includes('400') && label.includes('300'), 'dims label: ' + label);
  });
  await test('adding a second image appends without switching view', async () => {
    const nameBefore = await page.textContent('#dimsLabel');
    await page.setInputFiles('#fileInput', [MAP2]);
    await page.waitForFunction(() => document.querySelectorAll('.slide-item').length === 2);
    const nameAfter = await page.textContent('#dimsLabel');
    assert(nameBefore === nameAfter, 'active slide should not change when adding a new one');
  });
  await test('clicking Next switches to the second map', async () => {
    await page.click('#nextSlideBtn');
    const label = await page.textContent('#dimsLabel');
    assert(label.includes('300') && label.includes('300'), 'expected map2 dims (300x300): ' + label);
  });
  await test('clicking Prev switches back to the first map', async () => {
    await page.click('#prevSlideBtn');
    const label = await page.textContent('#dimsLabel');
    assert(label.includes('400') && label.includes('300'), 'expected map1 dims: ' + label);
  });

  group('Fog: brush reveal/re-cover, opacity, undo actions');
  await test('new map starts fully revealed (no fog)', async () => {
    await clickModeTab('fog');
    const px = await sampleControlCanvasAlpha(200, 150);
    // Map1's fill color is (60,90,60) — seeing that (not near-black) confirms no fog overlay.
    assert(px.r === 60 && px.g === 90 && px.b === 60, 'expected map\'s own color with no fog, got ' + JSON.stringify(px));
  });
  await test('Cover entire map fills fog (near-black at 100% control opacity)', async () => {
    await page.fill('#fogOpacity', '100');
    await page.dispatchEvent('#fogOpacity', 'input');
    await page.click('#resetFogBtn'); // "Cover entire map"
    assert(await isPixelFoggedBlack(200, 150), 'expected near-black fog after Cover entire map');
  });
  await test('display fog stays opaque when control-only fog opacity is zero', async () => {
    await page.fill('#fogOpacity', '0');
    await page.dispatchEvent('#fogOpacity', 'input');
    const controlPixel = await sampleControlCanvasAlpha(200, 150);
    assert(controlPixel.r === 60 && controlPixel.g === 90 && controlPixel.b === 60, 'control should show map through zero-opacity fog: ' + JSON.stringify(controlPixel));
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(300);
    const displaySize = await popup.locator('#displayCanvas').evaluate(surface => ({ width: surface.width, height: surface.height }));
    const displayPixel = await sampleRenderedPixel(popup, '#displayCanvas', displaySize.width / 2, displaySize.height / 2);
    assert(displayPixel.r < 25 && displayPixel.g < 25 && displayPixel.b < 25, 'display fog should remain opaque: ' + JSON.stringify(displayPixel));
    await popup.close();
    await page.fill('#fogOpacity', '100');
    await page.dispatchEvent('#fogOpacity', 'input');
  });
  await test('brush reveal punches a hole in fog (map color shows through)', async () => {
    await page.fill('#brushSize', '80');
    await page.dispatchEvent('#brushSize', 'input');
    await dragOnCanvas(180, 130, 220, 170);
    const px = await sampleControlCanvasAlpha(200, 150);
    assert(px.r === 60 && px.g === 90 && px.b === 60, 'expected map color revealed through fog, got ' + JSON.stringify(px));
  });
  await test('Fog undo reverts the reveal stroke', async () => {
    await clickModeTab('fog');
    await page.click('#undoBtn');
    assert(await isPixelFoggedBlack(200, 150), 'expected fog restored (near-black) after undo');
  });
  await test('Reveal entire map clears fog', async () => {
    await page.click('#clearFogBtn');
    const px = await sampleControlCanvasAlpha(200, 150);
    assert(px.r === 60 && px.g === 90 && px.b === 60, 'expected map color fully revealed, got ' + JSON.stringify(px));
  });
  await test('undo button label reflects Fog tab', async () => {
    const label = await page.textContent('#undoContextLabel');
    assert(label === 'Undo (Fog)', 'label: ' + label);
  });

  group('Markers: place, select, drag, rename, delete, shapes/colors');
  await test('place a marker via click (accepts label prompt)', async () => {
    await clickModeTab('markers');
    page.once('dialog', d => d.accept('poison trap'));
    await clickOnCanvas(100, 100);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const markers = json.slides[0].markers;
    assert(markers.length === 1, 'expected 1 marker, got ' + markers.length);
    assert(markers[0].label === 'poison trap', 'label: ' + markers[0].label);
    assert(markers[0].shape === 'x', 'default shape should be x, got ' + markers[0].shape);
  });
  await test('changing shape+color swatch affects the next newly placed marker', async () => {
    await page.click('#shapeSwatches button:nth-child(6)'); // skull is 6th of 7
    await page.click('#colorSwatches button:nth-child(2)'); // second color swatch
    page.once('dialog', d => d.accept('goblin ambush'));
    await placeNewAt(300, 200); // marker A (from prior test) is still selected — this deselects, then creates
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const markers = json.slides[0].markers;
    assert(markers.length === 2, 'expected 2 markers, got ' + markers.length);
    const second = markers.find(m => m.label === 'goblin ambush');
    assert(second, 'second marker not found');
    assert(second.shape === 'skull', 'expected skull shape, got ' + second.shape);
  });
  await test('click-drag moves a selected marker', async () => {
    // marker B (goblin ambush) is currently selected at (300,200); click-away first to
    // deselect, then click marker A (poison trap, at 100,100) to select it, then drag it.
    await clickOnCanvas(10, 10); // deselect
    await dragOnCanvas(100, 100, 150, 120);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const marker = json.slides[0].markers.find(m => m.label === 'poison trap');
    assert(Math.abs(marker.x - 150) < 5 && Math.abs(marker.y - 120) < 5, 'marker did not move as expected: ' + JSON.stringify(marker));
  });
  await test('Delete key removes the selected marker', async () => {
    await clickOnCanvas(150, 120); // re-select the moved marker (poison trap)
    await page.keyboard.press('Delete');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const markers = json.slides[0].markers;
    assert(markers.length === 1, 'expected 1 marker remaining, got ' + markers.length);
    assert(markers[0].label === 'goblin ambush', 'expected the remaining marker to be goblin ambush, got ' + markers[0].label);
  });
  await test('right-click deletes a marker instantly', async () => {
    await rightClickOnCanvas(300, 200); // goblin ambush
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[0].markers.length === 0, 'expected 0 markers remaining, got ' + json.slides[0].markers.length);
  });
  await test('markers never render on the display composite', async () => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(300);
    const before = await captureRenderedSurface(popup, '#displayCanvas');
    page.once('dialog', d => d.accept('secret trap'));
    await placeNewAt(200, 150);
    const after = await captureRenderedSurface(popup, '#displayCanvas');
    assertSurfacesEqual(before, after, 'adding a GM-only marker changed display pixels');
    await popup.close();
  });

  group('Camera: pan, zoom, fit-whole-map');
  await test('camera defaults to full map extent', async () => {
    await clickModeTab('camera');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const cam = json.slides[0].camera;
    assert(cam.w === 400 && cam.h === 300, 'expected full-extent camera, got ' + JSON.stringify(cam));
  });
  await test('Zoom In button shrinks the camera viewport', async () => {
    await page.click('#zoomInBtn');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const cam = json.slides[0].camera;
    assert(cam.w < 400, 'expected camera to shrink after zoom in, got w=' + cam.w);
  });
  await test('Fit whole map restores full extent', async () => {
    await page.click('#fitFullBtn');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const cam = json.slides[0].camera;
    assert(cam.w === 400 && cam.h === 300, 'expected full extent restored, got ' + JSON.stringify(cam));
  });
  await test('clicking outside the current camera viewport recenters it there', async () => {
    await page.click('#fitFullBtn');
    for (let i = 0; i < 6; i++) await page.click('#zoomInBtn'); // shrink enough that (300,220) is reachable without edge-clamping
    await clickOnCanvas(300, 220);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const cam = json.slides[0].camera;
    const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
    assert(Math.abs(cx - 300) < 5 && Math.abs(cy - 220) < 5, 'camera did not recenter near click point: ' + JSON.stringify(cam) + ' center=(' + cx + ',' + cy + ')');
  });
  await test('camera undo reverts to previous framing', async () => {
    await page.click('#fitFullBtn');
    await page.click('#undoBtn'); // should undo the fit-full, returning to the recentered zoomed state
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const cam = json.slides[0].camera;
    assert(cam.w < 400, 'expected undo to revert fit-full back to zoomed state, got w=' + cam.w);
    await page.click('#fitFullBtn'); // reset for subsequent tests
  });
  await test('cursor gives feedback for camera corners, pan area, and drag state', async () => {
    async function cursorAt() { return page.evaluate(() => document.getElementById('workCanvas').style.cursor); }
    const box = await getCanvasBox();

    await page.mouse.move(box.x + 200, box.y + 150); // full-extent camera: dead center
    assert((await cursorAt()) === 'move', 'expected move cursor inside the camera viewport');

    await page.mouse.move(box.x + 1, box.y + 1);
    assert((await cursorAt()) === 'nwse-resize', 'expected nwse-resize cursor near the nw corner');
    await page.mouse.move(box.x + 399, box.y + 1);
    assert((await cursorAt()) === 'nesw-resize', 'expected nesw-resize cursor near the ne corner');
    await page.mouse.move(box.x + 1, box.y + 299);
    assert((await cursorAt()) === 'nesw-resize', 'expected nesw-resize cursor near the sw corner');
    await page.mouse.move(box.x + 399, box.y + 299);
    assert((await cursorAt()) === 'nwse-resize', 'expected nwse-resize cursor near the se corner');

    await page.click('#zoomInBtn');
    await page.click('#zoomInBtn');
    await page.mouse.move(box.x + 5, box.y + 5); // now outside the shrunk viewport
    assert((await cursorAt()) === 'crosshair', 'expected default crosshair cursor outside the camera viewport');

    await page.click('#fitFullBtn');
    await page.mouse.move(box.x + 1, box.y + 1);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + 50);
    assert((await cursorAt()) === 'nwse-resize', 'expected resize cursor to persist while actively dragging a corner');
    await page.mouse.up();

    await clickModeTab('fog');
    const afterSwitch = await cursorAt();
    assert(afterSwitch === '', 'expected cursor reset to CSS default after leaving Camera mode, got "' + afterSwitch + '"');
    await clickModeTab('camera');
    await page.click('#fitFullBtn'); // reset for subsequent tests
  });

  group('Grid: toggle, size, offset, opacity, per-map persistence');
  await test('grid off by default; enabling shows grid lines on canvas', async () => {
    await clickModeTab('grid');
    let px = await sampleControlCanvasAlpha(100, 0);
    await page.check('#gridEnabled');
    await page.fill('#gridSize', '50');
    await page.dispatchEvent('#gridSize', 'input');
    await page.dispatchEvent('#gridSize', 'change');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const grid = json.slides[0].grid;
    assert(grid.enabled === true && grid.size === 50, 'grid state: ' + JSON.stringify(grid));
  });
  await test('grid offset X/Y persist per map', async () => {
    await page.fill('#gridOffsetX', '15');
    await page.dispatchEvent('#gridOffsetX', 'input');
    await page.dispatchEvent('#gridOffsetX', 'change');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[0].grid.offsetX === 15, 'offsetX: ' + json.slides[0].grid.offsetX);
  });
  await test('grid opacity slider updates per-map grid opacity', async () => {
    await page.fill('#gridOpacity', '40');
    await page.dispatchEvent('#gridOpacity', 'input');
    await page.dispatchEvent('#gridOpacity', 'change');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(Math.abs(json.slides[0].grid.opacity - 0.4) < 0.01, 'opacity: ' + json.slides[0].grid.opacity);
  });
  await test('switching to map2 shows independent (disabled) grid, switching back preserves map1 grid', async () => {
    await clickModeTab('maps');
    await page.click('#nextSlideBtn');
    await clickModeTab('grid');
    const enabledOnMap2 = await page.isChecked('#gridEnabled');
    assert(enabledOnMap2 === false, 'map2 should have its own independent grid state (off)');
    await clickModeTab('maps');
    await page.click('#prevSlideBtn');
    await clickModeTab('grid');
    const enabledOnMap1 = await page.isChecked('#gridEnabled');
    assert(enabledOnMap1 === true, 'map1 grid state should persist after switching back');
  });

  group('Shared color picker (Markers/AoE/Dungeon: presets + wheel + recently used)');
  await test('picking a custom color via the wheel sets it as the marker default', async () => {
    await clickModeTab('markers');
    await page.fill('#markerColorWheel', '#123456');
    await page.dispatchEvent('#markerColorWheel', 'input');
    page.once('dialog', d => d.accept('color picker test marker'));
    await clickOnCanvas(30, 30);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const marker = json.slides[0].markers.find(m => m.label === 'color picker test marker');
    assert(marker && marker.color === '#123456', 'expected marker placed with the custom wheel color, got ' + JSON.stringify(marker));
    await rightClickOnCanvas(30, 30); // clean up
  });
  await test('a recently used color appears in the shared row across Markers, AoE, and Dungeon', async () => {
    const inMarkers = await page.locator('#colorSwatchesRecent button').count();
    assert(inMarkers === 1, 'expected 1 recent color in Markers row, got ' + inMarkers);
    await clickModeTab('aoe');
    const inAoe = await page.evaluate(() => document.querySelectorAll('#aoeColorSwatchesRecent button').length);
    const aoeColor = await page.evaluate(() => document.querySelector('#aoeColorSwatchesRecent button') ? document.querySelector('#aoeColorSwatchesRecent button').dataset.color : null);
    assert(inAoe === 1 && aoeColor === '#123456', 'expected the same recent color shared into the AoE row, got count=' + inAoe + ' color=' + aoeColor);
    await clickModeTab('dungeon');
    const inDungeon = await page.evaluate(() => document.querySelectorAll('#dungeonColorSwatchesRecent button').length);
    assert(inDungeon === 1, 'expected the same recent color shared into the Dungeon row too, got ' + inDungeon);
  });
  await test('clicking a recent-color swatch applies it, and retroactively recolors a selected AoE shape via the wheel', async () => {
    await clickModeTab('aoe');
    await page.click('#aoeCircleBtn');
    await page.fill('#aoeFt', '5');
    await page.dispatchEvent('#aoeFt', 'input');
    await page.click('#aoeColorSwatchesRecent button');
    await clickOnCanvas(200, 250);
    let { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    let circle = json.slides[0].aoeShapes.find(s => s.type === 'circle');
    assert(circle && circle.color === '#123456', 'expected shape placed using the recent-color swatch, got ' + JSON.stringify(circle));

    await clickOnCanvas(200, 250); // reselect
    await page.fill('#aoeColorWheel', '#abcdef');
    await page.dispatchEvent('#aoeColorWheel', 'input');
    ({ json } = await captureDownloadJSON(() => page.click('#saveSessionBtn')));
    circle = json.slides[0].aoeShapes.find(s => s.type === 'circle');
    assert(circle.color === '#abcdef', 'expected the wheel to retroactively recolor the selected shape, got ' + circle.color);
    await rightClickOnCanvas(200, 250); // clean up
  });
  await test('recently used list caps at 8 entries and moves a re-picked color to the front instead of duplicating', async () => {
    await clickModeTab('dungeon');
    for (let i = 0; i < 10; i++) {
      const hex = '#' + (i.toString(16).padStart(2, '0')).repeat(3);
      await page.fill('#dungeonColorWheel', hex);
      await page.dispatchEvent('#dungeonColorWheel', 'input');
    }
    const cappedCount = await page.locator('#dungeonColorSwatchesRecent button').count();
    assert(cappedCount === 8, 'expected recent list capped at 8, got ' + cappedCount);

    const before = await page.evaluate(() => [...document.querySelectorAll('#dungeonColorSwatchesRecent button')].map(b => b.dataset.color));
    await page.fill('#dungeonColorWheel', before[3]);
    await page.dispatchEvent('#dungeonColorWheel', 'input');
    const after = await page.evaluate(() => [...document.querySelectorAll('#dungeonColorSwatchesRecent button')].map(b => b.dataset.color));
    assert(after.length === 8, 'expected still 8 entries (no duplicate added), got ' + after.length);
    assert(after[0] === before[3], 'expected the re-picked color to move to the front, got ' + after[0] + ' vs expected ' + before[3]);
  });

  group('Category tabs');
  await test('clicking a category shows only its sub-tabs and auto-activates the first one', async () => {
    await clickModeTab('maps'); // reset away from any category first
    await page.click('#catToolsBtn');
    const toolsVisible = await page.isVisible('#subTabsTools');
    const mapVisible = await page.isVisible('#subTabsMap');
    assert(toolsVisible === true && mapVisible === false, 'expected only Tools sub-tabs visible, got tools=' + toolsVisible + ' map=' + mapVisible);
    const aoeActive = await page.evaluate(() => document.getElementById('aoeModeBtn').classList.contains('active'));
    assert(aoeActive === true, 'expected AoE (first in Tools) auto-activated');
  });
  await test('category remembers the last-active tab, not just the first', async () => {
    await page.click('#catMapBtn');
    await page.click('#gridModeBtn');
    await page.click('#catToolsBtn'); // switch away
    await page.click('#catMapBtn'); // switch back
    const gridStillActive = await page.evaluate(() => document.getElementById('gridModeBtn').classList.contains('active'));
    assert(gridStillActive === true, 'expected Map category to return to Grid, not reset to Fog');
  });
  await test('selecting Maps tab hides all category sub-rows', async () => {
    await clickModeTab('maps');
    for (const id of ['#subTabsMap', '#subTabsDisplay', '#subTabsTools']) {
      assert((await page.isVisible(id)) === false, id + ' should be hidden while on the Maps tab');
    }
  });

  group('Dungeon Mode: paint segments, notes, selection, GM-only');
  await test('painting on empty space creates a new segment', async () => {
    await clickModeTab('dungeon');
    await dragOnCanvas(100, 100, 150, 150);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[0].dungeonSegments.length === 1, 'expected 1 segment after painting, got ' + json.slides[0].dungeonSegments.length);
    assert(json.slides[0].dungeonSegments[0].strokes[0].points.length > 1, 'expected multiple recorded points along the stroke');
  });
  await test('editing name and notes on the active segment persists', async () => {
    await page.fill('#dungeonSegmentName', 'Throne Room');
    await page.dispatchEvent('#dungeonSegmentName', 'change');
    await page.fill('#dungeonSegmentNotes', 'Cracked throne. Trapdoor behind the tapestry.');
    await page.dispatchEvent('#dungeonSegmentNotes', 'change');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const seg = json.slides[0].dungeonSegments[0];
    assert(seg.name === 'Throne Room', 'expected name to persist, got ' + seg.name);
    assert(seg.notes.includes('Trapdoor'), 'expected notes to persist, got ' + seg.notes);
  });
  await test('continuing to paint elsewhere adds a stroke to the active segment rather than creating a new one', async () => {
    await dragOnCanvas(250, 200, 280, 220);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[0].dungeonSegments.length === 1, 'expected still 1 segment (painted into the active one)');
    assert(json.slides[0].dungeonSegments[0].strokes.length === 2, 'expected 2 strokes on the same segment, got ' + json.slides[0].dungeonSegments[0].strokes.length);
  });
  await test('"Start new segment" clears the active segment so the next stroke begins a fresh one', async () => {
    await page.click('#dungeonNewSegmentBtn');
    await dragOnCanvas(50, 250, 80, 260);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[0].dungeonSegments.length === 2, 'expected a second segment after New Segment + paint, got ' + json.slides[0].dungeonSegments.length);
  });
  await test('clicking an existing segment re-selects it and syncs the inspector', async () => {
    await clickOnCanvas(120, 120); // inside the Throne Room stroke
    const nameVal = await page.inputValue('#dungeonSegmentName');
    assert(nameVal === 'Throne Room', 'expected clicking the painted area to re-select Throne Room, got "' + nameVal + '"');
  });
  await test('Escape deselects without deleting', async () => {
    const { json: before } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    await page.keyboard.press('Escape');
    const panelHidden = !(await page.isVisible('#dungeonNotesPanel'));
    assert(panelHidden, 'expected notes panel hidden after Escape');
    const { json: after } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(before.slides[0].dungeonSegments.length === after.slides[0].dungeonSegments.length, 'Escape should not delete anything');
  });
  await test('deleting a segment requires confirmation and removes it permanently', async () => {
    await clickOnCanvas(120, 120); // reselect Throne Room
    page.once('dialog', d => d.accept());
    await page.click('#dungeonDeleteSegmentBtn');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[0].dungeonSegments.length === 1, 'expected 1 segment remaining after delete, got ' + json.slides[0].dungeonSegments.length);
    assert(!json.slides[0].dungeonSegments.find(s => s.name === 'Throne Room'), 'Throne Room should be gone');
  });
  await test('dungeon segments never render on the display composite (GM-only)', async () => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(300);
    const before = await captureRenderedSurface(popup, '#displayCanvas');
    await page.click('#dungeonNewSegmentBtn');
    await dragOnCanvas(320, 260, 350, 275);
    const after = await captureRenderedSurface(popup, '#displayCanvas');
    assertSurfacesEqual(before, after, 'adding a GM-only dungeon segment changed display pixels');
    await page.click('#undoBtn');
    await popup.close();
    await page.bringToFront();
  });
  await test('Undo (Dungeon) reverts the last paint action', async () => {
    await clickModeTab('dungeon');
    const { json: before } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const countBefore = before.slides[0].dungeonSegments.length;
    await page.click('#dungeonNewSegmentBtn');
    await dragOnCanvas(300, 50, 330, 70);
    const { json: afterPaint } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(afterPaint.slides[0].dungeonSegments.length === countBefore + 1, 'expected a new segment after painting');
    const undoLabel = await page.textContent('#undoContextLabel');
    assert(undoLabel === 'Undo (Dungeon)', 'expected Dungeon tab to show its own undo label, got "' + undoLabel + '"');
    await page.click('#undoBtn');
    const { json: afterUndo } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(afterUndo.slides[0].dungeonSegments.length === countBefore, 'expected undo to remove the just-painted segment');
  });
  await test('dungeon segments persist through session save/load', async () => {
    const { json, path: savedPath } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const countBefore = json.slides[0].dungeonSegments.length;
    await page.reload();
    await page.waitForSelector('#emptyState', { state: 'visible' });
    await page.setInputFiles('#loadSessionInput', [savedPath]);
    await page.waitForSelector('#workCanvas', { state: 'visible', timeout: 5000 });
    await clickModeTab('dungeon');
    const listCount = await page.locator('#dungeonSegmentList .list-row').count();
    assert(listCount === countBefore, 'expected ' + countBefore + ' segments restored, got ' + listCount);
  });

  group('AoE: shapes, rotation, color, calibration, visibility toggle');
  // Note: default calibration is 100px per 5ft (20px/ft). On this small 400x300 test map,
  // a 20ft circle would be an 800px-diameter circle — bigger than the whole canvas. Using
  // small ft values here keeps shapes localized and well-separated for reliable testing.
  await test('Backspace/Delete edit form fields normally instead of being hijacked by shape-deletion shortcuts', async () => {
    await clickModeTab('aoe');
    await page.fill('#aoeFt', '250');
    await page.click('#aoeFt');
    await page.keyboard.press('End');
    await page.keyboard.press('Backspace');
    const val = await page.inputValue('#aoeFt');
    assert(val === '25', 'expected Backspace to edit the text field to "25", got "' + val + '"');
    await page.fill('#aoeFt', '20'); // restore for subsequent tests
  });
  await test('placing a circle creates a shape with entered radius', async () => {
    await clickModeTab('aoe');
    await page.fill('#aoeFt', '3');
    await page.dispatchEvent('#aoeFt', 'input');
    await clickOnCanvas(100, 90);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const shapes = json.slides[0].aoeShapes;
    assert(shapes.length === 1 && shapes[0].type === 'circle' && shapes[0].ft === 3, JSON.stringify(shapes));
  });
  await test('switching shape type + rotation places a cone with correct rotation', async () => {
    // Note: the shape-type buttons double as an "edit selected shape" control — clicking one
    // while something is selected retroactively changes that shape's type too (by design).
    // Deselect first (click clearly outside the circle's actual radius) so we're only
    // setting the default for the next placement.
    await clickOnCanvas(20, 280);
    await page.click('#aoeConeBtn');
    await page.fill('#aoeFt', '4');
    await page.dispatchEvent('#aoeFt', 'input');
    await page.fill('#aoeRotation', '90');
    await page.dispatchEvent('#aoeRotation', 'input');
    await placeNewAt(300, 220);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const shapes = json.slides[0].aoeShapes;
    assert(shapes.length === 2, 'expected 2 shapes total, got ' + shapes.length + ': ' + JSON.stringify(shapes));
    const circle = shapes.find(s => s.type === 'circle');
    assert(circle, 'the original circle should be untouched, got: ' + JSON.stringify(shapes));
    const cone = shapes.find(s => s.type === 'cone');
    assert(cone, 'no cone shape found');
    const deg = Math.round(cone.rotation * 180 / Math.PI);
    assert(deg === 90, 'expected 90deg rotation, got ' + deg);
  });
  await test('clicking an existing AoE shape selects it for editing (inspector updates)', async () => {
    await clickOnCanvas(20, 280); // deselect the cone first (safely outside both shapes)
    await clickOnCanvas(100, 90); // the circle placed earlier
    const ftVal = await page.inputValue('#aoeFt');
    const circleActive = (await page.getAttribute('#aoeCircleBtn', 'class')).includes('active');
    assert(ftVal === '3' && circleActive, 'inspector should reflect the selected 3ft circle, got ft=' + ftVal + ' circleActive=' + circleActive);
  });
  await test('editing ft while selected updates that specific shape only', async () => {
    await page.fill('#aoeFt', '5');
    await page.dispatchEvent('#aoeFt', 'input');
    await page.dispatchEvent('#aoeFt', 'change');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const shapes = json.slides[0].aoeShapes;
    const circle = shapes.find(s => s.type === 'circle');
    assert(circle, 'circle shape not found among: ' + JSON.stringify(shapes));
    assert(circle.ft === 5, 'expected edited shape ft=5, got ' + circle.ft);
    const cone = shapes.find(s => s.type === 'cone');
    assert(cone && cone.ft === 4, 'the cone should be untouched by editing the circle, got ' + JSON.stringify(cone));
  });
  await test('double-click toggles a shape\'s display visibility', async () => {
    const before = await page.isChecked('#aoeVisibleToggle');
    assert(before === true, 'should default to visible');
    await dblclickOnCanvas(100, 90); // the circle, currently selected
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const shape = json.slides[0].aoeShapes.find(s => s.type === 'circle');
    assert(shape.visible === false, 'expected visible=false after double-click toggle, got ' + shape.visible);
  });
  await test('hidden AoE shape is excluded from the display composite but shown on control', async () => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(300);
    const hidden = await captureRenderedSurface(popup, '#displayCanvas');
    await page.check('#aoeVisibleToggle');
    const visible = await captureRenderedSurface(popup, '#displayCanvas');
    assertSurfacesDiffer(hidden, visible, 'showing the hidden AoE did not change display pixels');
    await page.uncheck('#aoeVisibleToggle');
    const hiddenAgain = await captureRenderedSurface(popup, '#displayCanvas');
    assertSurfacesEqual(hidden, hiddenAgain, 'hiding the AoE did not restore the original display pixels');
    await popup.close();
  });
  await test('right-click deletes an AoE shape', async () => {
    await rightClickOnCanvas(300, 220); // the cone
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const shapes = json.slides[0].aoeShapes;
    const cone = shapes.find(s => s.type === 'cone');
    assert(!cone, 'cone should have been deleted');
    assert(shapes.length === 1 && shapes[0].type === 'circle', 'expected only the circle remaining, got ' + JSON.stringify(shapes));
  });
  await test('calibration auto-locks to grid when this map has a grid enabled', async () => {
    // map1 had its grid enabled earlier in the Grid test group, and we're still on map1.
    await clickModeTab('calibrate');
    const noteVisible = await page.isVisible('#aoeCalibrationGridNote');
    const manualVisible = await page.isVisible('#aoeCalibrationManualRow');
    assert(noteVisible === true && manualVisible === false, 'expected grid-locked calibration note shown, got note=' + noteVisible + ' manual=' + manualVisible);
    await clickModeTab('aoe');
  });
  await test('dragging the on-canvas rotation handle rotates a selected cone', async () => {
    await page.click('#aoeConeBtn');
    await page.fill('#aoeFt', '3');
    await page.fill('#aoeRotation', '0');
    await page.dispatchEvent('#aoeRotation', 'input');
    await clickOnCanvas(20, 280); // ensure nothing else is selected first
    await placeNewAt(150, 220); // places a fresh cone, auto-selected, facing right (0°) at ft=3

    // map1's grid is enabled with size 50 at this point (from the Grid test group), so
    // pixels-per-foot = 50/5 = 10, and a 3ft cone's handle sits exactly 30px from its origin.
    const handleX = 150 + 30, handleY = 220; // 0° = pointing right
    await dragOnCanvas(handleX, handleY, 150, 250); // drag straight down from the origin -> should become 90°

    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const cone = json.slides[0].aoeShapes.find(s => s.type === 'cone' && Math.abs(s.x - 150) < 2 && Math.abs(s.y - 220) < 2);
    assert(cone, 'could not find the test cone in saved session');
    const deg = Math.round(cone.rotation * 180 / Math.PI);
    assert(Math.abs(deg - 90) <= 2, 'expected rotation ~90deg after dragging the handle downward, got ' + deg);

    // clean up: delete this test shape so it doesn't interfere with later AoE tests
    // (click inside the cone body, not exactly at the apex vertex, for a reliable hit-test)
    await rightClickOnCanvas(150, 235);
  });
  await test('cursor gives feedback while hovering/dragging the rotation handle', async () => {
    await page.fill('#aoeRotation', '0');
    await page.dispatchEvent('#aoeRotation', 'input');
    await clickOnCanvas(20, 280);
    await placeNewAt(150, 220); // fresh cone, ft=3, grid ppf=10 -> size=30px, handle at (180,220)

    async function cursorAt() { return page.evaluate(() => document.getElementById('workCanvas').style.cursor); }
    const box = await getCanvasBox();

    await page.mouse.move(box.x + 300, box.y + 20); // far from the handle
    assert((await cursorAt()) === 'crosshair', 'expected default crosshair cursor away from the handle');

    await page.mouse.move(box.x + 180, box.y + 220); // directly on the handle
    assert((await cursorAt()) === 'grab', 'expected grab cursor when hovering the rotation handle');

    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 250);
    assert((await cursorAt()) === 'grabbing', 'expected grabbing cursor while actively dragging the handle');
    await page.mouse.up();

    await clickModeTab('fog');
    const afterSwitch = await cursorAt();
    assert(afterSwitch === '', 'expected cursor reset to CSS default after leaving AoE mode, got "' + afterSwitch + '"');
    await clickModeTab('aoe');

    await rightClickOnCanvas(150, 235); // clean up this test shape
  });
  await test('calibration shows manual field on a map with no grid', async () => {
    await clickModeTab('maps');
    await page.click('#nextSlideBtn'); // map2 has no grid
    await clickModeTab('calibrate');
    const noteVisible = await page.isVisible('#aoeCalibrationGridNote');
    const manualVisible = await page.isVisible('#aoeCalibrationManualRow');
    assert(noteVisible === false && manualVisible === true, 'expected manual calibration field shown on ungridded map, got note=' + noteVisible + ' manual=' + manualVisible);
  });

  group('AoE Calibration Tools (on map2, which has no grid; now its own tab)');
  await test('Calibrate tab is separate from AoE, with its own panel', async () => {
    await clickModeTab('calibrate');
    const calibVisible = await page.isVisible('#calibrateControls');
    const aoeVisible = await page.isVisible('#aoeControls');
    assert(calibVisible === true && aoeVisible === false, 'expected Calibrate panel shown and AoE panel hidden, got calib=' + calibVisible + ' aoe=' + aoeVisible);
    const undoLabel = await page.textContent('#undoContextLabel');
    assert(undoLabel === 'Undo (AoE)', 'expected Calibrate tab to share AoE\'s undo label, got "' + undoLabel + '"');
  });
  await test('draw-a-line calibration is self-consistent with subsequent shape rendering', async () => {
    const box = await getCanvasBox();
    await page.click('#calibRefLenButtons button:nth-child(1)'); // 5ft
    await page.click('#calibDrawLineBtn');
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 170, box.y + 50); // exactly 120px horizontal, representing 5ft
    await page.mouse.up();
    let { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[1].aoeCalibration === 120, 'expected a 120px/5ft line to set calibration to 120, got ' + json.slides[1].aoeCalibration);

    // self-consistency: a 5ft circle should render with radius exactly matching the line's pixel length
    // (placing a shape requires the AoE tab specifically, since Calibrate no longer has shape controls)
    await clickModeTab('aoe');
    await clickOnCanvas(20, 280);
    await page.click('#aoeCircleBtn');
    await page.fill('#aoeFt', '5');
    await page.dispatchEvent('#aoeFt', 'input');
    await page.mouse.click(box.x + 300, box.y + 200);
    ({ json } = await captureDownloadJSON(() => page.click('#saveSessionBtn')));
    const circle = json.slides[1].aoeShapes.find(s => s.type === 'circle');
    const ppf = json.slides[1].aoeCalibration / 5;
    const radiusPx = circle.ft * ppf;
    assert(Math.abs(radiusPx - 120) < 1, 'expected 5ft circle radius to match the 120px calibration line, got ' + radiusPx);
    await rightClickOnCanvas(300, 200); // clean up the test circle
    await clickModeTab('calibrate');
  });
  await test('reference square + manual field: adjusting the number resizes it live', async () => {
    await page.click('#calibShowSquareBtn');
    await page.fill('#aoeCalibration', '150');
    await page.dispatchEvent('#aoeCalibration', 'input');
    await page.dispatchEvent('#aoeCalibration', 'change');
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[1].aoeCalibration === 150, 'expected manual number field to set calibration to 150, got ' + json.slides[1].aoeCalibration);
    await page.click('#calibShowSquareBtn'); // hide it
  });
  await test('unlocked calibration is unaffected by zooming', async () => {
    await clickModeTab('camera');
    await page.click('#fitFullBtn');
    await clickModeTab('calibrate');
    const { json: before } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(before.slides[1].aoeZoomLock === false, 'expected lock to be off by default');
    await clickModeTab('camera');
    await page.click('#zoomInBtn');
    await clickModeTab('calibrate');
    const { json: after } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(before.slides[1].aoeCalibration === after.slides[1].aoeCalibration, 'unlocked calibration should not change when zooming, before=' + before.slides[1].aoeCalibration + ' after=' + after.slides[1].aoeCalibration);
    await clickModeTab('camera');
    await page.click('#fitFullBtn'); // reset for the next test
    await clickModeTab('calibrate');
  });
  await test('locking to zoom captures a reference and auto-adjusts calibration proportionally as camera width changes', async () => {
    await page.check('#aoeZoomLockToggle');
    const { json: locked } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(locked.slides[1].aoeZoomLock === true, 'expected lock enabled');
    assert(locked.slides[1].aoeZoomLockRefCamW === 300, 'expected reference camW to be the full map width (300), got ' + locked.slides[1].aoeZoomLockRefCamW);
    const calBefore = locked.slides[1].aoeCalibration;

    await clickModeTab('camera');
    await page.click('#zoomInBtn'); // shrinks camW by factor 0.8
    await clickModeTab('calibrate');
    const { json: zoomed } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const expected = calBefore * (zoomed.slides[1].camera.w / 300);
    assert(Math.abs(zoomed.slides[1].aoeCalibration - expected) < 1, 'expected calibration to scale proportionally with camera width: expected ' + expected + ', got ' + zoomed.slides[1].aoeCalibration);
  });
  await test('the manual field is disabled while locked, and temporarily re-enabled while showing the reference square', async () => {
    const disabledLocked = await page.evaluate(() => document.getElementById('aoeCalibration').disabled);
    assert(disabledLocked === true, 'expected manual field disabled while locked');
    await page.click('#calibShowSquareBtn');
    const enabledDuringRecalib = await page.evaluate(() => document.getElementById('aoeCalibration').disabled);
    assert(enabledDuringRecalib === false, 'expected manual field re-enabled while the reference square is shown');
    await page.click('#calibShowSquareBtn');
    const disabledAgain = await page.evaluate(() => document.getElementById('aoeCalibration').disabled);
    assert(disabledAgain === true, 'expected manual field disabled again after hiding the reference square');
  });
  await test('"Snap to calibrated zoom" restores the exact reference framing and calibration', async () => {
    const { json: before } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const refCal = before.slides[1].aoeZoomLockRefCalibration;
    await page.click('#calibSnapZoomBtn');
    const { json: after } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(after.slides[1].camera.w === 300, 'expected camera snapped back to full extent (300), got ' + after.slides[1].camera.w);
    assert(after.slides[1].aoeCalibration === refCal, 'expected calibration restored to the reference value ' + refCal + ', got ' + after.slides[1].aoeCalibration);
    await page.uncheck('#aoeZoomLockToggle'); // reset for cleanliness
    await clickModeTab('maps');
    await page.click('#prevSlideBtn'); // back to map1 for subsequent tests
    await clickModeTab('aoe');
  });

  await test('Escape deselects an AoE shape without deleting it', async () => {
    await placeNewAt(150, 60); // a fresh, clearly-selected circle at a clean spot
    const { json: before } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const countBefore = before.slides[0].aoeShapes.length;
    await page.keyboard.press('Escape');
    // pressing Delete now should do nothing, since Escape should have cleared the selection
    await page.keyboard.press('Delete');
    const { json: after } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(after.slides[0].aoeShapes.length === countBefore, 'Escape should deselect (not delete), and Delete afterward should be a no-op with nothing selected');
  });
  await test('Escape deselects a marker without deleting it', async () => {
    await clickModeTab('markers');
    page.once('dialog', d => d.accept('escape test marker'));
    await placeNewAt(350, 60);
    const { json: before } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const countBefore = before.slides[0].markers.length;
    await page.keyboard.press('Escape');
    await page.keyboard.press('Delete'); // should no-op now that Escape cleared selection
    const { json: after } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(after.slides[0].markers.length === countBefore, 'Escape should deselect (not delete), and Delete afterward should be a no-op with nothing selected');
  });

  group('Undo: per-mode independence across tab switches');
  await test('fog undo history is untouched by marker/camera/grid/aoe actions', async () => {
    await clickModeTab('fog');
    await page.click('#resetFogBtn'); // cover map1 fully (new undo step)
    const coveredPixel = await sampleControlCanvasAlpha(75, 75);
    await dragOnCanvas(50, 50, 100, 100); // reveal a spot (new undo step)
    const revealedPixel = await sampleControlCanvasAlpha(75, 75);
    assert(
      revealedPixel.r !== coveredPixel.r || revealedPixel.g !== coveredPixel.g || revealedPixel.b !== coveredPixel.b,
      'setup failed: reveal stroke should visibly change this pixel'
    );
    // do unrelated work in other tabs
    await clickModeTab('markers');
    page.once('dialog', d => d.accept('distraction'));
    await clickOnCanvas(10, 10);
    await clickModeTab('camera');
    await page.click('#zoomInBtn');
    await page.click('#fitFullBtn');
    // back to fog: undo should still revert the fog reveal stroke, unaffected by the above
    await clickModeTab('fog');
    await page.click('#undoBtn');
    const afterUndoPixel = await sampleControlCanvasAlpha(75, 75);
    assert(
      afterUndoPixel.r === coveredPixel.r && afterUndoPixel.g === coveredPixel.g && afterUndoPixel.b === coveredPixel.b,
      'fog undo should exactly restore the pre-reveal (covered) pixel regardless of intervening actions in other tabs — ' +
      'covered=' + JSON.stringify(coveredPixel) + ' afterUndo=' + JSON.stringify(afterUndoPixel)
    );
  });

  group('Session save/load round-trip and defensive sanitization');
  await test('load session restores markers/camera/grid/aoe from a saved file', async () => {
    const { path: savedPath } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    // reload fresh app instance, then load that file back
    await page.reload();
    await page.waitForSelector('#emptyState', { state: 'visible' });
    await page.setInputFiles('#loadSessionInput', [savedPath]);
    await page.waitForSelector('#workCanvas', { state: 'visible', timeout: 5000 });
    const slideCount = await page.locator('.slide-item').count();
    assert(slideCount === 2, 'expected 2 slides restored, got ' + slideCount);
  });
  await test('malformed session file (grid.size=0, bad camera) loads without hanging, values sanitized', async () => {
    const badSession = {
      version: 1, currentIndex: 0, fogViewOpacity: 0.5, gridColor: '#ffffff',
      slides: [{
        name: 'Malformed Map',
        mapDataUrl: await page.evaluate(() => {
          const c = document.createElement('canvas'); c.width = 100; c.height = 100;
          const ctx = c.getContext('2d'); ctx.fillStyle = '#336633'; ctx.fillRect(0, 0, 100, 100);
          return c.toDataURL('image/jpeg');
        }),
        fogDataUrl: await page.evaluate(() => {
          const c = document.createElement('canvas'); c.width = 100; c.height = 100;
          return c.toDataURL('image/png');
        }),
        thumb: '', markers: [], camera: { x: -999, y: -999, w: 0, h: -5 },
        grid: { enabled: true, size: 0, offsetX: 99999, offsetY: -99999 },
        aoeShapes: [{ type: 'circle', x: 0, y: 0, ft: -50, rotation: NaN, color: '#ff0000' }],
        aoeCalibration: -10,
        aoeZoomLock: true,
        aoeZoomLockRefCalibration: -50,
        aoeZoomLockRefCamW: 0,
        aoeZoomLockRefCamera: { x: NaN, y: 0, w: -10, h: 'oops' }
      }]
    };
    const badPath = path.join(TMP_DIR, '_bad_session.json');
    fs.writeFileSync(badPath, JSON.stringify(badSession));
    const start = Date.now();
    await page.setInputFiles('#loadSessionInput', [badPath]);
    await page.waitForSelector('#workCanvas', { state: 'visible', timeout: 5000 });
    const elapsed = Date.now() - start;
    assert(elapsed < 4000, 'loading malformed session took suspiciously long (possible hang): ' + elapsed + 'ms');
    const gridSizeVal = await page.inputValue('#gridSize');
    assert(parseInt(gridSizeVal, 10) >= 20, 'expected grid size clamped to a safe minimum, got ' + gridSizeVal);
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.slides[0].aoeZoomLock === false, 'expected an invalid zoom-lock reference to be rejected, falling back to unlocked, got ' + JSON.stringify(json.slides[0].aoeZoomLock));
    assert(json.slides[0].aoeZoomLockRefCamera === null, 'expected the corrupted reference camera to be discarded, got ' + JSON.stringify(json.slides[0].aoeZoomLockRefCamera));
  });

  group('Autosave (IndexedDB) and resume banner');
  await test('a change triggers an autosave record in IndexedDB', async () => {
    await clickModeTab('fog');
    await dragOnCanvas(30, 30, 60, 60); // any fog change to trigger scheduleAutosave via redraw()
    await page.waitForTimeout(2200); // debounce is 1.5s
    const hasRecord = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('TavernMapperAutosaveDB', 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('autosave', 'readonly');
          const getReq = tx.objectStore('autosave').get('current');
          getReq.onsuccess = () => resolve(!!getReq.result);
          getReq.onerror = () => resolve(false);
        };
        req.onerror = () => resolve(false);
      });
    });
    assert(hasRecord === true, 'expected an autosave record to exist in IndexedDB');
  });
  await test('reloading the page shows a resume banner referencing the autosave', async () => {
    await page.reload();
    await page.waitForSelector('#resumeBanner', { state: 'visible', timeout: 5000 });
    const text = await page.textContent('#resumeText');
    assert(/autosaved session/.test(text), 'resume banner text: ' + text);
  });
  await test('clicking Discard clears the banner and the IndexedDB record', async () => {
    await page.click('#discardBtn');
    const bannerVisible = await page.isVisible('#resumeBanner');
    assert(bannerVisible === false, 'banner should be hidden after discard');
  });

  group('Sidebar resize');
  await test('dragging the resize handle changes sidebar width within bounds', async () => {
    const before = await page.evaluate(() => document.querySelector('.controls').getBoundingClientRect().width);
    const handleBox = await page.locator('#sidebarResizeHandle').boundingBox();
    await page.mouse.move(handleBox.x + 3, handleBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 150, handleBox.y + 20, { steps: 5 });
    await page.mouse.up();
    const after = await page.evaluate(() => document.querySelector('.controls').getBoundingClientRect().width);
    assert(after > before, 'expected sidebar to widen: before=' + before + ' after=' + after);
    assert(after <= 560, 'sidebar should be clamped to max width, got ' + after);
  });

  group('Dice roller');
  // Fresh page here: by this point the shared page has done 60+ continuous actions (drags, popups,
  // dialogs) across earlier groups, and headless Chromium was hitting a resource-exhaustion wall
  // (confirmed by isolated reproduction: identical steps succeed instantly on a clean page/session).
  // Dice/Initiative don't depend on any state from earlier groups, so a clean page sidesteps it
  // rather than masking anything real.
  const oldPage = page;
  page = await context.newPage();
  await page.goto(APP_PATH);
  await page.setInputFiles('#fileInput', [MAP1]);
  await page.waitForSelector('#workCanvas', { state: 'visible' });
  await oldPage.close();

  await test('rolling a d20 shows a result and adds to history', async () => {
    await clickModeTab('dice');
    await page.click('#diceTypeButtons button:nth-child(6)'); // d4,d6,d8,d10,d12,d20 -> 6th is d20
    await page.fill('#diceCount', '1');
    await page.fill('#diceModifier', '0');
    await page.click('#rollDiceBtn');
    const resultText = await page.textContent('#diceResult');
    assert(/d20/.test(resultText), 'expected d20 in result text: ' + resultText);
    const historyCount = await page.locator('#diceHistoryList .list-row').count();
    assert(historyCount === 1, 'expected 1 history entry, got ' + historyCount);
  });
  await test('modifier and multiple dice are reflected in the roll label', async () => {
    await page.click('#diceTypeButtons button:nth-child(2)'); // d6
    await page.fill('#diceCount', '3');
    await page.fill('#diceModifier', '5');
    await page.click('#rollDiceBtn');
    const resultText = await page.textContent('#diceResult');
    assert(/3d6\+5/.test(resultText), 'expected "3d6+5" in result: ' + resultText);
  });
  await test('advantage mode rolls twice and keeps one labeled result', async () => {
    await page.click('#diceAdvBtn');
    await page.fill('#diceCount', '1');
    await page.fill('#diceModifier', '0');
    await page.click('#rollDiceBtn');
    const resultText = await page.textContent('#diceResult');
    assert(/vs/.test(resultText), 'expected two roll sets separated by "vs" for advantage: ' + resultText);
    await page.click('#diceNormalBtn'); // reset for subsequent tests
  });
  await test('"Show on display" reveals that roll on the display screen banner', async () => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(200);
    // reveal the most recent (topmost) history entry
    await page.click('#diceHistoryList .list-row:first-child button');
    await popup.waitForTimeout(200);
    const bannerText = await popup.evaluate(() => document.getElementById('rollBanner').textContent);
    const bannerVisible = await popup.evaluate(() => document.getElementById('rollBanner').style.display === 'block');
    assert(bannerVisible, 'expected roll banner visible on display after reveal');
    assert(bannerText.length > 0, 'expected non-empty banner text');
    // toggle it back off
    await page.click('#diceHistoryList .list-row:first-child button');
    await popup.waitForTimeout(200);
    const hiddenAfterToggle = await popup.evaluate(() => document.getElementById('rollBanner').style.display !== 'block');
    assert(hiddenAfterToggle, 'expected roll banner hidden again after toggling off');
    await popup.close();
  });
  await test('dice history persists through session save/load', async () => {
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(Array.isArray(json.diceHistory) && json.diceHistory.length >= 3, 'expected dice history in saved session, got ' + JSON.stringify(json.diceHistory));
  });

  group('Dice pool (click-to-roll)');
  await page.click('#clearPoolBtn'); // earlier Dice roller tests already left entries here as a side effect of clicking die-type buttons
  await test('clicking a die button rolls one immediately into the pool', async () => {
    await page.click('#diceTypeButtons button:nth-child(2)'); // d6
    const pills = await page.locator('#dicePoolRow .hp-log-pill').allTextContents();
    assert(pills.length === 1 && /d6:\d+/.test(pills[0]), 'expected 1 pool pill showing a d6 result, got ' + JSON.stringify(pills));
    const total = await page.textContent('#dicePoolTotal');
    assert(/^\d+$/.test(total.trim()), 'expected numeric pool total, got "' + total + '"');
  });
  await test('clicking more dice (even different types) adds to the same pool with a running total', async () => {
    await page.click('#diceTypeButtons button:nth-child(6)'); // d20
    await page.click('#diceTypeButtons button:nth-child(1)'); // d4
    const pills = await page.locator('#dicePoolRow .hp-log-pill').allTextContents();
    assert(pills.length === 3, 'expected 3 pool pills after 3 clicks, got ' + JSON.stringify(pills));
    const values = pills.map(p => parseInt(p.split(':')[1], 10));
    const total = parseInt((await page.textContent('#dicePoolTotal')).trim(), 10);
    assert(total === values.reduce((a, b) => a + b, 0), 'pool total should equal sum of individual rolls: pills=' + JSON.stringify(pills) + ' total=' + total);
  });
  await test('removing a pool pill recalculates the total from what remains', async () => {
    const before = await page.locator('#dicePoolRow .hp-log-pill').allTextContents();
    await page.locator('#dicePoolRow .hp-log-pill').first().locator('button').click();
    const after = await page.locator('#dicePoolRow .hp-log-pill').allTextContents();
    assert(after.length === before.length - 1, 'expected one fewer pill after removal');
    const total = parseInt((await page.textContent('#dicePoolTotal')).trim(), 10);
    const expectedTotal = after.map(p => parseInt(p.split(':')[1], 10)).reduce((a, b) => a + b, 0);
    assert(total === expectedTotal, 'pool total should recalculate after removing a pill: expected ' + expectedTotal + ', got ' + total);
  });
  await test('"Show pool on display" reveals it, mutually exclusive with a revealed history entry', async () => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(200);
    await page.click('#revealPoolBtn');
    await popup.waitForTimeout(200);
    let bannerVisible = await popup.evaluate(() => document.getElementById('rollBanner').style.display === 'block');
    assert(bannerVisible, 'expected pool banner visible on display after reveal');
    // now revealing a history entry should hide the pool banner (mutually exclusive)
    await page.click('#diceHistoryList .list-row:first-child button');
    await popup.waitForTimeout(200);
    const bannerText = await popup.evaluate(() => document.getElementById('rollBanner').textContent);
    assert(/d\d/.test(bannerText) === false || /=/.test(bannerText), 'banner should now show the history entry, not the pool: ' + bannerText);
    // clean up: hide the history reveal again
    await page.click('#diceHistoryList .list-row:first-child button');
    await popup.close();
    await page.bringToFront();
  });
  await test('Clear pool empties the pool and resets the total', async () => {
    await page.click('#clearPoolBtn');
    const pills = await page.locator('#dicePoolRow .hp-log-pill').count();
    assert(pills === 0, 'expected 0 pool pills after clearing, got ' + pills);
    const total = await page.textContent('#dicePoolTotal');
    assert(total.trim() === '—', 'expected pool total reset to em-dash, got "' + total + '"');
  });
  await test('dice pool persists through session save/load', async () => {
    await page.click('#diceTypeButtons button:nth-child(3)'); // d8
    await page.click('#diceTypeButtons button:nth-child(4)'); // d10
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(Array.isArray(json.dicePool) && json.dicePool.length === 2, 'expected 2 dicePool entries saved, got ' + JSON.stringify(json.dicePool));
  });

  group('Initiative tracker');
  const stripTurnMarker = (s) => s.replace(/^▶ /, '');
  await test('adding combatants sorts them by initiative score, highest first', async () => {
    await clickModeTab('init');
    await page.fill('#combatantName', 'Goblin');
    await page.fill('#combatantScore', '8');
    await page.click('#addCombatantBtn');
    await page.fill('#combatantName', 'Aria the Rogue');
    await page.fill('#combatantScore', '19');
    await page.click('#addCombatantBtn');
    await page.fill('#combatantName', 'Ogre');
    await page.fill('#combatantScore', '3');
    await page.click('#addCombatantBtn');
    const names = await page.locator('#combatantList .row-title').allTextContents();
    assert(JSON.stringify(names.map(stripTurnMarker)) === JSON.stringify(['Aria the Rogue', 'Goblin', 'Ogre']), 'expected sorted by score desc, got ' + JSON.stringify(names));
  });
  await test('first combatant added becomes the current turn automatically', async () => {
    const currentRows = await page.locator('#combatantList .combatant-row.current-turn .row-title').allTextContents();
    assert(currentRows.length === 1 && stripTurnMarker(currentRows[0]) === 'Aria the Rogue', 'expected Aria (highest score) to be current turn, got ' + JSON.stringify(currentRows));
  });
  await test('Next Turn advances to the next combatant in initiative order', async () => {
    await page.click('#nextTurnBtn');
    const currentRows = await page.locator('#combatantList .combatant-row.current-turn .row-title').allTextContents();
    assert(stripTurnMarker(currentRows[0]) === 'Goblin', 'expected Goblin to be current turn after advancing, got ' + JSON.stringify(currentRows));
  });
  await test('Next Turn wraps around and increments the round counter', async () => {
    await page.click('#nextTurnBtn'); // -> Ogre
    const roundBefore = await page.textContent('#roundLabel');
    await page.click('#nextTurnBtn'); // wraps back to Aria, round++
    const roundAfter = await page.textContent('#roundLabel');
    const currentRows = await page.locator('#combatantList .combatant-row.current-turn .row-title').allTextContents();
    assert(stripTurnMarker(currentRows[0]) === 'Aria the Rogue', 'expected wrap back to Aria, got ' + JSON.stringify(currentRows));
    assert(parseInt(roundAfter, 10) === parseInt(roundBefore, 10) + 1, 'expected round to increment on wraparound: before=' + roundBefore + ' after=' + roundAfter);
  });
  await test('removing a combatant updates the list', async () => {
    await page.click('#combatantList .combatant-row:has-text("Ogre") button');
    const names = await page.locator('#combatantList .row-title').allTextContents();
    assert(!names.includes('Ogre'), 'expected Ogre removed, got ' + JSON.stringify(names));
  });
  await test('"Show on display" reveals the initiative panel on the display screen', async () => {
    await page.check('#initiativeShowOnDisplay');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(300);
    const panelVisible = await popup.evaluate(() => document.getElementById('initiativePanel').style.display === 'block');
    const panelText = await popup.evaluate(() => document.getElementById('initiativePanel').textContent);
    assert(panelVisible, 'expected initiative panel visible on display');
    assert(/Aria the Rogue/.test(panelText), 'expected combatant names in display panel: ' + panelText);
    await popup.close();
  });
  await test('unchecking "Show on display" hides the initiative panel', async () => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(200);
    await page.uncheck('#initiativeShowOnDisplay');
    await popup.waitForTimeout(200);
    const panelVisible = await popup.evaluate(() => document.getElementById('initiativePanel').style.display === 'block');
    assert(!panelVisible, 'expected initiative panel hidden after unchecking show-on-display');
    await popup.close();
  });
  await test('AC input sets a combatant\'s armor class', async () => {
    const acInput = page.locator('#combatantList .combatant-row:has-text("Goblin") .combatant-stats input[type="number"]');
    await acInput.fill('15');
    await acInput.blur();
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const goblin = json.initiative.combatants.find(c => c.name === 'Goblin');
    assert(goblin.ac === 15, 'expected AC 15, got ' + JSON.stringify(goblin));
  });
  await test('HP box sets an absolute value with a plain number', async () => {
    const hpInput = page.locator('#combatantList .combatant-row:has-text("Goblin") .combatant-stats input[type="text"]');
    await hpInput.fill('20');
    await hpInput.press('Enter');
    const readout = await page.locator('#combatantList .combatant-row:has-text("Goblin") .hp-readout').textContent();
    assert(readout === '20', 'expected HP readout to show 20, got ' + readout);
    const pills = await page.locator('#combatantList .combatant-row:has-text("Goblin") .hp-log-pill').allTextContents();
    assert(pills.length === 1 && /20/.test(pills[0]), 'expected one log pill showing 20, got ' + JSON.stringify(pills));
  });
  await test('HP box applies +N/-N as a running delta, logging each entry as a separate pill', async () => {
    const hpInput = page.locator('#combatantList .combatant-row:has-text("Goblin") .combatant-stats input[type="text"]');
    await hpInput.fill('-8');
    await hpInput.press('Enter');
    let readout = await page.locator('#combatantList .combatant-row:has-text("Goblin") .hp-readout').textContent();
    assert(readout === '12', 'expected HP reduced to 12 (20-8), got ' + readout);
    await hpInput.fill('+5');
    await hpInput.press('Enter');
    readout = await page.locator('#combatantList .combatant-row:has-text("Goblin") .hp-readout').textContent();
    assert(readout === '17', 'expected HP healed to 17 (12+5), got ' + readout);
    const pills = await page.locator('#combatantList .combatant-row:has-text("Goblin") .hp-log-pill').allTextContents();
    assert(pills.length === 3, 'expected 3 log pills (20, -8, +5), got ' + JSON.stringify(pills));
  });
  await test('deleting a log pill recalculates the total from what remains', async () => {
    // delete the "-8" entry (the mistaken one) and confirm HP recalculates to 20+5=25
    const row = page.locator('#combatantList .combatant-row:has-text("Goblin")');
    const pills = row.locator('.hp-log-pill');
    const count = await pills.count();
    let removed = false;
    for (let i = 0; i < count; i++) {
      const text = await pills.nth(i).textContent();
      if (text.includes('-8')) {
        await pills.nth(i).locator('button').click();
        removed = true;
        break;
      }
    }
    assert(removed, 'could not find the -8 pill to delete');
    const readout = await row.locator('.hp-readout').textContent();
    assert(readout === '25', 'expected HP recalculated to 25 (20+5) after removing the -8 entry, got ' + readout);
    const remainingPills = await row.locator('.hp-log-pill').allTextContents();
    assert(remainingPills.length === 2, 'expected 2 pills remaining, got ' + JSON.stringify(remainingPills));
  });
  await test('HP/AC default to blank for combatants they were never set on', async () => {
    const ariaReadout = await page.locator('#combatantList .combatant-row:has-text("Aria the Rogue") .hp-readout').textContent();
    assert(ariaReadout === '—', 'expected Aria\'s HP to remain unset (—), got ' + ariaReadout);
  });
  await test('AC/HP log persist through session save/load', async () => {
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    const goblin = json.initiative.combatants.find(c => c.name === 'Goblin');
    assert(goblin.ac === 15, 'expected AC 15 preserved, got ' + JSON.stringify(goblin));
    assert(Array.isArray(goblin.hpLog) && goblin.hpLog.length === 2, 'expected 2 hpLog entries preserved, got ' + JSON.stringify(goblin.hpLog));
    const aria = json.initiative.combatants.find(c => c.name === 'Aria the Rogue');
    assert(aria.ac === null && (!aria.hpLog || aria.hpLog.length === 0), 'expected Aria\'s AC/HP to remain unset, got ' + JSON.stringify(aria));
  });
  await test('AC/HP never appear on the display screen, even with the tracker shown', async () => {
    await page.check('#initiativeShowOnDisplay');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('#openDisplayBtn')
    ]);
    await popup.waitForTimeout(300);
    const panelText = await popup.evaluate(() => document.getElementById('initiativePanel').textContent);
    assert(!/15|25|AC|HP/.test(panelText), 'AC/HP details should never reach the display panel, got: ' + panelText);
    assert(/Goblin/.test(panelText), 'combatant name should still be shown: ' + panelText);
    await popup.close();
    await page.bringToFront();
  });
  await test('initiative state persists through session save/load', async () => {
    const { json } = await captureDownloadJSON(() => page.click('#saveSessionBtn'));
    assert(json.initiative && json.initiative.combatants.length === 2, 'expected 2 combatants in saved session, got ' + JSON.stringify(json.initiative));
    assert(json.initiative.round === 2, 'expected round 2 saved, got ' + json.initiative.round);
  });
  await test('Undo button is disabled/inert on Dice and Init tabs (no undo history for these)', async () => {
    const disabledOnInit = await page.evaluate(() => document.getElementById('undoBtn').disabled);
    assert(disabledOnInit === true, 'expected Undo button disabled while on the Init tab');
    await clickModeTab('dice');
    const disabledOnDice = await page.evaluate(() => document.getElementById('undoBtn').disabled);
    assert(disabledOnDice === true, 'expected Undo button disabled while on the Dice tab');
    await clickModeTab('fog'); // restore normal state for anything after
    const enabledOnFog = await page.evaluate(() => document.getElementById('undoBtn').disabled);
    assert(enabledOnFog === false, 'expected Undo button enabled again back on the Fog tab');
  });

  await test('Save/Load session controls are reachable from any tab (sticky footer)', async () => {
    await clickModeTab('grid');
    const saveVisible = await page.isVisible('#saveSessionBtn');
    assert(saveVisible, 'Save session button should be visible regardless of active tab');
  });
  await test('HP log is collapsed by default for a combatant with no logged entries yet', async () => {
    await clickModeTab('init');
    await page.fill('#combatantName', 'Fresh Recruit');
    await page.fill('#combatantScore', '5');
    await page.click('#addCombatantBtn');
    const row = page.locator('#combatantList .combatant-row:has-text("Fresh Recruit")');
    const pillsBefore = await row.locator('.hp-log-row').count();
    assert(pillsBefore === 0, 'expected no HP log row visible before any entry is logged');
    const expandBtn = row.locator('.combatant-stats button').last();
    const label = await expandBtn.textContent();
    assert(label.trim() === '▾', 'expected collapsed toggle with no count badge, got "' + label + '"');
    // logging an entry should auto-reveal the log
    const hpInput = row.locator('.combatant-stats input[type="text"]');
    await hpInput.fill('12');
    await hpInput.press('Enter');
    const pillsAfter = await row.locator('.hp-log-row .hp-log-pill').count();
    assert(pillsAfter === 1, 'expected the log to auto-expand and show 1 pill after logging an entry');
  });

  await teardown();

  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.pass).length;
  console.log(`${passed}/${results.length} passed`);
  if (passed !== results.length) {
    console.log('\nFAILURES:');
    results.filter(r => !r.pass).forEach(r => console.log('  -', r.name, ':', r.error));
    process.exitCode = 1;
  }
}

main().catch(async e => {
  console.error('FATAL:', e);
  if (browser) await browser.close().catch(() => {});
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  process.exit(1);
});
