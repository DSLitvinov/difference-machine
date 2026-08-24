import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { HeaderSelectBranch } from "@/components/items/HeaderSelectBranch";
import { HeaderSettings } from "@/components/items/HeaderSettings";
import { SidebarCard } from "@/components/items/SidebarCard";
import { BackToFileRow } from "@/components/atoms/BackToFileRow";
import { CommitFileCard } from "@/components/atoms/CommitFileCard";
import { NoHistoryFile } from "@/components/atoms/NoHistoryFile";
import { CommitCardMoreButton, type CommitCardAction } from "@/components/items/CommitCardMenu";
import { t, type Locale } from "@/lib/i18n";
import { foresterCall } from "@/lib/bridge";
import { cn } from "@/lib/utils";
import type { BranchSummary, CommitSummary, StatusSnapshot } from "@/store/app-store";

type FileViewPanelProps = {
  locale: Locale;
  userName: string;
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
  onDeleteBranch: (name: string) => void;
  onCommitAction: (action: CommitCardAction, commit: CommitSummary) => void;
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
  onCommitAction,
  switchLocked,
}: FileViewPanelProps) {
  const copy = t(locale);
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
      />
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", empty && "gap-2")}>
        <div className="flex w-[309px] shrink-0 flex-col gap-2 px-3">
          <SidebarCard
            state={empty ? "disabled" : revisionOpen ? "default" : "selected"}
            className={revisionOpen ? undefined : "border-dashed"}
            onClick={onCurrentPreview}
          >
            <BackToFileRow locale={locale} />
          </SidebarCard>
        </div>
        <div className="flex w-full shrink-0 items-center p-3">
          <p className="text-[16px] font-semibold leading-6 text-background-primary">{copy.historyOfFile}</p>
        </div>
        {empty ? (
          <div className="flex min-h-0 w-[309px] flex-1 flex-col px-3">
            <SidebarCard state="disabled">
              <NoHistoryFile locale={locale} />
            </SidebarCard>
          </div>
        ) : (
          <div ref={scrollRef} className="min-h-0 w-[309px] flex-1 overflow-y-auto px-3">
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((row) => {
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
                    <SidebarCard
                      state={commit.hash === selectedHash ? "selected" : "default"}
                      onClick={() => onSelectCommit(commit)}
                    >
                      <CommitFileCard
                        title={title}
                        author={commit.author ?? ""}
                        description={description}
                        timestamp={commit.timestamp ?? 0}
                        head={Boolean(commit.hash && commit.hash === status?.head_commit)}
                        merge={(commit.parent_hashes?.length ?? 0) > 1}
                        tag={commit.tag}
                        more={
                          <CommitCardMoreButton
                            hash={commit.hash}
                            message={commit.message ?? ""}
                            onAction={(action) => onCommitAction(action, commit)}
                          />
                        }
                      />
                    </SidebarCard>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <HeaderSettings userName={userName} onSettings={onSettings} />
    </aside>
  );
}
