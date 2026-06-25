import { useEffect, useState } from "react";
import { Check, ChevronDown, FolderGit2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/i18n";
import { basename, cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import { loadProjectData } from "@/components/preview/ProjectPreviewPanel";
import { useRepositoryAdd } from "@/components/shell/RepositoryAddProvider";
import {
  addRepository,
  fetchKnownRepos,
  openRepository,
} from "@/wails/bridge";

interface RepoSelectorProps {
  onOpenChange?: (open: boolean) => void;
}

export function RepoSelector({ onOpenChange }: RepoSelectorProps) {
  const t = useT();
  const repoPath = useAppStore((s) => s.repoPath);
  const repoName = useAppStore((s) => s.repoName);
  const setRepo = useAppStore((s) => s.setRepo);
  const setError = useAppStore((s) => s.setError);
  const setLoading = useAppStore((s) => s.setLoading);
  const { pickRepositoryPath } = useRepositoryAdd();
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<string[]>([]);

  useEffect(() => {
    void fetchKnownRepos().then(setRepos).catch(() => setRepos([]));
  }, [repoPath]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

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
      handleOpenChange(false);
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
      await pickRepositoryPath(async (path) => {
        const state = await addRepository(path);
        setRepo(
          state.repoPath,
          state.repoName,
          typeof state.status.current_branch === "string" ? state.status.current_branch : null,
        );
        await loadProjectData();
        handleOpenChange(false);
        const list = await fetchKnownRepos();
        setRepos(list);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between gap-2 bg-background font-medium"
          title={repoPath ?? undefined}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{repoName ?? t("repo.generic")}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="z-50 w-[var(--radix-popover-trigger-width)] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-56 overflow-auto">
          {repos.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("repo.noRepositories")}</p>
          ) : (
            repos.map((path) => (
              <Button
                key={path}
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start gap-2 px-3 py-2 font-normal",
                  repoPath === path && "bg-accent",
                )}
                title={path}
                onClick={() => void switchRepo(path)}
              >
                {repoPath === path ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{basename(path)}</span>
              </Button>
            ))
          )}
        </div>
        <Separator className="my-1" />
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-start gap-2 px-3 py-2 font-normal"
          onClick={() => void handleAdd()}
        >
          <Plus className="h-4 w-4" />
          {t("repo.addWithEllipsis")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
