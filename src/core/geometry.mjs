export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function gridMultiplesInRange(size, minimum, maximum, offset) {
  if (!(size > 0) || !Number.isFinite(size)) return [];

  const normalizedOffset = ((offset % size) + size) % size;
  const values = [];
  const start = Math.ceil((minimum - normalizedOffset) / size) * size + normalizedOffset;
  for (let value = start; value <= maximum; value += size) values.push(value);
  return values;
}

export function pointInConvexPoly(pointX, pointY, points) {
  let sign = 0;
  for (let index = 0; index < points.length; index++) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    const cross = (x2 - x1) * (pointY - y1) - (y2 - y1) * (pointX - x1);
    if (cross === 0) continue;

    const nextSign = cross > 0 ? 1 : -1;
    if (sign === 0) sign = nextSign;
    else if (sign !== nextSign) return false;
  }
  return true;
}

export function distanceToLineSegment(pointX, pointY, x1, y1, x2, y2) {
  const deltaX = x2 - x1;
  const deltaY = y2 - y1;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const rawPosition = lengthSquared === 0
    ? 0
    : ((pointX - x1) * deltaX + (pointY - y1) * deltaY) / lengthSquared;
  const position = clamp(rawPosition, 0, 1);
  return Math.hypot(
    pointX - (x1 + position * deltaX),
    pointY - (y1 + position * deltaY),
  );
}