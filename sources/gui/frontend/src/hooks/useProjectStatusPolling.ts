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
  if (typeof branch === "string" && branch.length > 0) {
    const { repoPath, setRepo } = useAppStore.getState();
    if (repoPath) {
      const { repoName } = useAppStore.getState();
      setRepo(repoPath, repoName, branch);
    }
  }
  useAppStore.getState().setForesterError(null);
  return status;
}

async function validateSelectedFile() {
  const { selectedFilePath } = useProjectStore.getState();
  if (!selectedFilePath) return;

  try {
    await foresterCall("workdir.metadata", { path: selectedFilePath });
  } catch {
    useProjectStore.getState().setSelectedFilePath(null);
    useAppStore.getState().setError("Selected file was removed or is no longer available");
  }
}

export function useProjectStatusPolling() {
  const repoPath = useAppStore((s) => s.repoPath);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const setForesterError = useAppStore((s) => s.setForesterError);
  const ticking = useRef(false);

  const poll = async () => {
    if (!repoPath || sidebarMode !== "project" || ticking.current) return;
    ticking.current = true;
    try {
      await refreshStatus();
      await validateSelectedFile();
    } catch (err) {
      setForesterError(err instanceof Error ? err.message : String(err));
    } finally {
      ticking.current = false;
    }
  };

  useEffect(() => {
    if (!repoPath || sidebarMode !== "project") return;

    const id = window.setInterval(() => {
      if (document.hasFocus()) {
        void poll();
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [repoPath, sidebarMode]);

  useEffect(() => {
    if (!repoPath || sidebarMode !== "project") return;

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
