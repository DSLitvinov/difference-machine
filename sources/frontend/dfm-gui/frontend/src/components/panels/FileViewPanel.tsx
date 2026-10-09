import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown } from "lucide-react";
import { HeaderSelectBranch } from "@/components/items/HeaderSelectBranch";
import { HeaderSettings } from "@/components/items/HeaderSettings";
import { SidebarCard } from "@/components/items/SidebarCard";
import { CommitFileCard } from "@/components/atoms/CommitFileCard";
import { NoHistoryFile } from "@/components/atoms/NoHistoryFile";
import { CommitCardMoreButton, type CommitCardAction } from "@/components/items/CommitCardMenu";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExternalEditors } from "@/lib/editors";
import { t, type Locale } from "@/lib/i18n";
import { foresterCall } from "@/lib/bridge";
import { requestVisibleStats, useStat } from "@/lib/revision-cache";
import { dirtyPaths } from "@/lib/status";
import type { BranchSummary, CommitSummary, StatusSnapshot } from "@/store/app-store";

type FileViewPanelProps = {
  locale: Locale;
  userName: string;
  repoPath: string;
  path: string;
  status: StatusSnapshot | null;
  branches: BranchSummary[];
  selectedHash?: string | null;
  onSettings: () => void;
  onCurrentPreview: () => void;
  onSelectCommit: (commit: CommitSummary) => void;
  onSwitchBranch: (name: string) => void;
  onCreateBranch: () => void;
  onRenameBranch: () => void;
  onDeleteBranch: () => void;
  onMerge: () => void;
  onCommitAction: (action: CommitCardAction, commit: CommitSummary) => void;
  onTakeSnapshot: () => void;
  onEditIn: (editor: string) => void;
  switchLocked?: boolean;
};

type LogResult = {
  commits?: CommitSummary[];
};

function splitMessage(message: string): { title: string; description: string } {
  const trimmed = message.trim();
  const nl = trimmed.indexOf("\n");
  if (nl === -1) {
    return { title: trimmed, description: "" };
  }
  return { title: trimmed.slice(0, nl).trim(), description: trimmed.slice(nl + 1).trim() };
}

