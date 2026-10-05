import { parentRel } from "@/lib/folder-query";
import type { DirEntry, StatusSnapshot } from "@/store/app-store";

export type ChangeCounts = {
  append: number;
  new: number;
  modified: number;
  deleted: number;
};

export function changeCounts(status: StatusSnapshot | null): ChangeCounts {
  if (!status) {
    return { append: 0, new: 0, modified: 0, deleted: 0 };
  }
  return {
    append: status.staged_new_files?.length ?? 0,
    new: status.untracked_files?.length ?? 0,
    modified: (status.staged_modified_files?.length ?? 0) + (status.unstaged_modified_files?.length ?? 0),
    deleted: (status.staged_deleted_files?.length ?? 0) + (status.unstaged_deleted_files?.length ?? 0),
  };
}

export function isDirty(status: StatusSnapshot | null): boolean {
  const counts = changeCounts(status);
  return counts.append + counts.new + counts.modified + counts.deleted > 0 || (status?.renamed_files?.length ?? 0) > 0;
}

export function dirtyPaths(status: StatusSnapshot | null): string[] {
  if (!status) {
    return [];
  }
  const paths = [
    ...(status.staged_new_files ?? []),
    ...(status.staged_modified_files ?? []),
    ...(status.unstaged_modified_files ?? []),
    ...(status.untracked_files ?? []),
    ...(status.staged_deleted_files ?? []),
    ...(status.unstaged_deleted_files ?? []),
    ...(status.renamed_files ?? []).flatMap((item) => [item.path, item.old_path].filter((path) => path)),
  ];
  return [...new Set(paths)];
}

export type LetterStatus = "appended" | "modified" | "new" | "delete" | "move" | "rename";

/** Same parent folder means a rename; any folder change counts as a move. */
function moveOrRename(oldPath: string | undefined, path: string): LetterStatus {
  return oldPath !== undefined && parentRel(oldPath) === parentRel(path) ? "rename" : "move";
}

export function letterFromDiffStatus(status: string, path = "", oldPath?: string): LetterStatus | null {
  if (status === "A") {
    return "appended";
  }
  if (status === "M") {
    return "modified";
  }
  if (status === "D") {
    return "delete";
  }
  if (status === "R") {
    return moveOrRename(oldPath, path);
  }
  return null;
}

export function deletedPaths(status: StatusSnapshot | null): string[] {
  if (!status) {
    return [];
  }
  return [...new Set([...(status.staged_deleted_files ?? []), ...(status.unstaged_deleted_files ?? [])])];
}

export function isMissingPath(path: string, status: StatusSnapshot | null, entries?: DirEntry[]): boolean {
  if (!path) {
    return false;
  }
  if (entries?.some((entry) => entry.path === path && entry.missing)) {
    return true;
  }
  if (deletedPaths(status).includes(path)) {
    return true;
  }
  return Boolean(status?.renamed_files?.some((item) => item.old_path === path));
}

export function isStagedPath(path: string, status: StatusSnapshot | null): boolean {
  if (!path || !status) {
    return false;
  }
  return Boolean(
    status.staged_new_files?.includes(path) ||
      status.staged_modified_files?.includes(path) ||
      status.staged_deleted_files?.includes(path),
  );
}

export function letterStatus(path: string, status: StatusSnapshot | null): LetterStatus | null {
  if (!status) {
    return null;
  }
  const renamed = status.renamed_files?.find((item) => item.path === path || item.old_path === path);
  if (renamed) {
    return moveOrRename(renamed.old_path, renamed.path);
  }
  if (status.staged_new_files?.includes(path)) {
    return "appended";
  }
  if (status.untracked_files?.includes(path)) {
    return "new";
  }
  if (status.staged_modified_files?.includes(path) || status.unstaged_modified_files?.includes(path)) {
    return "modified";
  }
  if (status.staged_deleted_files?.includes(path) || status.unstaged_deleted_files?.includes(path)) {
    return "delete";
  }
  return null;
}
