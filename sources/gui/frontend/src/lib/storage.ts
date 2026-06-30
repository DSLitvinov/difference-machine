const SIDEBAR_COLLAPSED = "dfm.sidebar.collapsed";
const MAX_PERSISTED_EXPANDED_PATHS = 512;

function perRepoKey(base: string, repoPath: string): string {
  return `${base}::${repoPath}`;
}

export function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED) === "true";
  } catch {
    return false;
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED, String(collapsed));
  } catch {
    // ignore quota / private mode
  }
}

export function loadShowChangedOnly(repoPath: string): boolean {
  try {
    return localStorage.getItem(perRepoKey("dfm.sidebar.showChangedOnly", repoPath)) === "true";
  } catch {
    return false;
  }
}

export function saveShowChangedOnly(repoPath: string, value: boolean): void {
  try {
    localStorage.setItem(perRepoKey("dfm.sidebar.showChangedOnly", repoPath), String(value));
  } catch {
    // ignore
  }
}

export function loadSelectedFolderPath(repoPath: string): string {
  try {
    return localStorage.getItem(perRepoKey("dfm.sidebar.selectedFolderPath", repoPath)) ?? "";
  } catch {
    return "";
  }
}

export function saveSelectedFolderPath(repoPath: string, path: string): void {
  try {
    localStorage.setItem(perRepoKey("dfm.sidebar.selectedFolderPath", repoPath), path);
  } catch {
    // ignore
  }
}

export function loadExpandedFolderPaths(repoPath: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(perRepoKey("dfm.sidebar.expandedPaths", repoPath));
    if (!raw) return {};
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return {};

    const expanded: Record<string, boolean> = {};
    for (const path of value) {
      if (typeof path === "string" && path.length > 0) {
        expanded[path] = true;
      }
    }
    return expanded;
  } catch {
    return {};
  }
}

export function saveExpandedFolderPaths(repoPath: string, expandedPaths: Record<string, boolean>): void {
  try {
    const paths = Object.keys(expandedPaths)
      .filter((path) => expandedPaths[path])
      .sort((a, b) => a.localeCompare(b, "en-US"))
      .slice(0, MAX_PERSISTED_EXPANDED_PATHS);
    localStorage.setItem(perRepoKey("dfm.sidebar.expandedPaths", repoPath), JSON.stringify(paths));
  } catch {
    // ignore
  }
}

export type SortLocale = "en-US" | "ru";

/** Preview grid sort: English or Russian file name. */
export type PreviewSortMode = "name-en" | "name-ru";

export function loadSortMode(repoPath: string): PreviewSortMode {
  try {
    const value = localStorage.getItem(perRepoKey("dfm.preview.sortMode", repoPath));
    if (value === "name-en" || value === "name-ru") {
      return value;
    }
    if (value === "type") {
      return "name-en";
    }
    const legacy = localStorage.getItem(perRepoKey("dfm.preview.sortLocale", repoPath));
    return legacy === "ru" ? "name-ru" : "name-en";
  } catch {
    return "name-en";
  }
}

export function saveSortMode(repoPath: string, mode: PreviewSortMode): void {
  try {
    localStorage.setItem(perRepoKey("dfm.preview.sortMode", repoPath), mode);
  } catch {
    // ignore
  }
}

export function loadThumbScale(repoPath: string): number | null {
  try {
    const raw = localStorage.getItem(perRepoKey("dfm.preview.thumbScale", repoPath));
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveThumbScale(repoPath: string, px: number): void {
  try {
    localStorage.setItem(perRepoKey("dfm.preview.thumbScale", repoPath), String(px));
  } catch {
    // ignore
  }
}

export function loadFileHistoryBranch(repoPath: string): string | null {
  try {
    return localStorage.getItem(perRepoKey("dfm.info.fileHistoryBranch", repoPath));
  } catch {
    return null;
  }
}

export function saveFileHistoryBranch(repoPath: string, branch: string): void {
  try {
    localStorage.setItem(perRepoKey("dfm.info.fileHistoryBranch", repoPath), branch);
  } catch {
    // ignore
  }
}

export function loadSelectedCommitHash(repoPath: string): string | null {
  try {
    return localStorage.getItem(perRepoKey("dfm.history.selectedCommitHash", repoPath));
  } catch {
    return null;
  }
}

export function saveSelectedCommitHash(repoPath: string, hash: string | null): void {
  try {
    const key = perRepoKey("dfm.history.selectedCommitHash", repoPath);
    if (!hash) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, hash);
    }
  } catch {
    // ignore
  }
}

const HISTORY_FILES_PANEL_WIDTH = "dfm.history.filesPanelWidth";
const HISTORY_TEXT_LAYOUT = "dfm.history.textLayout";
const HISTORY_IMAGE_LAYOUT = "dfm.history.imageLayout";
const LAYOUT_SIDEBAR_WIDTH = "dfm.layout.sidebarWidth";
const LAYOUT_INFO_WIDTH = "dfm.layout.infoWidth";

export function loadLayoutSidebarWidth(): number | null {
  try {
    const raw = localStorage.getItem(LAYOUT_SIDEBAR_WIDTH);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveLayoutSidebarWidth(width: number): void {
  try {
    localStorage.setItem(LAYOUT_SIDEBAR_WIDTH, String(Math.round(width)));
  } catch {
    // ignore
  }
}

export function loadLayoutInfoWidth(): number | null {
  try {
    const raw = localStorage.getItem(LAYOUT_INFO_WIDTH);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveLayoutInfoWidth(width: number): void {
  try {
    localStorage.setItem(LAYOUT_INFO_WIDTH, String(Math.round(width)));
  } catch {
    // ignore
  }
}

export function loadHistoryFilesPanelWidth(repoPath: string): number | null {
  try {
    const raw = localStorage.getItem(perRepoKey(HISTORY_FILES_PANEL_WIDTH, repoPath));
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveHistoryFilesPanelWidth(repoPath: string, width: number): void {
  try {
    localStorage.setItem(perRepoKey(HISTORY_FILES_PANEL_WIDTH, repoPath), String(Math.round(width)));
  } catch {
    // ignore
  }
}

export type HistoryTextLayout = "unified" | "split";
export type HistoryImageLayout = "2up" | "swipe" | "overlay";

export function loadHistoryTextLayout(repoPath: string): HistoryTextLayout {
  try {
    return localStorage.getItem(perRepoKey(HISTORY_TEXT_LAYOUT, repoPath)) === "split" ? "split" : "unified";
  } catch {
    return "unified";
  }
}

export function saveHistoryTextLayout(repoPath: string, layout: HistoryTextLayout): void {
  try {
    localStorage.setItem(perRepoKey(HISTORY_TEXT_LAYOUT, repoPath), layout);
  } catch {
    // ignore
  }
}

export function loadHistoryImageLayout(repoPath: string): HistoryImageLayout {
  try {
    const raw = localStorage.getItem(perRepoKey(HISTORY_IMAGE_LAYOUT, repoPath));
    if (raw === "overlay") return "overlay";
    if (raw === "swipe" || raw === "split") return "swipe";
    if (raw === "2up") return "2up";
    return "2up";
  } catch {
    return "2up";
  }
}

export function saveHistoryImageLayout(repoPath: string, layout: HistoryImageLayout): void {
  try {
    localStorage.setItem(perRepoKey(HISTORY_IMAGE_LAYOUT, repoPath), layout);
  } catch {
    // ignore
  }
}
