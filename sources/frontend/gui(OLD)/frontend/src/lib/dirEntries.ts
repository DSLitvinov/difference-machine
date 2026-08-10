import type { DirEntry } from "@/wails/forester";

function dirEntryFingerprint(entry: DirEntry): string {
  return `${entry.path}\0${entry.name}\0${entry.is_dir}\0${entry.item_count}\0${entry.size}\0${entry.modified ?? ""}`;
}

export function sameDirEntryList(a: DirEntry[], b: DirEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (dirEntryFingerprint(a[i]) !== dirEntryFingerprint(b[i])) {
      return false;
    }
  }
  return true;
}

export function changedPreviewPaths(prev: DirEntry[], next: DirEntry[]): string[] {
  const prevByPath = new Map(prev.filter((entry) => !entry.is_dir).map((entry) => [entry.path, entry]));
  const changed: string[] = [];
  for (const entry of next) {
    if (entry.is_dir) continue;
    const old = prevByPath.get(entry.path);
    if (!old) continue;
    if (old.modified !== entry.modified || old.size !== entry.size) {
      changed.push(entry.path);
    }
  }
  return changed;
}
