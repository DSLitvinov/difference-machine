import { useEffect, useState } from "react";
import { GitBranch, Loader2, Plus } from "lucide-react";

import { FolderTree } from "@/components/sidebar/FolderTree";
import { RepoSelector } from "@/components/sidebar/RepoSelector";
import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRepositoryAdd } from "@/components/shell/RepositoryAddProvider";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { addRepository, openRepository } from "@/wails/bridge";

export function EmptyRepoState() {
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const setRepo = useAppStore((s) => s.setRepo);
  const loading = useAppStore((s) => s.loading);
  const { pickRepositoryPath } = useRepositoryAdd();

  const handleAdd = async () => {
    try {
      setError(null);
      setLoading(true);
      await pickRepositoryPath(async (path) => {
        const state = await addRepository(path);
        setRepo(
          state.repoPath,
          state.repoName,
          typeof state.status.current_branch === "string" ? state.status.current_branch : null,
        );
        await loadProjectData();
      });
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
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const status = useProjectStore((s) => s.status);
  const isDetached = Boolean(status?.is_detached);

  const showChangedOnly = useProjectStore((s) => s.showChangedOnly);
  const setShowChangedOnly = useProjectStore((s) => s.setShowChangedOnly);
  const navigateToFolder = useProjectStore((s) => s.navigateToFolder);
  const expandAllFolders = useProjectStore((s) => s.expandAllFolders);
  const collapseAllFolders = useProjectStore((s) => s.collapseAllFolders);
  const treeLoading = useProjectStore((s) => s.treeLoading);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [treeScrollElement, setTreeScrollElement] = useState<HTMLElement | null>(null);

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
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-sidebar-border px-4 py-3">
        <h1 className="text-base font-semibold">Project view</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="changed-only" className="text-sm font-normal text-muted-foreground">
            Changed
          </Label>
          <Switch
            id="changed-only"
            checked={showChangedOnly}
            onCheckedChange={setShowChangedOnly}
          />
        </div>
      </header>

      <div className="relative z-20 shrink-0 space-y-3 border-b border-sidebar-border p-3">
        <RepoSelector onOpenChange={setRepoMenuOpen} />
        {currentBranch && !repoMenuOpen ? (
          <p className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            {isDetached ? `${currentBranch} (detached)` : currentBranch}
          </p>
        ) : null}
      </div>

      <div ref={setTreeScrollElement} className="min-h-0 flex-1 overflow-auto bg-background">
        <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Folders</p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] font-medium"
              disabled={treeLoading}
              onClick={() => void expandAllFolders()}
            >
              Expand all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] font-medium"
              onClick={collapseAllFolders}
            >
              Collapse
            </Button>
          </div>
        </div>
        <FolderTree
          scrollElement={treeScrollElement}
          onFolderSelect={(path) => {
            navigateToFolder(path);
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
