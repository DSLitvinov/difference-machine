/** Virtual Sidebar / Preview scope: all files in the repository (recursive). */
export const ALL_FILES_PATH = "*";

export function isAllFilesPath(path: string): boolean {
  return path === ALL_FILES_PATH;
}

/** Repo root folder — immediate children in Content Preview. */
export function isRootFolderPath(path: string): boolean {
  return path === "";
}

export function normalizeSelectedFolderPath(path: string): string {
  return path;
}

export function treeHasExpandedFolders(expandedPaths: Record<string, boolean>): boolean {
  return Object.values(expandedPaths).some(Boolean);
}
