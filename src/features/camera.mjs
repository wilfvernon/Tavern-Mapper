import { clamp } from '../core/geometry.mjs';

export function hitTestCamera(camera, x, y, scale = 1, handleSize = 14) {
  const hitRadius = (handleSize / 2 + 6) * scale;
  const corners = {
    nw: [camera.x, camera.y],
    ne: [camera.x + camera.w, camera.y],
    sw: [camera.x, camera.y + camera.h],
    se: [camera.x + camera.w, camera.y + camera.h],
  };

  for (const [kind, [cornerX, cornerY]] of Object.entries(corners)) {
    if (Math.hypot(cornerX - x, cornerY - y) < hitRadius) return kind;
  }
  return x >= camera.x && x <= camera.x + camera.w && y >= camera.y && y <= camera.y + camera.h
    ? 'move'
    : null;
}

export function cameraCursorFor(kind) {
  return {
    move: 'move',
    nw: 'nwse-resize',
    se: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
  }[kind] || 'crosshair';
}

export function applyCameraDrag(camera, mapWidth, mapHeight, kind, deltaX, deltaY) {
  const aspect = mapWidth / mapHeight;
  const minimumWidth = mapWidth * 0.05;

  if (kind === 'move') {
    camera.x = clamp(camera.x + deltaX, 0, mapWidth - camera.w);
    camera.y = clamp(camera.y + deltaY, 0, mapHeight - camera.h);
    return camera;
  }

  let anchorX;
  let anchorY;
  let width;
  if (kind === 'nw') { anchorX = camera.x + camera.w; anchorY = camera.y + camera.h; width = camera.w - deltaX; }
  if (kind === 'ne') { anchorX = camera.x; anchorY = camera.y + camera.h; width = camera.w + deltaX; }
  if (kind === 'sw') { anchorX = camera.x + camera.w; anchorY = camera.y; width = camera.w - deltaX; }
  if (kind === 'se') { anchorX = camera.x; anchorY = camera.y; width = camera.w + deltaX; }
  if (width === undefined) return camera;

  width = clamp(width, minimumWidth, mapWidth);
  const height = width / aspect;
  if (kind === 'nw') { camera.x = anchorX - width; camera.y = anchorY - height; }
  if (kind === 'ne') { camera.x = anchorX; camera.y = anchorY - height; }
  if (kind === 'sw') { camera.x = anchorX - width; camera.y = anchorY; }
  if (kind === 'se') { camera.x = anchorX; camera.y = anchorY; }

  camera.w = width;
  camera.h = height;
  camera.x = clamp(camera.x, 0, mapWidth - camera.w);
  camera.y = clamp(camera.y, 0, mapHeight - camera.h);
  return camera;
}

export function zoomCameraAt(camera, mapWidth, mapHeight, cursorX, cursorY, factor) {
  const aspect = mapWidth / mapHeight;
  const minimumWidth = mapWidth * 0.05;
  const width = clamp(camera.w * factor, minimumWidth, mapWidth);
  const height = width / aspect;

  camera.x = cursorX - (cursorX - camera.x) * (width / camera.w);
  camera.y = cursorY - (cursorY - camera.y) * (height / camera.h);
  camera.w = width;
  camera.h = height;
  camera.x = clamp(camera.x, 0, mapWidth - camera.w);
  camera.y = clamp(camera.y, 0, mapHeight - camera.h);
  return camera;
}