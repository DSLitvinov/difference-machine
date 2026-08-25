import { useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { HeaderSelectBranch } from "@/components/items/HeaderSelectBranch";
import { HeaderSettings } from "@/components/items/HeaderSettings";
import { SidebarCard } from "@/components/items/SidebarCard";
import { SidebarCardDirectory } from "@/components/items/SidebarCardDirectory";
import { CommitProjectCard } from "@/components/atoms/CommitProjectCard";
import { StageCard } from "@/components/atoms/StageCard";
import { NoStagesProject } from "@/components/atoms/NoStagesProject";
import { UncommittedFilesCard } from "@/components/atoms/UncommittedFilesCard";
import { CreateCommitCard, type CreateCommitFields } from "@/components/atoms/CreateCommitCard";
import { NoHistoryProject } from "@/components/atoms/NoHistoryProject";
import { NullRepositoryPlaceholder } from "@/components/placeholders/NullRepositoryPlaceholder";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t, type Locale } from "@/lib/i18n";
import { changeCounts, isDirty } from "@/lib/status";
import { requestVisibleStats, useStat } from "@/lib/revision-cache";
import { CommitCardMoreButton, type CommitCardAction } from "@/components/items/CommitCardMenu";
import { StashCardMoreButton, type StashCardAction } from "@/components/items/StashCardMenu";
import type { SidebarTab } from "@/lib/view";
import type { BranchSummary, CommitSummary, StashSummary, StatusSnapshot } from "@/store/app-store";

type ProjectViewPanelProps = {
  locale: Locale;
  userName: string;
  folderEmpty: boolean;
  hasCommits: boolean;
  isRepository: boolean;
  status: StatusSnapshot | null;
  commits: CommitSummary[];
  stashes: StashSummary[];
  branches: BranchSummary[];
  branchName?: string;
  sidebarTab: SidebarTab;
  busy?: boolean;
  repoPath: string;
  selectedCommit?: string | null;
  commitComposer?: boolean;
  /** Card Directory Load while staging files for the commit composer. */
  stagingCommit?: boolean;
  onSidebarTab: (tab: SidebarTab) => void;
  onSettings: () => void;
  onCreateRepository: () => void;
  onSelectCommit: (hash: string) => void;
  onLeaveCommit: () => void;
  onCommitAll: () => void;
  onCancelComposer: () => void;
  onCreateCommit: (fields: CreateCommitFields) => void;
  onSwitchBranch: (name: string) => void;
  onCreateBranch: () => void;
  onRenameBranch: () => void;
  onDeleteBranch: (name: string) => void;
  onMerge: () => void;
  onCommitAction: (action: CommitCardAction, commit: CommitSummary) => void;
  onStashAction: (action: StashCardAction, stash: StashSummary) => void;
  switchLocked?: boolean;
};

function splitMessage(message: string): { title: string; description: string } {
  const trimmed = message.trim();
  const nl = trimmed.indexOf("\n");
  if (nl === -1) {
    return { title: trimmed, description: "" };
  }
  return { title: trimmed.slice(0, nl).trim(), description: trimmed.slice(nl + 1).trim() };
}

function directoryState(commitOpen: boolean, composerOpen: boolean): "default" | "selected" {
  if (commitOpen && !composerOpen) {
    return "default";
  }
  return "selected";
}

