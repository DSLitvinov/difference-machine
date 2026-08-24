import { fileExtension } from "@/lib/file-kind";
import type { DirEntry } from "@/store/app-store";

export type GridSort = "az" | "ru" | "modified" | "created";
export type GridFilter = string[];

export function folderExtensions(entries: DirEntry[]): string[] {
  const found = new Set<string>();
  for (const entry of entries) {
    if (entry.is_dir) {
      continue;
    }
    const ext = fileExtension(entry.name);
    if (ext) {
      found.add(ext);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

export function inCurrentFolder(path: string, folderPath: string): boolean {
  if (!folderPath) {
    return true;
  }
  return path === folderPath || path.startsWith(`${folderPath}/`);
}

export function matchesFilter(entry: DirEntry, filter: GridFilter): boolean {
  if (filter.length === 0) {
    return true;
  }
  if (entry.is_dir) {
    return false;
  }
  return filter.includes(fileExtension(entry.name));
}

export function sortEntries(entries: DirEntry[], sort: GridSort): DirEntry[] {
  const folders = entries.filter((entry) => entry.is_dir);
  const files = entries.filter((entry) => !entry.is_dir);
  const cmp = (a: DirEntry, b: DirEntry) => {
    if (sort === "az") {
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    }
    if (sort === "ru") {
      return a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
    }
    if (sort === "created") {
      return (b.created ?? 0) - (a.created ?? 0);
    }
    return (b.modified ?? 0) - (a.modified ?? 0);
  };
  return [...folders.sort(cmp), ...files.sort(cmp)];
}

export function applyFolderQuery(entries: DirEntry[], sort: GridSort, filter: GridFilter): DirEntry[] {
  return sortEntries(entries.filter((entry) => matchesFilter(entry, filter)), sort);
}

export function parentRel(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  return slash === -1 ? "" : trimmed.slice(0, slash);
}

export function basenameRel(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function editorLabel(absPath: string): string {
  const normalized = absPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? absPath;
}
