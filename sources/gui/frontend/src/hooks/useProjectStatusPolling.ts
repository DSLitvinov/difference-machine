import { useEffect, useRef } from "react";

import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { fetchStatus, foresterCall } from "@/wails/forester";

const POLL_INTERVAL_MS = 5000;

async function refreshStatus() {
  const status = await fetchStatus();
  useProjectStore.getState().setStatus(status);
  const branch = status.current_branch;
  const { repoPath, repoName, setRepo } = useAppStore.getState();
  if (repoPath && typeof branch === "string" && branch.length > 0) {
    setRepo(repoPath, repoName, branch);
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
      useAppStore.getState().setNotice("Selected file was removed or is no longer available");
    }
  }
}

export function useProjectStatusPolling() {
  const repoPath = useAppStore((s) => s.repoPath);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const setForesterError = useAppStore((s) => s.setForesterError);
  const ticking = useRef(false);

  const poll = async () => {
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
    }
  };

  useEffect(() => {
    if (!repoPath) return;

    const id = window.setInterval(() => {
      if (document.hasFocus()) {
        void poll();
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [repoPath, sidebarMode]);

  useEffect(() => {
    if (!repoPath) return;

    const onFocus = () => {
      void poll();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [repoPath, sidebarMode]);
}

export async function retryForesterConnection() {
  const { repoPath, setForesterError, setLoading } = useAppStore.getState();
  if (!repoPath) return;
  setLoading(true);
  setForesterError(null);
  try {
    await refreshStatus();
    await loadProjectData();
  } catch (err) {
    setForesterError(err instanceof Error ? err.message : String(err));
  } finally {
    setLoading(false);
  }
}

export async function reopenRepositoryFromPicker() {
  const { setRepo, setError, setForesterError, setLoading } = useAppStore.getState();
  setLoading(true);
  setError(null);
  setForesterError(null);
  try {
    const { openRepository, pickRepositoryFolder } = await import("@/wails/bridge");
    const picked = await pickRepositoryFolder();
    if (!picked) return;
    const state = await openRepository(picked);
    setRepo(
      state.repoPath,
      state.repoName,
      typeof state.status.current_branch === "string" ? state.status.current_branch : null,
    );
    await loadProjectData();
    useAppStore.getState().setNotice("Repository opened");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setError(message);
    setForesterError(message);
  } finally {
    setLoading(false);
  }
}
