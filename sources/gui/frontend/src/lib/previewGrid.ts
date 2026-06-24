import { gridMinCellSize } from "@/lib/previewScale";

const GRID_GAP_PX = 8;

export function computeColumnCount(containerWidth: number, cellMin: number): number {
  if (containerWidth <= 0) return 1;
  return Math.max(1, Math.floor((containerWidth + GRID_GAP_PX) / (cellMin + GRID_GAP_PX)));
}

export function estimateGridRowHeight(thumbScale: number, hasSubtitle: boolean): number {
  const nameBlock = 36;
  const subtitleBlock = hasSubtitle ? 16 : 0;
  const padding = 16;
  return thumbScale + nameBlock + subtitleBlock + padding + GRID_GAP_PX;
}

export function gridMinCellSizeForScale(thumbScale: number): number {
  return gridMinCellSize(thumbScale);
}
