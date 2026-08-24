import type { StatusSnapshot } from "@/store/app-store";

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
