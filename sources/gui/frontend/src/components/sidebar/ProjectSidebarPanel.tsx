import { FolderOpen, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/appStore";
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
      if (!picked) {
        return;
      }
      const state = await addRepository(picked);
      setRepo(
        state.repoPath,
        state.repoName,
        typeof state.status.current_branch === "string"
          ? state.status.current_branch
          : null,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <FolderOpen className="h-10 w-10 text-muted-foreground" />
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
  const repoName = useAppStore((s) => s.repoName);
  const repoPath = useAppStore((s) => s.repoPath);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const error = useAppStore((s) => s.error);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const setRepo = useAppStore((s) => s.setRepo);

  const handleAdd = async () => {
    try {
      setError(null);
      setLoading(true);
      const picked = await pickRepositoryFolder();
      if (!picked) {
        return;
      }
      const state = await addRepository(picked);
      setRepo(
        state.repoPath,
        state.repoName,
        typeof state.status.current_branch === "string"
          ? state.status.current_branch
          : null,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!repoPath) {
    return <EmptyRepoState />;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold">Project view</h1>
      </header>
      <div className="space-y-3 border-b border-border p-3">
        <div
          className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium"
          title={repoPath}
        >
          {repoName ?? "Repository"}
        </div>
        {currentBranch ? (
          <p className="text-xs text-muted-foreground">Branch: {currentBranch}</p>
        ) : null}
        <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add repository
        </Button>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Folder tree — coming in slice 2
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
    const current = await import("@/wails/bridge").then((m) => m.fetchCurrentRepoPath());
    if (!current) {
      return;
    }
    const state = await openRepository(current);
    setRepo(
      state.repoPath,
      state.repoName,
      typeof state.status.current_branch === "string" ? state.status.current_branch : null,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setError(message);
  } finally {
    setLoading(false);
  }
}
