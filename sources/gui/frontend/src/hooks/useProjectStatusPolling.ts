import { useCallback, useEffect, useRef } from "react";
import { EventsOn } from "../../wailsjs/runtime/runtime";

import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { translate } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { getRepositoryAddActions } from "@/lib/repositoryAddActions";
import { fetchStatus, fetchLockList, foresterCall, locksByPath } from "@/wails/forester";

const POLL_INTERVAL_MS = 5000;
const WATCHER_DEBOUNCE_MS = 300;

async function refreshStatus() {
  const status = await fetchStatus();
  const locks = await fetchLockList();
  const { repoPath, repoName, currentBranch, setRepo } = useAppStore.getState();
  const branch = status.current_branch;
  const nextBranch = typeof branch === "string" && branch.length > 0 ? branch : currentBranch;

  useProjectStore.getState().setStatus(status);
  useProjectStore.getState().setLocks(locksByPath(locks));

  if (repoPath && nextBranch && nextBranch !== currentBranch) {
    setRepo(repoPath, repoName, nextBranch);
  }
  useAppStore.getState().setForesterError(null);
  return status;
}

async function validateSelectedFiles() {
  const { selectedFilePaths, setSelectedFilePaths } = useProjectStore.getState();
  if (selectedFilePaths.length === 0) return;

  const stillValid: string[] = [];
  for (const path of selectedFilePaths) {
    try {
      await foresterCall("workdir.metadata", { path });
      stillValid.push(path);
    } catch {
      // drop removed file
    }
  }
  if (stillValid.length !== selectedFilePaths.length) {
    setSelectedFilePaths(stillValid);
    if (stillValid.length < selectedFilePaths.length) {
      const { language, setNotice } = useAppStore.getState();
      setNotice(translate(language, "repo.selectedFileUnavailable"));
    }
  }
}

async function refreshWorkdirFromWatcher() {
  const { repoPath, sidebarMode } = useAppStore.getState();
  if (!repoPath || sidebarMode !== "project") {
    await refreshStatus();
    return;
  }

  await refreshStatus();
  await loadProjectData();
  await validateSelectedFiles();
  const projectStore = useProjectStore.getState();
  projectStore.bumpWorkdirGeneration();
  projectStore.bumpPreviewGeneration();
}

export function useProjectStatusPolling() {
  const repoPath = useAppStore((s) => s.repoPath);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const setForesterError = useAppStore((s) => s.setForesterError);
  const ticking = useRef(false);
  const watcherDebounceRef = useRef<number | undefined>(undefined);
  const pendingWorkdirChangeRef = useRef(false);

  const refreshFromWatcher = useCallback(async () => {
    if (!repoPath) return;
    if (ticking.current) {
      pendingWorkdirChangeRef.current = true;
      return;
    }
    ticking.current = true;
    try {
      await refreshWorkdirFromWatcher();
    } catch (err) {
      setForesterError(err instanceof Error ? err.message : String(err));
    } finally {
      ticking.current = false;
      if (pendingWorkdirChangeRef.current && document.hasFocus()) {
        pendingWorkdirChangeRef.current = false;
        void refreshFromWatcher();
      }
    }
  }, [repoPath, setForesterError]);

  const poll = useCallback(async () => {
    if (!repoPath || ticking.current) return;
    ticking.current = true;
    try {
      await refreshStatus();
      if (sidebarMode === "project") {
        await validateSelectedFiles();
      }
    } catch (err) {
      setForesterError(err instanceof Error ? err.message : String(err));
    } finally {
      ticking.current = false;
      if (pendingWorkdirChangeRef.current && document.hasFocus()) {
        pendingWorkdirChangeRef.current = false;
        void refreshFromWatcher();
      }
    }
  }, [repoPath, sidebarMode, setForesterError, refreshFromWatcher]);

  useEffect(() => {
    if (!repoPath) return;

    const id = window.setInterval(() => {
      if (document.hasFocus()) {
        void poll();
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [poll, repoPath]);

  useEffect(() => {
    if (!repoPath) return;

    const onFocus = () => {
      if (pendingWorkdirChangeRef.current) {
        pendingWorkdirChangeRef.current = false;
        void refreshFromWatcher();
        return;
      }
      void poll();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [poll, refreshFromWatcher, repoPath]);

  useEffect(() => {
    if (!repoPath) return;

    const cleanup = EventsOn("workdir:changed", () => {
      if (!document.hasFocus()) {
        pendingWorkdirChangeRef.current = true;
        return;
      }
      window.clearTimeout(watcherDebounceRef.current);
      watcherDebounceRef.current = window.setTimeout(() => {
        void refreshFromWatcher();
      }, WATCHER_DEBOUNCE_MS);
    });

    return () => {
      cleanup();
      window.clearTimeout(watcherDebounceRef.current);
    };
  }, [refreshFromWatcher, repoPath]);
}

export async function retryForesterConnection() {
  const { repoPath, setForesterError, setLoading } = useAppStore.getState();
  if (!repoPath) return;
  setLoading(true);
  setForesterError(null);
  try {
    await refreshStatus();
    await loadProjectData();
    useProjectStore.getState().bumpWorkdirGeneration();
  } catch (err) {
    setForesterError(err instanceof Error ? err.message : String(err));
  } finally {
    setLoading(false);
  }
}

export async function reopenRepositoryFromPicker() {
  const { language, setRepo, setError, setForesterError, setLoading } = useAppStore.getState();
  const actions = getRepositoryAddActions();
  if (!actions) {
    setError(translate(language, "repo.pickerNotReady"));
    return;
  }

  setLoading(true);
  setError(null);
  setForesterError(null);
  try {
    await actions.pickRepositoryPath(async (path) => {
      const { addRepository, primeProjectLoadFromRepoState } = await import("@/wails/bridge");
      const state = await addRepository(path);
      primeProjectLoadFromRepoState(state);
      setRepo(
        state.repoPath,
        state.repoName,
        typeof state.status.current_branch === "string" ? state.status.current_branch : null,
      );
      await loadProjectData();
      useProjectStore.getState().bumpWorkdirGeneration();
      useAppStore.getState().setNotice(translate(language, "repo.opened"));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setError(message);
    setForesterError(message);
  } finally {
    setLoading(false);
  }
}
