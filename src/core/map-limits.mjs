export const MAX_MAP_DIMENSION = 6144;
export const MAX_CONTROL_PREVIEW_DIMENSION = 2400;

export function constrainedMapSize(width, height, maximum = MAX_MAP_DIMENSION) {
  const scale = Math.min(1, maximum / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    scaled: scale < 1,
  };
}