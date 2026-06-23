import type { StatusPayload } from "@/wails/forester";

export function isDirtyWorktree(status: StatusPayload | null): boolean {
  if (!status) return false;
  const lists = [
    status.staged_new_files,
    status.staged_modified_files,
    status.staged_deleted_files,
    status.unstaged_modified_files,
    status.unstaged_deleted_files,
    status.untracked_files,
  ];
  return lists.some((list) => Array.isArray(list) && list.length > 0);
}

export function dirtyWorktreeSummary(status: StatusPayload): string[] {
  const lines: string[] = [];
  const modified =
    (status.unstaged_modified_files?.length ?? 0) + (status.staged_modified_files?.length ?? 0);
  const untracked = status.untracked_files?.length ?? 0;
  const staged =
    (status.staged_new_files?.length ?? 0) +
    (status.staged_modified_files?.length ?? 0) +
    (status.staged_deleted_files?.length ?? 0);
  if (modified > 0) lines.push(`• ${modified} modified`);
  if (untracked > 0) lines.push(`• ${untracked} untracked`);
  if (staged > 0) lines.push(`• ${staged} staged`);
  return lines;
}
