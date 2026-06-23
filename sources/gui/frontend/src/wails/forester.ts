import { ForesterCall } from "../../wailsjs/go/main/App";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  result?: T;
}

export async function foresterCall<T = unknown>(
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const raw = await ForesterCall(method, JSON.stringify(args));
  const resp = JSON.parse(raw) as ApiResponse<T>;
  if (!resp.ok) {
    throw new Error(resp.error || `Forester API error: ${method}`);
  }
  return resp.result as T;
}

export interface FolderNode {
  name: string;
  path: string;
  item_count: number;
  children: FolderNode[];
}

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  item_count: number;
  size: number;
}

export interface StatusPayload {
  current_branch?: string;
  head_commit?: string;
  staged_new_files?: string[];
  staged_modified_files?: string[];
  staged_deleted_files?: string[];
  unstaged_modified_files?: string[];
  unstaged_deleted_files?: string[];
  untracked_files?: string[];
}

export type VcsFileStatus =
  | "staged-new"
  | "staged-modified"
  | "staged-deleted"
  | "modified"
  | "deleted"
  | "untracked";

const STAGED_PRIORITY: VcsFileStatus[] = [
  "staged-new",
  "staged-modified",
  "staged-deleted",
];

const UNSTAGED_PRIORITY: VcsFileStatus[] = ["modified", "deleted", "untracked"];

const STATUS_LIST_KEYS: Record<VcsFileStatus, keyof StatusPayload> = {
  "staged-new": "staged_new_files",
  "staged-modified": "staged_modified_files",
  "staged-deleted": "staged_deleted_files",
  modified: "unstaged_modified_files",
  deleted: "unstaged_deleted_files",
  untracked: "untracked_files",
};

export function vcsFileStatus(path: string, status: StatusPayload | null): VcsFileStatus | null {
  if (!status) return null;
  for (const kind of STAGED_PRIORITY) {
    const list = status[STATUS_LIST_KEYS[kind]];
    if (Array.isArray(list) && list.includes(path)) return kind;
  }
  for (const kind of UNSTAGED_PRIORITY) {
    const list = status[STATUS_LIST_KEYS[kind]];
    if (Array.isArray(list) && list.includes(path)) return kind;
  }
  return null;
}

export function vcsBadgeLabel(status: VcsFileStatus): string {
  switch (status) {
    case "staged-new":
      return "A";
    case "staged-modified":
    case "modified":
      return "M";
    case "staged-deleted":
    case "deleted":
      return "D";
    case "untracked":
      return "??";
    default:
      return "";
  }
}

export async function openWorkdirFile(path: string): Promise<void> {
  await foresterCall("workdir.open", { path });
}

export function committablePaths(status: StatusPayload): string[] {
  const sets = [
    status.staged_new_files,
    status.staged_modified_files,
    status.staged_deleted_files,
    status.unstaged_modified_files,
    status.unstaged_deleted_files,
    status.untracked_files,
  ];
  const out = new Set<string>();
  for (const list of sets) {
    if (!list) continue;
    for (const p of list) out.add(p);
  }
  return [...out];
}

export function folderHasCommittable(folderPath: string, committable: string[]): boolean {
  if (committable.length === 0) return false;
  return committable.some((filePath) => {
    if (folderPath === "") {
      return !filePath.includes("/");
    }
    return filePath === folderPath || filePath.startsWith(`${folderPath}/`);
  });
}

export async function fetchWorkdirTree(path = "", depth = 1): Promise<FolderNode> {
  return foresterCall<FolderNode>("workdir.tree", { path, depth });
}

export async function fetchWorkdirEntries(path = "", offset = 0, limit = 200) {
  return foresterCall<{
    entries: DirEntry[];
    total: number;
    has_more: boolean;
  }>("workdir.entries", { path, offset, limit });
}

export async function fetchStatus(): Promise<StatusPayload> {
  return foresterCall<StatusPayload>("status.get", {});
}

export interface WorkdirMetadata {
  path: string;
  size: number;
  modified: number;
  mime: string;
  is_dir: boolean;
}

export interface LockEntry {
  file_path: string;
  user: string;
  branch: string;
}

export async function fetchWorkdirMetadata(path: string): Promise<WorkdirMetadata> {
  return foresterCall<WorkdirMetadata>("workdir.metadata", { path });
}

export async function fetchLockList(): Promise<LockEntry[]> {
  const result = await foresterCall<{ locks: LockEntry[] }>("lock.list", {});
  return result.locks ?? [];
}

export async function indexAddFiles(files: string[]): Promise<void> {
  await foresterCall("index.add", { files });
}

export async function createCommit(message: string, author: string): Promise<void> {
  await foresterCall("commit.create", { message, author });
}
