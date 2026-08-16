import { distanceToLineSegment } from '../core/geometry.mjs';

export function hitTestDungeon(segments, x, y) {
  for (let segmentIndex = segments.length - 1; segmentIndex >= 0; segmentIndex--) {
    const segment = segments[segmentIndex];
    for (const stroke of segment.strokes) {
      const radius = stroke.brushSize / 2;
      for (let pointIndex = 0; pointIndex < stroke.points.length; pointIndex++) {
        const point = stroke.points[pointIndex];
        if (Math.hypot(point.x - x, point.y - y) <= radius) return segment;
        if (pointIndex > 0) {
          const previous = stroke.points[pointIndex - 1];
          if (distanceToLineSegment(x, y, previous.x, previous.y, point.x, point.y) <= radius) return segment;
        }
      }
    }
  }
  return null;
}

export function nextDungeonNumber(segments) {
  return segments.reduce((highest, segment) => Math.max(highest, Number(segment.number) || 0), 0) + 1;
}

export function dungeonLabelLayout(segment) {
  let bestBounds = null;
  for (const stroke of segment.strokes) {
    if (!stroke.points.length) continue;
    const radius = stroke.brushSize / 2;
    let minimumX = Infinity;
    let minimumY = Infinity;
    let maximumX = -Infinity;
    let maximumY = -Infinity;
    for (const point of stroke.points) {
      minimumX = Math.min(minimumX, point.x - radius);
      minimumY = Math.min(minimumY, point.y - radius);
      maximumX = Math.max(maximumX, point.x + radius);
      maximumY = Math.max(maximumY, point.y + radius);
    }
    const bounds = {
      minimumX,
      minimumY,
      maximumX,
      maximumY,
      width: maximumX - minimumX,
      height: maximumY - minimumY,
    };
    bounds.area = bounds.width * bounds.height;
    if (!bestBounds || bounds.area > bestBounds.area) bestBounds = bounds;
  }
  if (!bestBounds) return null;

  const { minimumX, minimumY, maximumX, maximumY, width, height } = bestBounds;
  const fullLabel = `#${segment.number || '?'} ${segment.name || ''}`.trim();
  const numberLabel = `#${segment.number || '?'}`;
  const availableWidth = Math.max(1, width - 12);
  const availableHeight = Math.max(1, height - 8);
  const fullSize = Math.min(18, availableHeight, availableWidth / Math.max(1, fullLabel.length * 0.58));
  const useFullLabel = fullSize >= 9;
  const label = useFullLabel ? fullLabel : numberLabel;
  const fontSize = Math.max(8, Math.min(18, availableHeight, availableWidth / Math.max(1, label.length * 0.58)));

  return {
    x: (minimumX + maximumX) / 2,
    y: (minimumY + maximumY) / 2,
    width,
    height,
    label,
    fontSize,
  };
}