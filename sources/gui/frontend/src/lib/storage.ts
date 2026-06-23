import type { SidebarMode } from "@/stores/appStore";

const SIDEBAR_COLLAPSED = "dfm.sidebar.collapsed";
const SIDEBAR_MODE = "dfm.sidebar.mode";

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

export function loadSidebarMode(): SidebarMode {
  try {
    const value = localStorage.getItem(SIDEBAR_MODE);
    return value === "history" ? "history" : "project";
  } catch {
    return "project";
  }
}

export function saveSidebarMode(mode: SidebarMode): void {
  try {
    localStorage.setItem(SIDEBAR_MODE, mode);
  } catch {
    // ignore
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

export type SortLocale = "en-US" | "ru";

export function loadSortLocale(repoPath: string): SortLocale {
  try {
    const value = localStorage.getItem(perRepoKey("dfm.preview.sortLocale", repoPath));
    return value === "ru" ? "ru" : "en-US";
  } catch {
    return "en-US";
  }
}

export function saveSortLocale(repoPath: string, locale: SortLocale): void {
  try {
    localStorage.setItem(perRepoKey("dfm.preview.sortLocale", repoPath), locale);
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
