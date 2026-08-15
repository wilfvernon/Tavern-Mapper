import { gridMultiplesInRange } from '../core/geometry.mjs';
import { computeAoeGeometry, rotationHandlePoint } from '../features/aoe.mjs';

function drawAoeGeometry(context, geometry, color, transform, scale, dashed) {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = 2;
  if (dashed) context.setLineDash([6, 5]);
  context.beginPath();
  if (geometry.kind === 'circle') {
    const [centerX, centerY] = transform(geometry.cx, geometry.cy);
    context.arc(centerX, centerY, geometry.r * scale, 0, Math.PI * 2);
  } else {
    geometry.points.forEach(([pointX, pointY], index) => {
      const [screenX, screenY] = transform(pointX, pointY);
      if (index === 0) context.moveTo(screenX, screenY);
      else context.lineTo(screenX, screenY);
    });
    context.closePath();
  }
  context.globalAlpha = dashed ? 0.15 : 0.30;
  context.fill();
  context.globalAlpha = dashed ? 0.55 : 0.85;
  context.stroke();
  context.restore();
}

export function drawControlAoe(context, slide, selectedShapeId, pixelsPerFoot) {
  const identity = (x, y) => [x, y];
  slide.aoeShapes.forEach((shape) => {
    const geometry = computeAoeGeometry(shape, pixelsPerFoot);
    drawAoeGeometry(context, geometry, shape.color, identity, 1, shape.visible === false);
    if (shape.id !== selectedShapeId) return;

    context.save();
    context.strokeStyle = '#7c9cff';
    context.lineWidth = 2;
    context.setLineDash([4, 3]);
    context.beginPath();
    context.arc(shape.x, shape.y, 10, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    if (shape.type !== 'square' && shape.type !== 'cone') return;
    const handle = rotationHandlePoint(shape, pixelsPerFoot);
    context.save();
    context.strokeStyle = '#7c9cff';
    context.lineWidth = 2;
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(shape.x, shape.y);
    context.lineTo(handle.x, handle.y);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(handle.x, handle.y, 7, 0, Math.PI * 2);
    context.fillStyle = '#7c9cff';
    context.fill();
    context.strokeStyle = '#0a0b0e';
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
  });
}

export function drawDisplayAoe(context, slide, camera, x, y, scale, pixelsPerFoot) {
  const transform = (pointX, pointY) => [x + (pointX - camera.x) * scale, y + (pointY - camera.y) * scale];
  slide.aoeShapes.forEach((shape) => {
    if (shape.visible === false) return;
    const geometry = computeAoeGeometry(shape, pixelsPerFoot);
    drawAoeGeometry(context, geometry, shape.color, transform, scale, false);
  });
}

export function drawControlGrid(context, slide, color) {
  if (!slide.grid.enabled) return;
  const xs = gridMultiplesInRange(slide.grid.size, 0, slide.mapCanvas.width, slide.grid.offsetX);
  const ys = gridMultiplesInRange(slide.grid.size, 0, slide.mapCanvas.height, slide.grid.offsetY);
  context.save();
  context.globalAlpha = typeof slide.grid.opacity === 'number' ? slide.grid.opacity : 1;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  xs.forEach(x => { context.moveTo(x, 0); context.lineTo(x, slide.mapCanvas.height); });
  ys.forEach(y => { context.moveTo(0, y); context.lineTo(slide.mapCanvas.width, y); });
  context.stroke();
  context.restore();
}

export function drawDisplayGrid(context, slide, camera, x, y, width, height, scale, color) {
  if (!slide.grid.enabled) return;
  const xs = gridMultiplesInRange(slide.grid.size, camera.x, camera.x + camera.w, slide.grid.offsetX);
  const ys = gridMultiplesInRange(slide.grid.size, camera.y, camera.y + camera.h, slide.grid.offsetY);
  context.save();
  context.globalAlpha = typeof slide.grid.opacity === 'number' ? slide.grid.opacity : 1;
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, 2 * scale);
  context.beginPath();
  xs.forEach(gridX => {
    const screenX = x + (gridX - camera.x) * scale;
    context.moveTo(screenX, y);
    context.lineTo(screenX, y + height);
  });
  ys.forEach(gridY => {
    const screenY = y + (gridY - camera.y) * scale;
    context.moveTo(x, screenY);
    context.lineTo(x + width, screenY);
  });
  context.stroke();
  context.restore();
}

