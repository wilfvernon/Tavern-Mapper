export function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export function pushBounded(history, snapshot, limit) {
  history.push(snapshot);
  if (history.length > limit) history.shift();
}

export function snapshotCamera(camera, aspect = null, zoom = null) {
  const snapshot = { x: camera.x, y: camera.y, w: camera.w, h: camera.h };
  if (aspect !== null) snapshot.aspect = aspect;
  if (zoom !== null) snapshot.zoom = zoom;
  return snapshot;
}

export function snapshotGrid(grid) {
  return {
    enabled: grid.enabled,
    size: grid.size,
    offsetX: grid.offsetX,
    offsetY: grid.offsetY,
    opacity: grid.opacity,
  };
}

export function snapshotAoe(slide) {
  return {
    shapes: cloneValue(slide.aoeShapes),
    calibration: slide.aoeCalibration,
    calibrationRefValue: slide.aoeCalibrationRefValue,
    calibrationRefZoom: slide.aoeCalibrationRefZoom,
    zoomLock: slide.aoeZoomLock,
    zoomLockRefCalibration: slide.aoeZoomLockRefCalibration,
    zoomLockRefCamW: slide.aoeZoomLockRefCamW,
    zoomLockRefZoom: slide.aoeZoomLockRefZoom,
    zoomLockRefCamera: slide.aoeZoomLockRefCamera ? { ...slide.aoeZoomLockRefCamera } : null,
  };
}