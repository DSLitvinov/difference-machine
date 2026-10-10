import { GRID_GAP, GRID_PAD } from "@/lib/grid";

export type MarqueeRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function marqueeRect(a: { x: number; y: number }, b: { x: number; y: number }): MarqueeRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

export function rectsIntersect(a: MarqueeRect, b: MarqueeRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Tile box in scroll-content coordinates. Matches the virtualized grid. */
export function gridTileRect(index: number, nCols: number, innerWidth: number, rowH: number): MarqueeRect {
  const cols = Math.max(1, nCols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const tileW = (innerWidth - (cols - 1) * GRID_GAP) / cols;
  return {
    x: col * (tileW + GRID_GAP),
    y: GRID_PAD + row * (rowH + GRID_GAP),
    w: Math.max(0, tileW),
    h: rowH,
  };
}

const LIST_ROW_H = 40;
const LIST_GAP = 2;

/** Row box in scroll-content coordinates. Matches the virtualized list. */
export function listRowRect(index: number, width: number): MarqueeRect {
  return {
    x: 0,
    y: GRID_PAD + index * (LIST_ROW_H + LIST_GAP),
    w: Math.max(0, width),
    h: LIST_ROW_H,
  };
}

export function pathsInRects(paths: string[], rect: MarqueeRect, boxAt: (index: number) => MarqueeRect): string[] {
  const hits: string[] = [];
  for (let index = 0; index < paths.length; index += 1) {
    if (rectsIntersect(rect, boxAt(index))) {
      hits.push(paths[index]);
    }
  }
  return hits;
}
