export function computeAoeGeometry(shape, pixelsPerFoot) {
  const size = shape.ft * pixelsPerFoot;
  if (shape.type === 'circle') {
    return { kind: 'circle', cx: shape.x, cy: shape.y, r: size };
  }

  if (shape.type === 'square') {
    const half = size / 2;
    const cosine = Math.cos(shape.rotation);
    const sine = Math.sin(shape.rotation);
    const points = [[-half, -half], [half, -half], [half, half], [-half, half]]
      .map(([localX, localY]) => [
        shape.x + localX * cosine - localY * sine,
        shape.y + localX * sine + localY * cosine,
      ]);
    return { kind: 'poly', points };
  }

  const directionX = Math.cos(shape.rotation);
  const directionY = Math.sin(shape.rotation);
  const perpendicularX = -directionY;
  const perpendicularY = directionX;
  const halfWidth = size / 2;
  const baseX = shape.x + directionX * size;
  const baseY = shape.y + directionY * size;
  return {
    kind: 'poly',
    points: [
      [shape.x, shape.y],
      [baseX + perpendicularX * halfWidth, baseY + perpendicularY * halfWidth],
      [baseX - perpendicularX * halfWidth, baseY - perpendicularY * halfWidth],
    ],
  };
}

export function rotationHandlePoint(shape, pixelsPerFoot) {
  const size = shape.ft * pixelsPerFoot;
  const distance = shape.type === 'cone' ? size : size / 2 + 20;
  return {
    x: shape.x + Math.cos(shape.rotation) * distance,
    y: shape.y + Math.sin(shape.rotation) * distance,
  };
}