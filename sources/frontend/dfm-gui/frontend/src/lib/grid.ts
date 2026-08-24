export const GRID_GAP = 8;
export const GRID_PAD = 16;
export const GRID_TILE_PAD = 8;
export const GRID_PREVIEW_GAP = 8;
export const GRID_LABEL_H = 34;
export const GRID_PREVIEW_DEFAULT = 48;
export const GRID_TRACK_MIN = 106;
export const GRID_TRACK_DEFAULT = GRID_TRACK_MIN;
export const GRID_TRACK_MAX = 360;

export function clampGridTrack(value: number): number {
  return Math.min(GRID_TRACK_MAX, Math.max(GRID_TRACK_MIN, value));
}

export function columnCount(innerWidth: number, minTrack: number = GRID_TRACK_DEFAULT): number {
  const track = clampGridTrack(minTrack);
  return Math.max(1, Math.floor((innerWidth + GRID_GAP) / (track + GRID_GAP)));
}

export function gridPreviewSize(track: number): number {
  return GRID_PREVIEW_DEFAULT + Math.max(0, clampGridTrack(track) - GRID_TRACK_DEFAULT);
}

export function tileRowHeight(track: number): number {
  return GRID_TILE_PAD * 2 + gridPreviewSize(track) + GRID_PREVIEW_GAP + GRID_LABEL_H;
}

export function wheelZoomDelta(event: WheelEvent): number {
  if (event.deltaMode === 1) {
    return event.deltaY * 16;
  }
  if (event.deltaMode === 2) {
    return event.deltaY * 800;
  }
  return event.deltaY;
}
