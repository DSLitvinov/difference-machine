import { useAppStore, type SidebarMode } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useProjectStore } from "@/stores/projectStore";

export function switchSidebarMode(mode: SidebarMode) {
  const { sidebarMode, repoPath, setSidebarMode } = useAppStore.getState();
  if (mode === sidebarMode) return;

  useProjectStore.getState().exitSubPreviewViews();
  useProjectStore.getState().clearFileSelection();
  if (repoPath) {
    if (sidebarMode === "history") {
      useHistoryStore.getState().selectCommit(repoPath, null);
    }
  } else {
    useHistoryStore.getState().reset();
  }
  setSidebarMode(mode);
}
