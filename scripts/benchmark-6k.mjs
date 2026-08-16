import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const WIDTH = 6144;
const HEIGHT = 4096;
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'tavern-mapper-6k-'));
const fixturePath = join(temporaryDirectory, 'map-6144x4096.png');
const reportPath = resolve('benchmark-6k.json');

function elapsed(startedAt) {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function createFixture() {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const offset = (y * WIDTH + x) * 4;
      const checker = ((x >> 8) + (y >> 8)) % 2;
      png.data[offset] = checker ? 68 : 42;
      png.data[offset + 1] = checker ? 94 : 70;
      png.data[offset + 2] = checker ? 64 : 46;
      png.data[offset + 3] = 255;
    }
  }
  return PNG.sync.write(png, { colorType: 2 });
}

async function canvasPoint(page, mapX, mapY) {
  const canvas = page.locator('#workCanvas');
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({
    width: Number(element.dataset.mapWidth) || element.width,
    height: Number(element.dataset.mapHeight) || element.height,
  }));
  return {
    x: box.x + mapX / size.width * box.width,
    y: box.y + mapY / size.height * box.height,
  };
}

const fixtureStartedAt = performance.now();
await writeFile(fixturePath, createFixture());
const fixtureGenerationMs = elapsed(fixtureStartedAt);

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto(`file://${resolve('tavern-mapper.html')}`);

const importOneStartedAt = performance.now();
await page.setInputFiles('#fileInput', fixturePath);
await page.waitForSelector('#workCanvas', { state: 'visible' });
await page.waitForFunction(() => document.querySelectorAll('.slide-item').length === 1);
const importOneMs = elapsed(importOneStartedAt);

const dimensions = await page.locator('#workCanvas').evaluate(canvas => ({
  width: Number(canvas.dataset.mapWidth),
  height: Number(canvas.dataset.mapHeight),
  previewWidth: canvas.width,
  previewHeight: canvas.height,
}));
if (dimensions.width !== WIDTH || dimensions.height !== HEIGHT) {
  throw new Error(`Expected ${WIDTH}x${HEIGHT}, got ${dimensions.width}x${dimensions.height}`);
}

await page.click('#catMapBtn');
await page.click('#brushModeBtn');
const coverStartedAt = performance.now();
await page.click('#resetFogBtn');
await page.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
const coverFogMs = elapsed(coverStartedAt);

const start = await canvasPoint(page, 2800, 1800);
const end = await canvasPoint(page, 3344, 2296);
const brushStartedAt = performance.now();
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.mouse.move(end.x, end.y, { steps: 12 });
await page.mouse.up();
await page.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
const fogBrushMs = elapsed(brushStartedAt);

await page.click('#catDisplayBtn');
await page.click('#cameraModeBtn');
const cameraStartedAt = performance.now();
for (let index = 0; index < 10; index++) await page.click(index % 2 ? '#zoomOutBtn' : '#zoomInBtn');
await page.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
const tenCameraRedrawsMs = elapsed(cameraStartedAt);

const displayStartedAt = performance.now();
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.click('#openDisplayBtn'),
]);
await popup.waitForSelector('#displayCanvas');
await popup.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
const displayStartupMs = elapsed(displayStartedAt);
await popup.close();

