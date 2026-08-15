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