export function drawMarkerShape(context, shape, centerX, centerY, radius, color) {
  const dark = '#0a0b0e';
  context.save();
  context.lineJoin = 'round';
  if (shape === 'circle') {
    context.beginPath(); context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = color; context.fill();
    context.lineWidth = 2; context.strokeStyle = dark; context.stroke();
  } else if (shape === 'square') {
    context.beginPath(); context.rect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    context.fillStyle = color; context.fill();
    context.lineWidth = 2; context.strokeStyle = dark; context.stroke();
  } else if (shape === 'triangle') {
    context.beginPath();
    context.moveTo(centerX, centerY - radius);
    context.lineTo(centerX + radius * 0.95, centerY + radius * 0.8);
    context.lineTo(centerX - radius * 0.95, centerY + radius * 0.8);
    context.closePath();
    context.fillStyle = color; context.fill();
    context.lineWidth = 2; context.strokeStyle = dark; context.stroke();
  } else if (shape === 'star') {
    const innerRadius = radius * 0.45;
    let rotation = -Math.PI / 2;
    const step = Math.PI / 5;
    context.beginPath();
    context.moveTo(centerX + Math.cos(rotation) * radius, centerY + Math.sin(rotation) * radius);
    for (let index = 0; index < 5; index++) {
      rotation += step;
      context.lineTo(centerX + Math.cos(rotation) * innerRadius, centerY + Math.sin(rotation) * innerRadius);
      rotation += step;
      context.lineTo(centerX + Math.cos(rotation) * radius, centerY + Math.sin(rotation) * radius);
    }
    context.closePath();
    context.fillStyle = color; context.fill();
    context.lineWidth = 2; context.strokeStyle = dark; context.stroke();
  } else if (shape === 'skull') {
    context.beginPath(); context.arc(centerX, centerY - radius * 0.15, radius * 0.85, 0, Math.PI * 2);
    context.fillStyle = color; context.fill();
    context.lineWidth = 2; context.strokeStyle = dark; context.stroke();
    context.beginPath(); context.rect(centerX - radius * 0.55, centerY + radius * 0.35, radius * 1.1, radius * 0.5);
    context.fillStyle = color; context.fill(); context.strokeStyle = dark; context.stroke();
    context.fillStyle = dark;
    context.beginPath(); context.arc(centerX - radius * 0.35, centerY - radius * 0.2, radius * 0.22, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(centerX + radius * 0.35, centerY - radius * 0.2, radius * 0.22, 0, Math.PI * 2); context.fill();
    context.beginPath();
    context.moveTo(centerX, centerY - radius * 0.05);
    context.lineTo(centerX - radius * 0.12, centerY + radius * 0.22);
    context.lineTo(centerX + radius * 0.12, centerY + radius * 0.22);
    context.closePath(); context.fill();
  } else if (shape === 'chest') {
    context.beginPath(); context.rect(centerX - radius * 0.9, centerY - radius * 0.1, radius * 1.8, radius);
    context.fillStyle = color; context.fill();
    context.lineWidth = 2; context.strokeStyle = dark; context.stroke();
    context.beginPath();
    context.moveTo(centerX - radius * 0.9, centerY - radius * 0.1);
    context.quadraticCurveTo(centerX, centerY - radius * 0.95, centerX + radius * 0.9, centerY - radius * 0.1);
    context.closePath();
    context.fillStyle = color; context.fill(); context.strokeStyle = dark; context.stroke();
    context.fillStyle = dark;
    context.beginPath(); context.rect(centerX - radius * 0.15, centerY - radius * 0.15, radius * 0.3, radius * 0.35); context.fill();
  } else {
    context.lineCap = 'round';
    context.lineWidth = 7; context.strokeStyle = dark;
    context.beginPath();
    context.moveTo(centerX - radius, centerY - radius); context.lineTo(centerX + radius, centerY + radius);
    context.moveTo(centerX + radius, centerY - radius); context.lineTo(centerX - radius, centerY + radius);
    context.stroke();
    context.lineWidth = 4; context.strokeStyle = color;
    context.beginPath();
    context.moveTo(centerX - radius, centerY - radius); context.lineTo(centerX + radius, centerY + radius);
    context.moveTo(centerX + radius, centerY - radius); context.lineTo(centerX - radius, centerY + radius);
    context.stroke();
  }
  context.restore();
}

export function drawMarkers(context, markers, selectedMarkerId) {
  markers.forEach((marker) => {
    const radius = 12;
    if (marker.id === selectedMarkerId) {
      context.save();
      context.strokeStyle = '#7c9cff';
      context.lineWidth = 2;
      context.setLineDash([4, 3]);
      context.beginPath();
      context.arc(marker.x, marker.y, radius + 7, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    drawMarkerShape(context, marker.shape || 'x', marker.x, marker.y, radius, marker.color);
    if (marker.label) {
      context.save();
      context.font = '13px -apple-system, "Segoe UI", Roboto, sans-serif';
      const textWidth = context.measureText(marker.label).width;
      context.fillStyle = 'rgba(10,11,14,0.85)';
      context.fillRect(marker.x + radius + 4, marker.y - 10, textWidth + 10, 20);
      context.fillStyle = '#ffffff';
      context.fillText(marker.label, marker.x + radius + 9, marker.y + 4);
      context.restore();
    }
  });
}

export function drawDungeon(context, segments, activeSegmentId) {
  segments.forEach((segment) => {
    const active = segment.id === activeSegmentId;
    context.save();
    context.globalAlpha = active ? 0.45 : 0.28;
    context.strokeStyle = segment.color;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    segment.strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      context.lineWidth = stroke.brushSize;
      context.beginPath();
      if (stroke.points.length === 1) {
        context.arc(stroke.points[0].x, stroke.points[0].y, stroke.brushSize / 2, 0, Math.PI * 2);
        context.fillStyle = segment.color;
        context.fill();
      } else {
        context.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.forEach(point => context.lineTo(point.x, point.y));
        context.stroke();
      }
    });
    context.restore();

    if (!active) return;
    context.save();
    context.globalAlpha = 0.9;
    context.strokeStyle = segment.color;
    context.lineWidth = 2;
    segment.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.forEach(point => context.lineTo(point.x, point.y));
      context.stroke();
    });
    context.restore();
  });
}

export function paintFogStroke(context, startX, startY, endX, endY, brushSize, revealing, softEdge) {
  const radius = brushSize / 2;
  const distance = Math.hypot(endX - startX, endY - startY);
  const step = Math.max(2, brushSize / 6);
  const steps = Math.max(1, Math.floor(distance / step));
  context.globalCompositeOperation = revealing ? 'destination-out' : 'source-over';

  for (let index = 0; index <= steps; index++) {
    const position = index / steps;
    const x = startX + (endX - startX) * position;
    const y = startY + (endY - startY) * position;
    if (softEdge) {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.9)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
    } else {
      context.fillStyle = '#000000';
    }
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}
