import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FolderGit2, Plus } from "lucide-react";

import { basename } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import {
  addRepository,
  fetchKnownRepos,
  openRepository,
  pickRepositoryFolder,
} from "@/wails/bridge";

export function RepoSelector() {
  const repoPath = useAppStore((s) => s.repoPath);
  const repoName = useAppStore((s) => s.repoName);
  const currentBranch = useAppStore((s) => s.currentBranch);
  const setRepo = useAppStore((s) => s.setRepo);
  const setError = useAppStore((s) => s.setError);
  const setLoading = useAppStore((s) => s.setLoading);

  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchKnownRepos().then(setRepos).catch(() => setRepos([]));
  }, [repoPath]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const switchRepo = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      const state = await openRepository(path);
      setRepo(
        state.repoPath,
        state.repoName,
        typeof state.status.current_branch === "string" ? state.status.current_branch : null,
      );
      await loadProjectData();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      setLoading(true);
      setError(null);
      const picked = await pickRepositoryFolder();
      if (!picked) return;
      const state = await addRepository(picked);
      setRepo(
        state.repoPath,
        state.repoName,
        typeof state.status.current_branch === "string" ? state.status.current_branch : null,
      );
      await loadProjectData();
      setOpen(false);
      const list = await fetchKnownRepos();
      setRepos(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium hover:bg-accent"
        title={repoPath ?? undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{repoName ?? "Repository"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {currentBranch ? (
        <p className="px-1 text-xs text-muted-foreground">Branch: {currentBranch}</p>
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-background py-1 shadow-md">
          {repos.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No repositories yet</p>
          ) : (
            repos.map((path) => (
              <button
                key={path}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => void switchRepo(path)}
              >
                {repoPath === path ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate" title={path}>
                  {basename(path)}
                </span>
              </button>
            ))
          )}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => void handleAdd()}
          >
            <Plus className="h-4 w-4" />
            Add repository…
          </button>
        </div>
      ) : null}
    </div>
  );
}
