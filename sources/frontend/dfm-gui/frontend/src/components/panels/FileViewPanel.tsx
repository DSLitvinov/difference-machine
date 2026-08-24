import { useEffect, useState } from "react";
import { HeaderSelectBranch } from "@/components/items/HeaderSelectBranch";
import { HeaderSettings } from "@/components/items/HeaderSettings";
import { SidebarCard } from "@/components/items/SidebarCard";
import { BackToFileRow } from "@/components/atoms/BackToFileRow";
import { CommitFileCard } from "@/components/atoms/CommitFileCard";
import { NoHistoryFile } from "@/components/atoms/NoHistoryFile";
import { t, type Locale } from "@/lib/i18n";
import { foresterCall } from "@/lib/bridge";
import { cn } from "@/lib/utils";
import type { CommitSummary, StatusSnapshot } from "@/store/app-store";

type FileViewPanelProps = {
  locale: Locale;
  userName: string;
  path: string;
  status: StatusSnapshot | null;
  onSettings: () => void;
  onBack: () => void;
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

export function FileViewPanel({ locale, userName, path, status, onSettings, onBack }: FileViewPanelProps) {
  const copy = t(locale);
  const [commits, setCommits] = useState<CommitSummary[]>([]);

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
  }, [path]);

  const empty = commits.length === 0;

  return (
    <aside className="flex h-full w-[309px] shrink-0 flex-col overflow-hidden">
      <HeaderSelectBranch locale={locale} branchName={status?.current_branch} />
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", empty && "gap-2")}>
        <div className="flex w-[309px] shrink-0 flex-col gap-2 px-3">
          <SidebarCard state={empty ? "disabled" : "selected"} className="border-dashed" onClick={onBack}>
            <BackToFileRow locale={locale} />
          </SidebarCard>
        </div>
        <div className="flex w-full shrink-0 items-center p-3">
          <p className="text-[16px] font-semibold leading-6 text-background-primary">{copy.historyOfFile}</p>
        </div>
        <div className="flex min-h-0 w-[309px] flex-1 flex-col gap-2 overflow-y-auto px-3">
          {empty ? (
            <SidebarCard state="disabled">
              <NoHistoryFile locale={locale} />
            </SidebarCard>
          ) : (
            commits.map((commit) => {
              const { title, description } = splitMessage(commit.message ?? "");
              return (
                <SidebarCard key={commit.hash}>
                  <CommitFileCard
                    title={title}
                    author={commit.author ?? ""}
                    description={description}
                    timestamp={commit.timestamp ?? 0}
                    head={Boolean(commit.hash && commit.hash === status?.head_commit)}
                    merge={(commit.parent_hashes?.length ?? 0) > 1}
                    tag={commit.tag}
                  />
                </SidebarCard>
              );
            })
          )}
        </div>
      </div>
      <HeaderSettings userName={userName} onSettings={onSettings} />
    </aside>
  );
}
