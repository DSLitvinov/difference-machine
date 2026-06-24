import {
  AddKnownRepo,
  GetCurrentRepoPath,
  GetKnownRepos,
  GetRepoUser,
  InitRepository,
  InitRepositoryWithOptions,
  IsForesterRepository,
  OpenRepo,
  PickRepositoryFolder,
} from "../../wailsjs/go/main/App";

export const NOT_FORESTER_REPOSITORY_ERROR = "not a Forester repository";

export interface RepoState {
  repoPath: string;
  repoName: string;
  status: Record<string, unknown>;
}

export interface StatusPayload {
  current_branch?: string;
}

function parseRepoState(raw: {
  repoPath: string;
  repoName: string;
  status: unknown;
}): RepoState {
  let status: Record<string, unknown> = {};
  if (typeof raw.status === "string") {
    status = JSON.parse(raw.status) as Record<string, unknown>;
  } else if (raw.status && typeof raw.status === "object") {
    status = raw.status as Record<string, unknown>;
  }
  return {
    repoPath: raw.repoPath,
    repoName: raw.repoName,
    status,
  };
}

export async function fetchKnownRepos(): Promise<string[]> {
  return GetKnownRepos();
}

export async function fetchCurrentRepoPath(): Promise<string> {
  return GetCurrentRepoPath();
}

export async function openRepository(path: string) {
  const raw = await OpenRepo(path);
  return parseRepoState(raw);
}

export async function addRepository(path: string) {
  const raw = await AddKnownRepo(path);
  return parseRepoState(raw);
}

export async function checkIsForesterRepository(path: string): Promise<boolean> {
  return IsForesterRepository(path);
}

export interface InitRepositoryOptions {
  author?: string;
  dfmignore?: string;
}

export async function initRepository(path: string, options: InitRepositoryOptions = {}): Promise<void> {
  await InitRepositoryWithOptions(path, options.author ?? "", options.dfmignore ?? "");
}

export async function pickRepositoryFolder(): Promise<string> {
  return PickRepositoryFolder();
}

export async function fetchRepoUser(): Promise<string> {
  return GetRepoUser();
}

export function branchFromStatus(status: Record<string, unknown>): string | null {
  const branch = status.current_branch;
  return typeof branch === "string" && branch.length > 0 ? branch : null;
}