function StageList({
  locale,
  userName,
  stashes,
  onStashAction,
}: {
  locale: Locale;
  userName: string;
  stashes: StashSummary[];
  onStashAction: (action: StashCardAction, stash: StashSummary) => void;
}) {
  const copy = t(locale);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: stashes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 140,
    overscan: 2,
    gap: 8,
  });
  const items = virtualizer.getVirtualItems();

  if (stashes.length === 0) {
    return (
      <SidebarCard state="disabled">
        <NoStagesProject locale={locale} />
      </SidebarCard>
    );
  }
  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((row) => {
          const stash = stashes[row.index];
          return (
            <div
              key={stash.hash}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 right-0"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <SidebarCard>
                <StageCard
                  locale={locale}
                  title={copy.stashNumber(row.index + 1)}
                  author={userName}
                  description={stash.message}
                  timestamp={stash.created_at ?? 0}
                  more={<StashCardMoreButton locale={locale} onAction={(action) => onStashAction(action, stash)} />}
                />
              </SidebarCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectViewPanel({
  locale,
  userName,
  folderEmpty,
  hasCommits,
  isRepository,
  status,
  commits,
  stashes,
  branches,
  branchName,
  sidebarTab,
  busy,
  repoPath,
  selectedCommit,
  commitComposer,
  stagingCommit,
  onSidebarTab,
  onSettings,
  onCreateRepository,
  onSelectCommit,
  onLeaveCommit,
  onCommitAll,
  onCancelComposer,
  onCreateCommit,
  onSwitchBranch,
  onCreateBranch,
  onRenameBranch,
  onDeleteBranch,
  onMerge,
  onCommitAction,
  onStashAction,
  switchLocked,
}: ProjectViewPanelProps) {
  const copy = t(locale);
  const dirty = isDirty(status);
  const counts = changeCounts(status);
  const commitOpen = Boolean(selectedCommit);
  const composerOpen = Boolean(commitComposer);
  return (
    <aside className="flex h-full w-[309px] shrink-0 flex-col overflow-hidden">
      <HeaderSelectBranch
        locale={locale}
        branchName={branchName}
        branches={branches}
        switchLocked={switchLocked}
        onSwitch={onSwitchBranch}
        onCreate={onCreateBranch}
        onRename={onRenameBranch}
        onDelete={onDeleteBranch}
        onMerge={onMerge}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex w-[309px] shrink-0 flex-col gap-2 overflow-y-auto px-3">
          <SidebarCardDirectory
            state={directoryState(commitOpen, composerOpen || Boolean(stagingCommit))}
            onClick={commitOpen && !composerOpen && !stagingCommit ? onLeaveCommit : undefined}
          >
            {composerOpen ? (
              <CreateCommitCard locale={locale} busy={busy} onCancel={onCancelComposer} onCreate={onCreateCommit} />
            ) : (
              <UncommittedFilesCard
                locale={locale}
                dirty={dirty}
                counts={counts}
                loading={stagingCommit}
                onCommitAll={onCommitAll}
              />
            )}
          </SidebarCardDirectory>
        </div>
        <div className="flex w-full items-center p-3">
          <Tabs value={sidebarTab} onValueChange={(v) => onSidebarTab(v as SidebarTab)} className="w-full">
            <TabsList>
              <TabsTrigger value="history">{copy.history}</TabsTrigger>
              <TabsTrigger value="stages">{copy.stages}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex min-h-0 w-[309px] flex-1 flex-col px-3">
          {sidebarTab === "history" ? (
            <CommitList
              locale={locale}
              folderEmpty={folderEmpty}
              hasCommits={hasCommits}
              isRepository={isRepository}
              status={status}
              commits={commits}
              busy={busy}
              repoPath={repoPath}
              selectedCommit={selectedCommit}
              onCreateRepository={onCreateRepository}
              onSelectCommit={onSelectCommit}
              onCommitAction={onCommitAction}
            />
          ) : (
            <StageList locale={locale} userName={userName} stashes={stashes} onStashAction={onStashAction} />
          )}
        </div>
      </div>
      <HeaderSettings locale={locale} userName={userName} onSettings={onSettings} />
    </aside>
  );
}

function VirtualCommitCard({
  hash,
  repoPath,
  selected,
  children,
  onSelect,
}: {
  hash: string;
  repoPath: string;
  selected?: boolean;
  children: (stat: ReturnType<typeof useStat>) => ReactNode;
  onSelect: () => void;
}) {
  const stat = useStat(repoPath, hash);
  return (
    <SidebarCard state={selected ? "selected" : "default"} onClick={onSelect}>
      {children(stat)}
    </SidebarCard>
  );
}

function CommitList({
  locale,
  folderEmpty,
  hasCommits,
  isRepository,
  status,
  commits,
  busy,
  repoPath,
  selectedCommit,
  onCreateRepository,
  onSelectCommit,
  onCommitAction,
}: {
  locale: Locale;
  folderEmpty: boolean;
  hasCommits: boolean;
  isRepository: boolean;
  status: StatusSnapshot | null;
  commits: CommitSummary[];
  busy?: boolean;
  repoPath: string;
  selectedCommit?: string | null;
  onCreateRepository: () => void;
  onSelectCommit: (hash: string) => void;
  onCommitAction: (action: CommitCardAction, commit: CommitSummary) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 140,
    overscan: 2,
    gap: 8,
  });
  const items = virtualizer.getVirtualItems();
  const visibleHashes = items.map((row) => commits[row.index]?.hash ?? "").join("\0");

  useEffect(() => {
    if (!repoPath || !visibleHashes) {
      return;
    }
    requestVisibleStats(repoPath, visibleHashes.split("\0").filter(Boolean));
  }, [repoPath, visibleHashes]);

  // Create repository tip only when the open folder has no .DFM (not after init).
  if (!isRepository && !folderEmpty) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <NullRepositoryPlaceholder locale={locale} busy={busy} onCreate={onCreateRepository} />
      </div>
    );
  }
  if (!hasCommits || commits.length === 0) {
    return (
      <SidebarCard state="disabled">
        <NoHistoryProject locale={locale} />
      </SidebarCard>
    );
  }
  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((row) => {
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
              <VirtualCommitCard
                hash={commit.hash}
                repoPath={repoPath}
                selected={commit.hash === selectedCommit}
                onSelect={() => onSelectCommit(commit.hash)}
              >
                {(stat) => (
                  <CommitProjectCard
                    locale={locale}
                    title={title}
                    author={commit.author ?? ""}
                    description={description}
                    timestamp={commit.timestamp ?? 0}
                    head={Boolean(commit.hash && commit.hash === status?.head_commit)}
                    merge={(commit.parent_hashes?.length ?? 0) > 1}
                    tag={commit.tag}
                    filesChanged={stat?.files_changed}
                    insertions={stat?.insertions}
                    deletions={stat?.deletions}
                    more={
                      <CommitCardMoreButton
                        locale={locale}
                        hash={commit.hash}
                        message={commit.message ?? ""}
                        onAction={(action) => onCommitAction(action, commit)}
                      />
                    }
                  />
                )}
              </VirtualCommitCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
