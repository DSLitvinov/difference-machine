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
  await openWorkdirPath(path);
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

export function committableFilesInSubtree(folderPath: string, committable: string[]): string[] {
  if (folderPath === "") {
    return [...committable];
  }
  const prefix = `${folderPath}/`;
  return committable.filter((filePath) => filePath.startsWith(prefix));
}

export function folderHasCommittable(folderPath: string, committable: string[]): boolean {
  return committableFilesInSubtree(folderPath, committable).length > 0;
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

export async function fetchWorkdirSearch(query: string, limit = 200) {
  return foresterCall<{
    entries: DirEntry[];
    total: number;
    capped: boolean;
  }>("workdir.search", { query, limit });
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

export type WorkdirThumbnailKind = "image" | "text" | "placeholder";

export interface WorkdirThumbnail {
  kind: WorkdirThumbnailKind;
  mime: string;
  content_base64?: string;
  text_preview?: string;
}

export async function fetchWorkdirThumbnail(path: string): Promise<WorkdirThumbnail> {
  return foresterCall<WorkdirThumbnail>("workdir.thumbnail", { path });
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

export interface CommitLogEntry {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  parent_hash?: string;
  parent_hashes?: string[];
}

export interface BranchEntry {
  name: string;
  is_current: boolean;
}

export async function fetchFileLog(branch: string, path: string, maxCount = 100) {
  return foresterCall<{
    commits: CommitLogEntry[];
    capped: boolean;
    filtered: boolean;
  }>("log.get", { branch, path, max_count: maxCount });
}

export async function fetchBranchLog(branch: string, maxCount = 100) {
  return foresterCall<{
    commits: CommitLogEntry[];
    capped: boolean;
    filtered: boolean;
  }>("log.get", { branch, max_count: maxCount });
}

export function firstParentHash(commit: CommitLogEntry): string | null {
  if (commit.parent_hashes?.length) return commit.parent_hashes[0] ?? null;
  if (commit.parent_hash) return commit.parent_hash;
  return null;
}

export function diffFromArgs(commit: CommitLogEntry): Record<string, unknown> {
  const parent = firstParentHash(commit);
  if (!parent) return { from: null };
  return {};
}

export interface DiffFileEntry {
  status: "A" | "M" | "D";
  path: string;
}

export async function fetchDiffNameStatus(to: string, commit: CommitLogEntry) {
  return foresterCall<{ files: DiffFileEntry[] }>("diff.name_status", {
    to,
    ...diffFromArgs(commit),
  });
}

export async function fetchDiffStat(to: string, commit: CommitLogEntry) {
  return foresterCall<{
    files_changed: number;
    insertions: number;
    deletions: number;
  }>("diff.stat", { to, ...diffFromArgs(commit) });
}

export async function fetchDiffText(to: string, commit: CommitLogEntry, path: string) {
  return foresterCall<{
    content: string;
    format: string;
    is_binary: boolean;
  }>("diff.text", { to, path, unified: true, ...diffFromArgs(commit) });
}

export async function switchBranch(target: string, autoStash = false): Promise<void> {
  await foresterCall("repo.switch", { target, auto_stash: autoStash });
}

export interface CommitDetail extends CommitLogEntry {
  screenshot_path?: string;
  screenshot_base64?: string;
}

export async function fetchCommit(hash: string): Promise<CommitDetail> {
  return foresterCall<CommitDetail>("commit.get", { hash });
}

export async function fetchBlob(commit: string, path: string) {
  return foresterCall<{ content_base64: string; mime: string; size: number }>("blob.get", {
    commit,
    path,
  });
}

export function base64ToObjectUrl(base64: string, mime: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime || "application/octet-stream" }));
}

export async function openCommitFile(commitHash: string, filePath: string): Promise<void> {
  await compareExtract(commitHash);
  await foresterCall("workdir.open", { path: `.DFM/tmp_review/${filePath}` });
}

export async function fetchBranchList(): Promise<BranchEntry[]> {
  const result = await foresterCall<{ branches: BranchEntry[] }>("branch.list", {});
  return result.branches ?? [];
}

export async function restoreFile(commitHash: string, paths: string[]): Promise<void> {
  await foresterCall("restore.file", { commit_hash: commitHash, paths });
}

export async function compareExtract(commitHash: string): Promise<string | null> {
  const result = await foresterCall<{ success: boolean; path?: string }>("compare.extract", {
    commit_hash: commitHash,
  });
  return result.path ?? null;
}

export async function compareCleanup(commitHash: string): Promise<void> {
  await foresterCall("compare.extract", {
    commit_hash: commitHash,
    cleanup: true,
  });
}

export async function openWorkdirPath(path: string): Promise<void> {
  await foresterCall("workdir.open", { path });
}
