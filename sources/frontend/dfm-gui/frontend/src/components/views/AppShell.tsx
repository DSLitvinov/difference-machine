import { ProjectViewPanel } from "@/components/panels/ProjectViewPanel";
import { FileViewPanel } from "@/components/panels/FileViewPanel";
import { ContentViewPanel } from "@/components/panels/ContentViewPanel";
import { ContentFilePanel } from "@/components/panels/ContentFilePanel";
import { ContentCommitPanel } from "@/components/panels/ContentCommitPanel";
import { FileInfoPanel } from "@/components/panels/FileInfoPanel";
import { SelectMoreFilesPanel } from "@/components/panels/SelectMoreFilesPanel";
import { foresterCall } from "@/lib/bridge";
import { showRightColumn } from "@/lib/view";
import { useAppStore, useDerivedView } from "@/store/app-store";
import type { CreateCommitFields } from "@/components/atoms/CreateCommitCard";

type AppShellProps = {
  busy?: boolean;
  onSettings: () => void;
  onCreateRepository: () => void;
  onApplySelection: (paths: string[]) => void;
  onNeedMore: () => void;
  onCommitAll: () => void;
  onCancelComposer: () => void;
  onCreateCommit: (fields: CreateCommitFields) => void;
};

export function AppShell({
  busy,
  onSettings,
  onCreateRepository,
  onApplySelection,
  onNeedMore,
  onCommitAll,
  onCancelComposer,
  onCreateCommit,
}: AppShellProps) {
  const locale = useAppStore((s) => s.locale);
  const userName = useAppStore((s) => s.userName);
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const changedOnly = useAppStore((s) => s.changedOnly);
  const status = useAppStore((s) => s.status);
  const commits = useAppStore((s) => s.commits);
  const entries = useAppStore((s) => s.entries);
  const entriesHasMore = useAppStore((s) => s.entriesHasMore);
  const repoPath = useAppStore((s) => s.repoPath);
  const folderPath = useAppStore((s) => s.folderPath);
  const selection = useAppStore((s) => s.selection);
  const infoCollapsed = useAppStore((s) => s.infoCollapsed);
  const folderEmpty = useAppStore((s) => s.folderEmpty);
  const hasCommits = useAppStore((s) => s.hasCommits);
  const locks = useAppStore((s) => s.locks);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const setChangedOnly = useAppStore((s) => s.setChangedOnly);
  const setFolderPath = useAppStore((s) => s.setFolderPath);
  const setSelection = useAppStore((s) => s.setSelection);
  const setInfoCollapsed = useAppStore((s) => s.setInfoCollapsed);
  const setContentContext = useAppStore((s) => s.setContentContext);
  const openFile = useAppStore((s) => s.openFile);
  const openCommit = useAppStore((s) => s.openCommit);
  const leaveCommit = useAppStore((s) => s.leaveCommit);
  const selectedCommit = useAppStore((s) => s.selectedCommit);
  const commitComposer = useAppStore((s) => s.commitComposer);
  const view = useDerivedView();
  const showRight = showRightColumn(view) && !infoCollapsed;
  const filePath = selection[0] ?? "";
  const fileView = view === "file-view" && Boolean(filePath);
  const commitInspect = view === "view-commit" ? commits.find((item) => item.hash === selectedCommit) : undefined;
  const moreFiles = view === "create-commit" || selection.length > 1;

  async function openExternal() {
    if (!filePath) {
      return;
    }
    try {
      await foresterCall("workdir.open", { path: filePath });
    } catch {
      useAppStore.getState().setToast("request failed");
    }
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-background-light">
      <div className="flex min-h-0 w-full flex-1 items-stretch">
        {fileView ? (
          <FileViewPanel
            locale={locale}
            userName={userName}
            path={filePath}
            status={status}
            onSettings={onSettings}
            onBack={() => setContentContext("folder")}
          />
        ) : (
          <ProjectViewPanel
            locale={locale}
            userName={userName}
            folderEmpty={folderEmpty}
            hasCommits={hasCommits}
            status={status}
            commits={commits}
            branchName={status?.current_branch}
            sidebarTab={sidebarTab}
            changedOnly={changedOnly}
            busy={busy}
            repoPath={repoPath}
            selectedCommit={selectedCommit}
            commitComposer={commitComposer === "open"}
            onSidebarTab={setSidebarTab}
            onChangedOnly={setChangedOnly}
            onSettings={onSettings}
            onCreateRepository={onCreateRepository}
            onSelectCommit={openCommit}
            onLeaveCommit={leaveCommit}
            onCommitAll={onCommitAll}
            onCancelComposer={onCancelComposer}
            onCreateCommit={onCreateCommit}
          />
        )}
        {fileView ? (
          <ContentFilePanel
            locale={locale}
            repoPath={repoPath}
            path={filePath}
            entries={entries}
            collapsed={infoCollapsed}
            onBack={() => setContentContext("folder")}
            onApply={() => onApplySelection([filePath])}
            onExpandInfo={() => setInfoCollapsed(false)}
            onOpenExternal={() => void openExternal()}
          />
        ) : commitInspect ? (
          <ContentCommitPanel
            locale={locale}
            repoPath={repoPath}
            commit={commitInspect}
            head={Boolean(commitInspect.hash && commitInspect.hash === status?.head_commit)}
          />
        ) : (
          <ContentViewPanel
            locale={locale}
            repoPath={repoPath}
            folderPath={folderPath}
            entries={entries}
            selection={selection}
            status={status}
            locks={locks}
            changedOnly={changedOnly}
            hasMore={entriesHasMore}
            collapsed={infoCollapsed}
            onNavigate={setFolderPath}
            onSelect={setSelection}
            onExpandInfo={() => setInfoCollapsed(false)}
            onNeedMore={onNeedMore}
            onOpenFile={openFile}
          />
        )}
        {showRight ? (
          moreFiles ? (
            <SelectMoreFilesPanel
              locale={locale}
              paths={selection}
              entries={entries}
              onCollapse={() => setInfoCollapsed(true)}
              onApply={onApplySelection}
            />
          ) : (
            <FileInfoPanel
              locale={locale}
              path={selection[0] ?? null}
              status={status}
              locks={locks}
              onCollapse={() => setInfoCollapsed(true)}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
