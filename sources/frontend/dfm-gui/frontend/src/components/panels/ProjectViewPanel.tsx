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
  onSidebarTab: (tab: SidebarTab) => void;
  onChangedOnly: (value: boolean) => void;
  onSettings: () => void;
  onCreateRepository: () => void;
};

function splitMessage(message: string): { title: string; description: string } {
  const trimmed = message.trim();
  const nl = trimmed.indexOf("\n");
  if (nl === -1) {
    return { title: trimmed, description: "" };
  }
  return { title: trimmed.slice(0, nl).trim(), description: trimmed.slice(nl + 1).trim() };
}

function directoryState(folderEmpty: boolean, hasCommits: boolean): "default" | "selected" | "disabled" {
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
  onSidebarTab,
  onChangedOnly,
  onSettings,
  onCreateRepository,
}: ProjectViewPanelProps) {
  const copy = t(locale);
  const dirty = hasCommits && isDirty(status);
  const counts = changeCounts(status);
  return (
    <aside className="flex h-full w-[309px] shrink-0 flex-col overflow-hidden">
      <HeaderSelectBranch locale={locale} branchName={branchName} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex w-[309px] flex-col gap-2 px-3">
          <SidebarCardDirectory state={directoryState(folderEmpty, hasCommits)}>
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
              onCreateRepository={onCreateRepository}
            />
          ) : null}
        </div>
      </div>
      <HeaderSettings userName={userName} onSettings={onSettings} />
    </aside>
  );
}

function CommitList({
  locale,
  folderEmpty,
  hasCommits,
  status,
  commits,
  busy,
  onCreateRepository,
}: {
  locale: Locale;
  folderEmpty: boolean;
  hasCommits: boolean;
  status: StatusSnapshot | null;
  commits: CommitSummary[];
  busy?: boolean;
  onCreateRepository: () => void;
}) {
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
        return (
          <SidebarCard key={commit.hash}>
            <CommitProjectCard
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
      })}
    </div>
  );
}
