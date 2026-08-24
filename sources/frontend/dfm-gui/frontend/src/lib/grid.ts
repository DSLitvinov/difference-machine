export const GRID_GAP = 8;
export const GRID_MIN_TRACK = 200;
export const GRID_PAD = 16;

export function columnCount(innerWidth: number): number {
  return Math.max(1, Math.floor((innerWidth + GRID_GAP) / (GRID_MIN_TRACK + GRID_GAP)));
}

export function trackWidth(innerWidth: number, nCols: number): number {
  return (innerWidth - (nCols - 1) * GRID_GAP) / nCols;
}

export function tileRowHeight(track: number): number {
  return track + 42;
}
