/** Virtual Sidebar / Preview scope: all files in the repository (recursive). */
export const ALL_FILES_PATH = "*";

export function isAllFilesPath(path: string): boolean {
  return path === ALL_FILES_PATH;
}

/** Map legacy persisted root selection to All files. */
export function normalizeSelectedFolderPath(path: string): string {
  return path === "" ? ALL_FILES_PATH : path;
}

export function treeHasExpandedFolders(expandedPaths: Record<string, boolean>): boolean {
  return Object.values(expandedPaths).some(Boolean);
}
