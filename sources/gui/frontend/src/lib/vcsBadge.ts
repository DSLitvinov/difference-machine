import type { DiffFileEntry, VcsFileStatus } from "@/wails/forester";

/** Shared with History changed-file list — design-tokens.md §3.5 */
export const STATUS_BADGE_CLASS = {
  A: "bg-emerald-600 text-white",
  M: "bg-amber-500 text-white",
  D: "bg-destructive text-destructive-foreground",
  untracked: "bg-blue-600 text-white",
} as const;

export function diffStatusBadgeClass(status: DiffFileEntry["status"]): string {
  return STATUS_BADGE_CLASS[status];
}

export function vcsStatusBadgeClass(status: VcsFileStatus): string {
  switch (status) {
    case "staged-new":
      return STATUS_BADGE_CLASS.A;
    case "staged-modified":
    case "modified":
      return STATUS_BADGE_CLASS.M;
    case "staged-deleted":
    case "deleted":
      return STATUS_BADGE_CLASS.D;
    case "untracked":
      return STATUS_BADGE_CLASS.untracked;
    default:
      return "";
  }
}