await page.waitForTimeout(1800);
await page.evaluate(async () => {
  const database = await new Promise((resolveDatabase, rejectDatabase) => {
    const request = indexedDB.open('TavernMapperAutosaveDB', 1);
    request.onsuccess = () => resolveDatabase(request.result);
    request.onerror = () => rejectDatabase(request.error);
  });
  await new Promise((resolveDelete) => {
    const transaction = database.transaction('autosave', 'readwrite');
    transaction.objectStore('autosave').delete('current');
    transaction.oncomplete = resolveDelete;
  });
});
await page.click('#catMapBtn');
await page.click('#brushModeBtn');
const autosaveStartedAt = performance.now();
const autosaveStartedEpoch = Date.now();
const autosavePoint = await canvasPoint(page, 1500, 1500);
await page.mouse.click(autosavePoint.x, autosavePoint.y);
await page.evaluate(async (minimumSavedAt) => {
  const database = await new Promise((resolveDatabase, rejectDatabase) => {
    const request = indexedDB.open('TavernMapperAutosaveDB', 1);
    request.onsuccess = () => resolveDatabase(request.result);
    request.onerror = () => rejectDatabase(request.error);
  });
  return new Promise((resolveRecord, rejectRecord) => {
    const deadline = Date.now() + 15000;
    const poll = () => {
      const request = database.transaction('autosave', 'readonly').objectStore('autosave').get('current');
      request.onsuccess = () => {
        if (request.result?.data?.slides?.length && request.result.savedAt >= minimumSavedAt) {
          resolveRecord();
        } else if (Date.now() >= deadline) {
          rejectRecord(new Error('Timed out waiting for a fresh autosave record'));
        } else {
          setTimeout(poll, 50);
        }
      };
      request.onerror = () => rejectRecord(request.error);
    };
    poll();
  });
}, autosaveStartedEpoch);
const autosaveReadyMs = elapsed(autosaveStartedAt);

const exportStartedAt = performance.now();
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('#saveSessionBtn'),
]);
const downloadPath = join(temporaryDirectory, 'session.json');
await download.saveAs(downloadPath);
const exportSessionMs = elapsed(exportStartedAt);
const exportSizeBytes = (await import('node:fs/promises')).stat(downloadPath).then(stat => stat.size);

const restorePage = await context.newPage();
await restorePage.goto(`file://${resolve('tavern-mapper.html')}`);
const restoreStartedAt = performance.now();
await restorePage.setInputFiles('#loadSessionInput', downloadPath);
await restorePage.waitForSelector('#workCanvas', { state: 'visible', timeout: 15000 });
const restoredDimensions = await restorePage.locator('#workCanvas').evaluate(canvas => ({
  width: Number(canvas.dataset.mapWidth),
  height: Number(canvas.dataset.mapHeight),
}));
if (restoredDimensions.width !== WIDTH || restoredDimensions.height !== HEIGHT) {
  throw new Error(`Restored map dimensions changed: ${JSON.stringify(restoredDimensions)}`);
}
const restoreSessionMs = elapsed(restoreStartedAt);
await restorePage.close();

await page.click('#mapsModeBtn');
const importTwoStartedAt = performance.now();
await page.setInputFiles('#fileInput', fixturePath);
await page.waitForFunction(() => document.querySelectorAll('.slide-item').length === 2);
const importSecondMapMs = elapsed(importTwoStartedAt);

const metrics = await page.evaluate(() => ({
  usedJsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
  totalJsHeapBytes: performance.memory?.totalJSHeapSize ?? null,
}));

const bytesPerCanvas = WIDTH * HEIGHT * 4;
const report = {
  generatedAt: new Date().toISOString(),
  environment: 'Playwright headless Chromium in the current dev container; rerun on target hardware for release decisions.',
  dimensions,
  timingsMs: {
    fixtureGeneration: fixtureGenerationMs,
    importFirstMap: importOneMs,
    coverFog: coverFogMs,
    fogBrushGesture: fogBrushMs,
    tenCameraRedraws: tenCameraRedrawsMs,
    displayStartup: displayStartupMs,
    autosaveReadyAfterChanges: autosaveReadyMs,
    exportSession: exportSessionMs,
    restoreSession: restoreSessionMs,
    importSecondMap: importSecondMapMs,
  },
  memory: {
    bytesPerRgbaCanvas: bytesPerCanvas,
    minimumMapAndFogBytesPerSlide: bytesPerCanvas * 2,
    minimumMapAndFogMiBPerSlide: Math.round(bytesPerCanvas * 2 / 1024 / 1024),
    ...metrics,
  },
  exportSizeBytes: await exportSizeBytes,
  pageErrors,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

await browser.close();
await rm(temporaryDirectory, { recursive: true, force: true });

if (pageErrors.length) process.exitCode = 1;
