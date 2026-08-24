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
import type { SidebarTab } from "@/lib/view";
import type { BranchSummary, CommitSummary, StatusSnapshot } from "@/store/app-store";

type ProjectViewPanelProps = {
  locale: Locale;
  userName: string;
  folderEmpty: boolean;
  hasCommits: boolean;
  status: StatusSnapshot | null;
  commits: CommitSummary[];
  branches: BranchSummary[];
  branchName?: string;
  sidebarTab: SidebarTab;
  changedOnly: boolean;
  busy?: boolean;
  repoPath: string;
  selectedCommit?: string | null;
  commitComposer?: boolean;
  onSidebarTab: (tab: SidebarTab) => void;
  onChangedOnly: (value: boolean) => void;
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

type StageSummary = {
  id: string;
  title: string;
  author: string;
  description?: string;
  timestamp: number;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
};

function StageList({ locale }: { locale: Locale }) {
  // No stash list in JSON API 0.8.1 — do not invent rows.
  const stages: StageSummary[] = [];
  if (stages.length === 0) {
    return (
      <SidebarCard state="disabled">
        <NoStagesProject locale={locale} />
      </SidebarCard>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex w-full flex-col gap-2">
        {stages.map((stage) => (
          <SidebarCard key={stage.id}>
            <StageCard
              title={stage.title}
              author={stage.author}
              description={stage.description}
              timestamp={stage.timestamp}
              filesChanged={stage.filesChanged}
              insertions={stage.insertions}
              deletions={stage.deletions}
            />
          </SidebarCard>
        ))}
      </div>
    </div>
  );
}

export function ProjectViewPanel({
  locale,
  userName,
  folderEmpty,
  hasCommits,
  status,
  commits,
  branches,
  branchName,
  sidebarTab,
  changedOnly,
  busy,
  repoPath,
  selectedCommit,
  commitComposer,
  onSidebarTab,
  onChangedOnly,
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
        onSwitch={onSwitchBranch}
        onCreate={onCreateBranch}
        onRename={onRenameBranch}
        onDelete={onDeleteBranch}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex w-[309px] shrink-0 flex-col gap-2 overflow-y-auto px-3">
          <SidebarCardDirectory
            state={directoryState(commitOpen, composerOpen)}
            onClick={commitOpen && !composerOpen ? onLeaveCommit : undefined}
          >
            {composerOpen ? (
              <CreateCommitCard locale={locale} busy={busy} onCancel={onCancelComposer} onCreate={onCreateCommit} />
            ) : (
              <UncommittedFilesCard
                locale={locale}
                dirty={dirty}
                counts={counts}
                changedOnly={changedOnly}
                onChangedOnly={onChangedOnly}
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
              status={status}
              commits={commits}
              busy={busy}
              repoPath={repoPath}
              selectedCommit={selectedCommit}
              onCreateRepository={onCreateRepository}
              onSelectCommit={onSelectCommit}
            />
          ) : (
            <StageList locale={locale} />
          )}
        </div>
      </div>
      <HeaderSettings userName={userName} onSettings={onSettings} />
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
  status,
  commits,
  busy,
  repoPath,
  selectedCommit,
  onCreateRepository,
  onSelectCommit,
}: {
  locale: Locale;
  folderEmpty: boolean;
  hasCommits: boolean;
  status: StatusSnapshot | null;
  commits: CommitSummary[];
  busy?: boolean;
  repoPath: string;
  selectedCommit?: string | null;
  onCreateRepository: () => void;
  onSelectCommit: (hash: string) => void;
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

  if (!hasCommits && !folderEmpty) {
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
