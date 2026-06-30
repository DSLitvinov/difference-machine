import { useEffect, useState } from "react";
import { Expand, GitBranch, Loader2, Plus, Shrink } from "lucide-react";

import { FolderTree } from "@/components/sidebar/FolderTree";
import { RepoSelector } from "@/components/sidebar/RepoSelector";
import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { Button } from "@/components/ui/button";
import { useRepositoryAdd } from "@/components/shell/RepositoryAddProvider";
import { treeHasExpandedFolders } from "@/lib/projectViewPaths";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { addRepository, openRepository, primeProjectLoadFromRepoState } from "@/wails/bridge";

const EXPAND_ALL_FILE_LIMIT = 10000;

export function EmptyRepoState() {
  const t = useT();
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
        primeProjectLoadFromRepoState(state);
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
        <h2 className="text-lg font-semibold">{t("common.openRepository")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("repo.emptyHint")}
        </p>
      </div>
      <Button onClick={handleAdd} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {t("common.addRepository")}
      </Button>
    </div>
  );
}

export function ProjectSidebarPanel() {
  const t = useT();
  const repoPath = useAppStore((s) => s.repoPath);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const status = useProjectStore((s) => s.status);
  const isDetached = Boolean(status?.is_detached);

  const navigateToFolder = useProjectStore((s) => s.navigateToFolder);
  const expandAllFolders = useProjectStore((s) => s.expandAllFolders);
  const collapseAllFolders = useProjectStore((s) => s.collapseAllFolders);
  const treeLoading = useProjectStore((s) => s.treeLoading);
  const folderTree = useProjectStore((s) => s.folderTree);
  const expandedPaths = useProjectStore((s) => s.expandedPaths);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [treeScrollElement, setTreeScrollElement] = useState<HTMLElement | null>(null);

  const treeExpanded = treeHasExpandedFolders(expandedPaths);
  const expandAllDisabled =
    treeLoading || Boolean(folderTree && folderTree.item_count >= EXPAND_ALL_FILE_LIMIT);

  useEffect(() => {
    if (!repoPath) {
      useProjectStore.getState().reset();
      return;
    }
    if (sidebarMode !== "project") return;
    const { loadedRepoPath, treeLoading } = useProjectStore.getState();
    if (loadedRepoPath === repoPath || treeLoading) return;
    void loadProjectData();
  }, [repoPath, sidebarMode]);

  if (!repoPath) {
    return <EmptyRepoState />;
  }

  const handleTreeExpandToggle = () => {
    if (treeExpanded) {
      collapseAllFolders();
      return;
    }
    void expandAllFolders();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center border-b border-sidebar-border px-4 py-3">
        <h1 className="text-base font-semibold">{t("common.projectView")}</h1>
      </header>

      <div className="relative z-20 shrink-0 space-y-3 border-b border-sidebar-border p-3">
        <RepoSelector onOpenChange={setRepoMenuOpen} />
        {currentBranch && !repoMenuOpen ? (
          <p className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            {isDetached ? `${currentBranch} (${t("branch.detached")})` : currentBranch}
          </p>
        ) : null}
      </div>

      <div ref={setTreeScrollElement} className="min-h-0 flex-1 overflow-auto bg-background">
        <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{t("common.folders")}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={!treeExpanded && expandAllDisabled}
            title={
              treeExpanded
                ? t("sidebar.collapseAllFolders")
                : folderTree && folderTree.item_count >= EXPAND_ALL_FILE_LIMIT
                  ? t("repo.largeDisabled")
                  : t("sidebar.expandAllFolders")
            }
            onClick={handleTreeExpandToggle}
          >
            {treeExpanded ? (
              <Shrink className="h-4 w-4" />
            ) : (
              <Expand className="h-4 w-4" />
            )}
          </Button>
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
    primeProjectLoadFromRepoState(state);
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
