export const GRID_GAP = 8;
export const GRID_TRACK_DEFAULT = 200;
export const GRID_TRACK_MIN = 106;
export const GRID_TRACK_MAX = 360;
export const GRID_PAD = 16;

export function clampGridTrack(value: number): number {
  return Math.min(GRID_TRACK_MAX, Math.max(GRID_TRACK_MIN, value));
}

export function columnCount(innerWidth: number, minTrack: number = GRID_TRACK_DEFAULT): number {
  const track = clampGridTrack(minTrack);
  return Math.max(1, Math.floor((innerWidth + GRID_GAP) / (track + GRID_GAP)));
}

export function trackWidth(innerWidth: number, nCols: number): number {
  return (innerWidth - (nCols - 1) * GRID_GAP) / nCols;
}

export function tileRowHeight(track: number): number {
  return track + 42;
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
