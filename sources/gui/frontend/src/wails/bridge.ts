import {
  AddKnownRepo,
  CloseRepository,
  GetCurrentRepoPath,
  GetKnownRepos,
  GetRepoUser,
  InitRepository,
  InitRepositoryWithOptions,
  IsForesterRepository,
  OpenRepo,
  PickRepositoryFolder,
} from "../../wailsjs/go/main/App";
import type { StatusPayload } from "@/wails/forester";
import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { repoPathInList } from "@/lib/repoPaths";
import { switchSidebarMode } from "@/lib/sidebarModeSwitch";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";

export const NOT_FORESTER_REPOSITORY_ERROR = "not a Forester repository";

export interface RepoState {
  repoPath: string;
  repoName: string;
  status: Record<string, unknown>;
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

export async function syncKnownRepos(): Promise<string[]> {
  const repos = await fetchKnownRepos();
  useAppStore.getState().setKnownRepos(repos);
  return repos;
}

export async function fetchCurrentRepoPath(): Promise<string> {
  return GetCurrentRepoPath();
}

export async function openRepository(path: string) {
  const raw = await OpenRepo(path);
  return parseRepoState(raw);
}

export async function closeRepository(): Promise<void> {
  await CloseRepository();
}

/** Sync open repo after Settings → Save list (empty state or switch to first remaining). */
export async function applyKnownReposAfterSave(savedRepos: string[]): Promise<void> {
  const { repoPath, clearRepo, setRepo, setKnownRepos } = useAppStore.getState();
  setKnownRepos(savedRepos);

  if (savedRepos.length === 0) {
    await closeRepository();
    clearRepo();
    switchSidebarMode("project");
    useProjectStore.getState().reset();
    return;
  }

  if (!repoPath || repoPathInList(repoPath, savedRepos)) {
    return;
  }

  const nextPath = savedRepos[0];
  const state = await openRepository(nextPath);
  primeProjectLoadFromRepoState(state);
  setRepo(state.repoPath, state.repoName, branchFromStatus(state.status));
  await loadProjectData();
}

export async function addRepository(path: string) {
  const raw = await AddKnownRepo(path);
  const state = parseRepoState(raw);
  switchSidebarMode("project");
  await syncKnownRepos();
  return state;
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

export function repoStateStatus(state: RepoState): StatusPayload {
  return state.status as StatusPayload;
}

export function primeProjectLoadFromRepoState(state: RepoState): void {
  useProjectStore.getState().setPendingOpenStatus(state.repoPath, repoStateStatus(state));
}

export function branchFromStatus(status: Record<string, unknown>): string | null {
  const branch = status.current_branch;
  return typeof branch === "string" && branch.length > 0 ? branch : null;
}
