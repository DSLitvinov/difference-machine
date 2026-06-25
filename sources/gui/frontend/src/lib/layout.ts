export const RAIL_WIDTH = 48;
export const SIDEBAR_COLUMN_MIN = 334;
export const SIDEBAR_MAIN_MIN = SIDEBAR_COLUMN_MIN - RAIL_WIDTH;
export const PREVIEW_MIN = 747;
export const INFO_MIN = 354;
export const MIN_WINDOW_HEIGHT = 720;
export const MIN_WINDOW_PROJECT = SIDEBAR_COLUMN_MIN + PREVIEW_MIN + INFO_MIN;
export const MIN_WINDOW_HISTORY = SIDEBAR_COLUMN_MIN + PREVIEW_MIN;
export const MIN_WINDOW_PROJECT_COLLAPSED = RAIL_WIDTH + PREVIEW_MIN + INFO_MIN;
export const MIN_WINDOW_HISTORY_COLLAPSED = RAIL_WIDTH + PREVIEW_MIN;

export function clamp(width: number, min: number, max: number): number {
  return Math.min(Math.max(width, min), Math.max(min, max));
}

export function projectLayoutBounds(clientWidth: number) {
  return {
    sidebarColumn: {
      min: SIDEBAR_COLUMN_MIN,
      max: clientWidth - PREVIEW_MIN - INFO_MIN,
    },
    preview: {
      min: PREVIEW_MIN,
      max: clientWidth - SIDEBAR_COLUMN_MIN - INFO_MIN,
    },
    info: {
      min: INFO_MIN,
      max: clientWidth - SIDEBAR_COLUMN_MIN - PREVIEW_MIN,
    },
  };
}

export function historyLayoutBounds(clientWidth: number) {
  return {
    sidebarColumn: {
      min: SIDEBAR_COLUMN_MIN,
      max: clientWidth - PREVIEW_MIN,
    },
    preview: {
      min: PREVIEW_MIN,
      max: clientWidth - SIDEBAR_COLUMN_MIN,
    },
  };
}

export function normalizeProjectLayout(
  clientWidth: number,
  sidebarColumnWidth: number,
  infoWidth: number,
): { sidebarColumnWidth: number; infoWidth: number; previewWidth: number } {
  const bounds = projectLayoutBounds(clientWidth);
  let sidebar = clamp(sidebarColumnWidth, bounds.sidebarColumn.min, bounds.sidebarColumn.max);
  let info = clamp(infoWidth, bounds.info.min, bounds.info.max);
  let preview = clientWidth - sidebar - info;

  if (preview < PREVIEW_MIN) {
    const deficit = PREVIEW_MIN - preview;
    const infoShrink = Math.min(deficit, info - bounds.info.min);
    info -= infoShrink;
    preview = clientWidth - sidebar - info;
    if (preview < PREVIEW_MIN) {
      sidebar = clamp(clientWidth - info - PREVIEW_MIN, bounds.sidebarColumn.min, bounds.sidebarColumn.max);
      preview = clientWidth - sidebar - info;
    }
  }

  return { sidebarColumnWidth: sidebar, infoWidth: info, previewWidth: preview };
}

export function normalizeHistoryLayout(
  clientWidth: number,
  sidebarColumnWidth: number,
): { sidebarColumnWidth: number; previewWidth: number } {
  const bounds = historyLayoutBounds(clientWidth);
  let sidebar = clamp(sidebarColumnWidth, bounds.sidebarColumn.min, bounds.sidebarColumn.max);
  let preview = clientWidth - sidebar;

  if (preview < PREVIEW_MIN) {
    sidebar = clamp(clientWidth - PREVIEW_MIN, bounds.sidebarColumn.min, bounds.sidebarColumn.max);
    preview = clientWidth - sidebar;
  }

  return { sidebarColumnWidth: sidebar, previewWidth: preview };
}

export function normalizeCollapsedProjectLayout(
  clientWidth: number,
  infoWidth: number,
): { infoWidth: number; previewWidth: number } {
  const maxInfo = clientWidth - RAIL_WIDTH - PREVIEW_MIN;
  const info = clamp(infoWidth, INFO_MIN, maxInfo);
  return {
    infoWidth: info,
    previewWidth: clientWidth - RAIL_WIDTH - info,
  };
}

export function normalizeCollapsedHistoryLayout(clientWidth: number): { previewWidth: number } {
  return {
    previewWidth: clientWidth - RAIL_WIDTH,
  };
}
