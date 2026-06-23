import { useEffect } from "react";
import { GitBranch, Loader2, Plus } from "lucide-react";

import { FolderTree } from "@/components/sidebar/FolderTree";
import { RepoSelector } from "@/components/sidebar/RepoSelector";
import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  addRepository,
  openRepository,
  pickRepositoryFolder,
} from "@/wails/bridge";

export function EmptyRepoState() {
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const setRepo = useAppStore((s) => s.setRepo);
  const loading = useAppStore((s) => s.loading);

  const handleAdd = async () => {
    try {
      setError(null);
      setLoading(true);
      const picked = await pickRepositoryFolder();
      if (!picked) return;
      const state = await addRepository(picked);
      setRepo(
        state.repoPath,
        state.repoName,
        typeof state.status.current_branch === "string" ? state.status.current_branch : null,
      );
      await loadProjectData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Open repository</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add a Forester repository to browse files, commits, and diffs.
        </p>
      </div>
      <Button onClick={handleAdd} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add repository
      </Button>
    </div>
  );
}

export function ProjectSidebarPanel() {
  const repoPath = useAppStore((s) => s.repoPath);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const error = useAppStore((s) => s.error);
  const sidebarMode = useAppStore((s) => s.sidebarMode);

  const showChangedOnly = useProjectStore((s) => s.showChangedOnly);
  const setShowChangedOnly = useProjectStore((s) => s.setShowChangedOnly);
  const setSelectedFolderPath = useProjectStore((s) => s.setSelectedFolderPath);

  useEffect(() => {
    if (repoPath && sidebarMode === "project") {
      void loadProjectData();
    }
    if (!repoPath) {
      useProjectStore.getState().reset();
    }
  }, [repoPath, sidebarMode]);

  if (!repoPath) {
    return <EmptyRepoState />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold">Project view</h1>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <span>Changed</span>
          <button
            type="button"
            role="switch"
            aria-checked={showChangedOnly}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              showChangedOnly ? "bg-primary" : "bg-input",
            )}
            onClick={() => setShowChangedOnly(!showChangedOnly)}
          >
            <span
              className={cn(
                "absolute top-0.5 block h-4 w-4 rounded-full bg-background shadow transition-transform",
                showChangedOnly ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </button>
        </label>
      </header>

      <div className="space-y-3 border-b border-border p-3">
        <RepoSelector />
        {currentBranch ? (
          <p className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            {currentBranch}
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">Folders</p>
        <FolderTree
          onFolderSelect={(path) => {
            setSelectedFolderPath(path);
          }}
        />
      </div>
    </div>
  );
}

export async function bootstrapRepositories(
  setRepo: ReturnType<typeof useAppStore.getState>["setRepo"],
  setError: ReturnType<typeof useAppStore.getState>["setError"],
  setLoading: ReturnType<typeof useAppStore.getState>["setLoading"],
) {
  try {
    setLoading(true);
    setError(null);
    const { fetchCurrentRepoPath } = await import("@/wails/bridge");
    const current = await fetchCurrentRepoPath();
    if (!current) return;
    const state = await openRepository(current);
    setRepo(
      state.repoPath,
      state.repoName,
      typeof state.status.current_branch === "string" ? state.status.current_branch : null,
    );
    await loadProjectData();
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    setLoading(false);
  }
}
