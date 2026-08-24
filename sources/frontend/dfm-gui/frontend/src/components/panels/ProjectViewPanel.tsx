import { useEffect, useRef, type ReactNode } from "react";
import { HeaderSelectBranch } from "@/components/items/HeaderSelectBranch";
import { HeaderSettings } from "@/components/items/HeaderSettings";
import { SidebarCard } from "@/components/items/SidebarCard";
import { SidebarCardDirectory } from "@/components/items/SidebarCardDirectory";
import { CommitProjectCard } from "@/components/atoms/CommitProjectCard";
import { UncommittedFilesCard } from "@/components/atoms/UncommittedFilesCard";
import { NoHistoryProject } from "@/components/atoms/NoHistoryProject";
import { NullRepositoryPlaceholder } from "@/components/placeholders/NullRepositoryPlaceholder";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t, type Locale } from "@/lib/i18n";
import { changeCounts, isDirty } from "@/lib/status";
import { peekStat, requestStat, useRevisionEpoch } from "@/lib/revision-cache";
import type { SidebarTab } from "@/lib/view";
import type { CommitSummary, StatusSnapshot } from "@/store/app-store";

type ProjectViewPanelProps = {
  locale: Locale;
  userName: string;
  folderEmpty: boolean;
  hasCommits: boolean;
  status: StatusSnapshot | null;
  commits: CommitSummary[];
  branchName?: string;
  sidebarTab: SidebarTab;
  changedOnly: boolean;
  busy?: boolean;
  repoPath: string;
  selectedCommit?: string | null;
  onSidebarTab: (tab: SidebarTab) => void;
  onChangedOnly: (value: boolean) => void;
  onSettings: () => void;
  onCreateRepository: () => void;
  onSelectCommit: (hash: string) => void;
  onLeaveCommit: () => void;
};

function splitMessage(message: string): { title: string; description: string } {
  const trimmed = message.trim();
  const nl = trimmed.indexOf("\n");
  if (nl === -1) {
    return { title: trimmed, description: "" };
  }
  return { title: trimmed.slice(0, nl).trim(), description: trimmed.slice(nl + 1).trim() };
}

function directoryState(
  folderEmpty: boolean,
  hasCommits: boolean,
  commitOpen: boolean,
): "default" | "selected" | "disabled" {
  if (commitOpen) {
    return "default";
  }
  if (folderEmpty && !hasCommits) {
    return "selected";
  }
  if (!hasCommits) {
    return "disabled";
  }
  return "default";
}

export function ProjectViewPanel({
  locale,
  userName,
  folderEmpty,
  hasCommits,
  status,
  commits,
  branchName,
  sidebarTab,
  changedOnly,
  busy,
  repoPath,
  selectedCommit,
  onSidebarTab,
  onChangedOnly,
  onSettings,
  onCreateRepository,
  onSelectCommit,
  onLeaveCommit,
}: ProjectViewPanelProps) {
  const copy = t(locale);
  const dirty = hasCommits && isDirty(status);
  const counts = changeCounts(status);
  const commitOpen = Boolean(selectedCommit);
  return (
    <aside className="flex h-full w-[309px] shrink-0 flex-col overflow-hidden">
      <HeaderSelectBranch locale={locale} branchName={branchName} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex w-[309px] flex-col gap-2 px-3">
          <SidebarCardDirectory
            state={directoryState(folderEmpty, hasCommits, commitOpen)}
            onClick={commitOpen ? onLeaveCommit : undefined}
          >
            <UncommittedFilesCard locale={locale} dirty={dirty} counts={counts} changedOnly={changedOnly} onChangedOnly={onChangedOnly} />
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
        <div className="flex min-h-0 w-[309px] flex-1 flex-col overflow-y-auto px-3">
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
          ) : null}
        </div>
      </div>
      <HeaderSettings userName={userName} onSettings={onSettings} />
    </aside>
  );
}

function VisibleCommitCard({
  hash,
  repoPath,
  selected,
  children,
  onSelect,
}: {
  hash: string;
  repoPath: string;
  selected?: boolean;
  children: ReactNode;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestStat(repoPath, hash);
        }
      },
      { rootMargin: "160px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [repoPath, hash]);
  return (
    <div ref={ref}>
      <SidebarCard state={selected ? "selected" : "default"} onClick={onSelect}>
        {children}
      </SidebarCard>
    </div>
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
  useRevisionEpoch();
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
    <div className="flex w-full flex-col gap-2">
      {commits.map((commit) => {
        const { title, description } = splitMessage(commit.message ?? "");
        const stat = peekStat(repoPath, commit.hash);
        return (
          <VisibleCommitCard
            key={commit.hash}
            hash={commit.hash}
            repoPath={repoPath}
            selected={commit.hash === selectedCommit}
            onSelect={() => onSelectCommit(commit.hash)}
          >
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
          </VisibleCommitCard>
        );
      })}
    </div>
  );
}