export function FileViewPanel({
  locale,
  userName,
  repoPath,
  path,
  status,
  branches,
  selectedHash,
  onSettings,
  onCurrentPreview,
  onSelectCommit,
  onSwitchBranch,
  onCreateBranch,
  onRenameBranch,
  onDeleteBranch,
  onMerge,
  onCommitAction,
  onTakeSnapshot,
  onEditIn,
  switchLocked,
}: FileViewPanelProps) {
  const copy = t(locale);
  const editors = useExternalEditors();
  const fileName = path.split("/").filter(Boolean).pop() ?? path;
  const fileDirty = dirtyPaths(status).includes(path);
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 140,
    overscan: 2,
    gap: 8,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = (await foresterCall("log.get", { path, max_count: 100 })) as LogResult;
        if (!cancelled) {
          setCommits(result.commits ?? []);
        }
      } catch {
        if (!cancelled) {
          setCommits([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, status?.current_branch]);

  const rows = virtualizer.getVirtualItems();
  const visibleHashes = rows.map((row) => commits[row.index]?.hash ?? "").join("\0");

  useEffect(() => {
    if (!repoPath || !visibleHashes) {
      return;
    }
    requestVisibleStats(repoPath, visibleHashes.split("\0").filter(Boolean));
  }, [repoPath, visibleHashes]);

  const empty = commits.length === 0;
  const revisionOpen = Boolean(selectedHash);

  return (
    <aside className="flex h-full w-[309px] shrink-0 flex-col overflow-hidden">
      <HeaderSelectBranch
        locale={locale}
        branchName={status?.current_branch}
        branches={branches}
        switchLocked={switchLocked}
        onSwitch={onSwitchBranch}
        onCreate={onCreateBranch}
        onRename={onRenameBranch}
        onDelete={onDeleteBranch}
        onMerge={onMerge}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pt-1">
        <div className="flex w-full shrink-0 flex-col">
          <SidebarCard state={revisionOpen ? "default" : "selected"} className="overflow-hidden p-0" onClick={onCurrentPreview}>
            <div className="flex w-full flex-col gap-2 p-4">
              <p className="truncate text-[14px] font-semibold leading-5 text-[#18181b] dark:text-foreground">{fileName}</p>
              {fileDirty ? null : <p className="truncate text-[12px] leading-4 text-[#71717a] dark:text-foreground-muted">{copy.noChangesFile}</p>}
            </div>
            {fileDirty ? (
              <div className="w-full border-t border-[#e5e5e5] bg-[linear-gradient(90deg,rgba(255,255,255,0.5),rgba(255,255,255,0.5)),linear-gradient(90deg,#e4e4e7,#e4e4e7)] p-4 dark:border-border dark:bg-background-muted">
                <div className="flex w-full items-start gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-w-0 flex-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {copy.editIn}
                        <Icon icon={ChevronDown} size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px]">
                      {editors.map((editor) => (
                        <DropdownMenuItem key={editor.path} onSelect={() => onEditIn(editor.path)}>
                          {editor.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    className="min-w-0 flex-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTakeSnapshot();
                    }}
                  >
                    {copy.takeSnapshot}
                  </Button>
                </div>
              </div>
            ) : null}
          </SidebarCard>
        </div>
        <Tabs value="history" className="w-full shrink-0">
          <TabsList size="sm" className="w-full">
            <TabsTrigger value="history" className="flex-1">
              {copy.history}
            </TabsTrigger>
            <TabsTrigger value="stages" disabled className="flex-1">
              {copy.stages}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {empty ? (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <SidebarCard state="disabled">
              <NoHistoryFile locale={locale} />
            </SidebarCard>
          </div>
        ) : (
          <div ref={scrollRef} className="min-h-0 w-full flex-1 overflow-y-auto">
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {rows.map((row) => {
                const commit = commits[row.index];
                const { title, description } = splitMessage(commit.message ?? "");
                return (
                  <div
                    key={commit.hash}
                    data-index={row.index}
                    ref={virtualizer.measureElement}
                    className="absolute left-0 right-0"
                    style={{ transform: `translateY(${row.start}px)` }}
                  >
                    <FileCommitCard
                      locale={locale}
                      repoPath={repoPath}
                      commit={commit}
                      title={title}
                      description={description}
                      selected={commit.hash === selectedHash}
                      head={Boolean(commit.hash && commit.hash === status?.head_commit)}
                      onSelect={() => onSelectCommit(commit)}
                      onCommitAction={onCommitAction}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <HeaderSettings locale={locale} userName={userName} onSettings={onSettings} />
    </aside>
  );
}

function FileCommitCard({
  locale,
  repoPath,
  commit,
  title,
  description,
  selected,
  head,
  onSelect,
  onCommitAction,
}: {
  locale: Locale;
  repoPath: string;
  commit: CommitSummary;
  title: string;
  description: string;
  selected: boolean;
  head: boolean;
  onSelect: () => void;
  onCommitAction: (action: CommitCardAction, commit: CommitSummary) => void;
}) {
  const stat = useStat(repoPath, commit.hash);
  return (
    <SidebarCard state={selected ? "selected" : "default"} onClick={onSelect}>
      <CommitFileCard
        locale={locale}
        title={title}
        author={commit.author ?? ""}
        description={description}
        timestamp={commit.timestamp ?? 0}
        head={head}
        merge={(commit.parent_hashes?.length ?? 0) > 1}
        tag={commit.tag}
        added={stat?.added}
        deleted={stat?.deleted}
        more={
          <CommitCardMoreButton
            locale={locale}
            hash={commit.hash}
            message={commit.message ?? ""}
            onAction={(action) => onCommitAction(action, commit)}
          />
        }
      />
    </SidebarCard>
  );
}
