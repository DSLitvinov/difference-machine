import { ForesterCall } from "../../wailsjs/go/main/App";
import { translate } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";

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
    const language = useAppStore.getState().language;
    throw new Error(resp.error || translate(language, "forester.apiError", { method }));
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
  modified?: number;
  created?: number;
}

export interface StatusPayload {
  current_branch?: string;
  head_commit?: string;
  is_detached?: boolean;
  detached_commit?: string;
  staged_new_files?: string[];
  staged_modified_files?: string[];
  staged_deleted_files?: string[];
  unstaged_modified_files?: string[];
  unstaged_deleted_files?: string[];
  untracked_files?: string[];
  renamed_files?: RenamedFileEntry[];
}

export type VcsFileStatus =
  | "staged-new"
  | "staged-modified"
  | "staged-deleted"
  | "renamed"
  | "modified"
  | "deleted"
  | "untracked";

export interface RenamedFileEntry {
  old_path: string;
  path: string;
}

export function vcsFileStatus(path: string, status: StatusPayload | null): VcsFileStatus | null {
  if (!status) return null;
  if (Array.isArray(status.renamed_files)) {
    for (const entry of status.renamed_files) {
      if (entry.path === path) return "renamed";
    }
  }
  if (status.staged_new_files?.includes(path)) return "staged-new";
  if (status.staged_modified_files?.includes(path)) return "staged-modified";
  if (status.staged_deleted_files?.includes(path)) return "staged-deleted";
  if (status.unstaged_modified_files?.includes(path)) return "modified";
  if (status.unstaged_deleted_files?.includes(path)) return "deleted";
  if (status.untracked_files?.includes(path)) return "untracked";
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
    case "renamed":
      return "R";
    case "untracked":
      return "N";
    default:
      return "";
  }
}

export async function openWorkdirFile(path: string, editor?: string): Promise<void> {
  await openWorkdirPath(path, editor);
}

export const HIDDEN_REPO_PATHS = new Set([".dfmignore"]);

export function isHiddenRepoPath(path: string): boolean {
  const normalized = path.replace(/^\.\//, "").replace(/\\/g, "/");
  return HIDDEN_REPO_PATHS.has(normalized);
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
  if (status.renamed_files) {
    for (const entry of status.renamed_files) {
      out.add(entry.path);
    }
  }
  return [...out].filter((p) => !isHiddenRepoPath(p));
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

export async function fetchWorkdirEntriesByPaths(paths: string[]) {
  return foresterCall<{
    entries: DirEntry[];
  }>("workdir.entries_by_paths", { paths });
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
  created?: number;
  width?: number;
  height?: number;
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

export async function acquireLock(filePath: string, user: string): Promise<void> {
  await foresterCall("lock.acquire", {
    file_path: filePath,
    user,
    lock_type: 0,
    expire_hours: 0,
  });
}

export async function releaseLock(filePath: string, user: string): Promise<void> {
  await foresterCall("lock.release", { file_path: filePath, user });
}

export function locksByPath(locks: LockEntry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const lock of locks) {
    if (lock.file_path) {
      out[lock.file_path] = lock.user;
    }
  }
  return out;
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
  commit_hash?: string;
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
  status: "A" | "M" | "D" | "R";
  path: string;
  old_path?: string;
}

export async function fetchDiffNameStatus(to: string, commit: CommitLogEntry) {
  return foresterCall<{ files: DiffFileEntry[] }>("diff.name_status", {
    to,
    ...diffFromArgs(commit),
  });
}

export async function fetchDiffNameStatusBetween(from: string, to: string) {
  return foresterCall<{ files: DiffFileEntry[] }>("diff.name_status", { from, to });
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

export async function createBranch(name: string, commitHash = ""): Promise<void> {
  await foresterCall("branch.create", { name, commit_hash: commitHash });
}

export async function deleteBranch(name: string): Promise<void> {
  await foresterCall("branch.delete", { name });
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

export async function restoreVersion(commitHash: string): Promise<void> {
  await foresterCall("restore.version", { commit_hash: commitHash });
}

export async function revertCommit(commitHash: string): Promise<void> {
  await foresterCall("commit.revert", { commit_hash: commitHash });
}

export type CommitResetMode = "soft" | "mixed" | "hard";

export async function resetCommit(commitHash: string, mode: CommitResetMode): Promise<void> {
  await foresterCall("commit.reset", { commit_hash: commitHash, mode });
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

export async function openWorkdirPath(path: string, editor?: string): Promise<void> {
  await foresterCall("workdir.open", editor ? { path, editor } : { path });
}

export async function renameWorkdirFile(path: string, newName: string): Promise<string> {
  const result = await foresterCall<{ new_path: string }>("workdir.rename", {
    path,
    new_name: newName,
  });
  return result.new_path;
}

export async function deleteWorkdirFile(path: string): Promise<void> {
  await foresterCall("workdir.delete", { path });
}

export interface MergeConflictEntry {
  path: string;
  base_hash?: string;
  our_hash?: string;
  their_hash?: string;
  kind: "text" | "binary";
}

export interface MergeStatusPayload {
  in_progress: boolean;
  branch?: string;
  current_head?: string;
  target_head?: string;
  from?: string;
  to?: string;
  has_conflicts?: boolean;
  conflicts?: MergeConflictEntry[];
}

export async function fetchMergeStatus(): Promise<MergeStatusPayload> {
  return foresterCall<MergeStatusPayload>("merge.status", {});
}

export async function mergeStart(
  branch: string,
  options?: { no_ff?: boolean; no_commit?: boolean },
): Promise<{ success: boolean; hash: string; in_progress?: boolean; has_conflicts?: boolean }> {
  return foresterCall("merge.start", {
    branch,
    no_ff: options?.no_ff ?? true,
    no_commit: options?.no_commit ?? false,
  });
}

export async function mergeContinue(): Promise<{
  success: boolean;
  hash: string;
  in_progress?: boolean;
  has_conflicts?: boolean;
}> {
  return foresterCall("merge.continue", {});
}

export async function mergeAbort(): Promise<void> {
  await foresterCall("merge.abort", {});
}

export interface MergeObjectEntry {
  object_name: string;
  object_type?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export async function fetchObjectsByFile(path: string, commitHash: string) {
  return foresterCall<{ objects: MergeObjectEntry[] }>("object.list_by_file", {
    file_path: path,
    commit_hash: commitHash,
  });
}
