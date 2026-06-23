export const THUMB_SCALE_STEPS = [48, 66, 84, 102, 120, 128] as const;

export type ThumbScalePx = (typeof THUMB_SCALE_STEPS)[number];

export const DEFAULT_THUMB_SCALE: ThumbScalePx = 48;

export function isMaxThumbVisual(px: number): boolean {
  return px >= 102;
}

export function thumbScaleFromSliderValue(index: number): ThumbScalePx {
  const clamped = Math.min(Math.max(index, 0), THUMB_SCALE_STEPS.length - 1);
  return THUMB_SCALE_STEPS[clamped];
}

export function sliderIndexFromThumbScale(px: number): number {
  const exact = THUMB_SCALE_STEPS.indexOf(px as ThumbScalePx);
  if (exact >= 0) return exact;
  let nearest = 0;
  let bestDelta = Math.abs(THUMB_SCALE_STEPS[0] - px);
  for (let i = 1; i < THUMB_SCALE_STEPS.length; i++) {
    const delta = Math.abs(THUMB_SCALE_STEPS[i] - px);
    if (delta < bestDelta) {
      bestDelta = delta;
      nearest = i;
    }
  }
  return nearest;
}

export function gridMinCellSize(thumbPx: number): number {
  return thumbPx + 72;
}
