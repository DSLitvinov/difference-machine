import { ProjectViewPanel } from "@/components/panels/ProjectViewPanel";
import { FileViewPanel } from "@/components/panels/FileViewPanel";
import { ContentViewPanel } from "@/components/panels/ContentViewPanel";
import { ContentFilePanel } from "@/components/panels/ContentFilePanel";
import { ContentFileHistoryPanel } from "@/components/panels/ContentFileHistoryPanel";
import { ContentCommitPanel } from "@/components/panels/ContentCommitPanel";
import { FileInfoPanel } from "@/components/panels/FileInfoPanel";
import { SelectMoreFilesPanel } from "@/components/panels/SelectMoreFilesPanel";
import { foresterCall } from "@/lib/bridge";
import { parentRel } from "@/lib/folder-query";
import { showRightColumn } from "@/lib/view";
import { useAppStore, useDerivedView, type CommitSummary, type StashSummary } from "@/store/app-store";
import type { CreateCommitFields } from "@/components/atoms/CreateCommitCard";
import type { CommitCardAction } from "@/components/items/CommitCardMenu";
import type { FileWorkdirAction } from "@/components/items/FilePreviewItemMenu";
import type { StashCardAction } from "@/components/items/StashCardMenu";

type AppShellProps = {
  busy?: boolean;
  onSettings: () => void;
  onCreateRepository: () => void;
  onCreateCommitFromSelection: (paths: string[]) => void;
  onNeedMore: () => void;
  onCommitAll: () => void;
  onCancelComposer: () => void;
  onCreateCommit: (fields: CreateCommitFields) => void;
  onCompareFile: () => void;
  onRestoreFile: () => Promise<boolean>;
  onSwitchBranch: (name: string) => void;
  onCreateBranch: () => void;
  onRenameBranch: () => void;
  onDeleteBranch: (name: string) => void;
  onOpenMerge: () => void;
  onAddInCommit: (paths: string[]) => void;
  onRenameFile: (path: string) => void;
  onDeleteFile: (paths: string[]) => void;
  onOpenInFolder: (path: string) => void;
  onEditIn: (path: string, editor: string) => void;
  onToggleLock: (path: string) => void;
  onCommitAction: (action: CommitCardAction, commit: CommitSummary) => void;
  onStashAction: (action: StashCardAction, stash: StashSummary) => void;
  onRefresh: () => Promise<void>;
};

export function AppShell({
  busy,
  onSettings,
  onCreateRepository,
  onCreateCommitFromSelection,
  onNeedMore,
  onCommitAll,
  onCancelComposer,
  onCreateCommit,
  onCompareFile,
  onRestoreFile,
  onSwitchBranch,
  onCreateBranch,
  onRenameBranch,
  onDeleteBranch,
  onOpenMerge,
  onAddInCommit,
  onRenameFile,
  onDeleteFile,
  onOpenInFolder,
  onEditIn,
  onToggleLock,
  onCommitAction,
  onStashAction,
  onRefresh,
}: AppShellProps) {
  const locale = useAppStore((s) => s.locale);
  const userName = useAppStore((s) => s.userName);
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const changedOnly = useAppStore((s) => s.changedOnly);
  const status = useAppStore((s) => s.status);
  const commits = useAppStore((s) => s.commits);
  const stashes = useAppStore((s) => s.stashes);
  const branches = useAppStore((s) => s.branches);
  const mergeStatus = useAppStore((s) => s.mergeStatus);
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
  const openFileRevision = useAppStore((s) => s.openFileRevision);
  const leaveFileRevision = useAppStore((s) => s.leaveFileRevision);
  const leaveCommit = useAppStore((s) => s.leaveCommit);
  const selectedCommit = useAppStore((s) => s.selectedCommit);
  const fileRevision = useAppStore((s) => s.fileRevision);
  const commitComposer = useAppStore((s) => s.commitComposer);
  const view = useDerivedView();
  const showRight = showRightColumn(view) && !infoCollapsed;
  const filePath = selection[0] ?? "";
  const fileLeft = (view === "file-view" || view === "file-history") && Boolean(filePath);
  const commitInspect = view === "view-commit" ? commits.find((item) => item.hash === selectedCommit) : undefined;
  const moreFiles = view === "create-commit" || (view !== "stages" && view !== "stashes-null" && selection.length > 1);
  const stashSidebar = view === "stages" || view === "stashes-null";
  const mergeLocked = Boolean(mergeStatus.in_progress);

  function applyWorkdirAction(paths: string[], action: FileWorkdirAction) {
    if (paths.length === 0) {
      return;
    }
    switch (action.kind) {
      case "addInCommit":
        onAddInCommit(paths);
        break;
      case "rename":
        onRenameFile(paths[0]);
        break;
      case "openInFolder": {
        const seen = new Set<string>();
        for (const path of paths) {
          const parent = parentRel(path);
          if (seen.has(parent)) {
            continue;
          }
          seen.add(parent);
          onOpenInFolder(path);
        }
        break;
      }
      case "editIn":
        for (const path of paths) {
          onEditIn(path, action.editor);
        }
        break;
      case "toggleLock": {
        const allLocked = paths.every((path) => locks.some((item) => item.file_path === path));
        for (const path of paths) {
          const locked = locks.some((item) => item.file_path === path);
          if (allLocked || !locked) {
            onToggleLock(path);
          }
        }
        break;
      }
      case "deleteInProject":
        onDeleteFile(paths);
        break;
    }
  }

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
        {fileLeft ? (
          <FileViewPanel
            locale={locale}
            userName={userName}
            path={filePath}
            status={status}
            branches={branches}
            selectedHash={fileRevision?.hash ?? null}
            switchLocked={mergeLocked}
            onSettings={onSettings}
            onCurrentPreview={leaveFileRevision}
            onSelectCommit={openFileRevision}
            onSwitchBranch={onSwitchBranch}
            onCreateBranch={onCreateBranch}
            onRenameBranch={onRenameBranch}
            onDeleteBranch={onDeleteBranch}
            onMerge={onOpenMerge}
            onCommitAction={onCommitAction}
          />
        ) : (
          <ProjectViewPanel
            locale={locale}
            userName={userName}
            folderEmpty={folderEmpty}
            hasCommits={hasCommits}
            status={status}
            commits={commits}
            stashes={stashes}
            branches={branches}
            branchName={status?.current_branch}
            sidebarTab={sidebarTab}
            busy={busy}
            repoPath={repoPath}
            selectedCommit={selectedCommit}
            commitComposer={commitComposer === "open"}
            switchLocked={mergeLocked}
            onSidebarTab={setSidebarTab}
            onSettings={onSettings}
            onCreateRepository={onCreateRepository}
            onSelectCommit={openCommit}
            onLeaveCommit={leaveCommit}
            onCommitAll={onCommitAll}
            onCancelComposer={onCancelComposer}
            onCreateCommit={onCreateCommit}
            onSwitchBranch={onSwitchBranch}
            onCreateBranch={onCreateBranch}
            onRenameBranch={onRenameBranch}
            onDeleteBranch={onDeleteBranch}
            onMerge={onOpenMerge}
            onCommitAction={onCommitAction}
            onStashAction={onStashAction}
          />
        )}
        {view === "file-history" && fileRevision ? (
          <ContentFileHistoryPanel
            locale={locale}
            repoPath={repoPath}
            path={filePath}
            commit={fileRevision}
            busy={busy}
            onBack={leaveFileRevision}
            onCompare={onCompareFile}
            onRevert={onRestoreFile}
            onOpenExternal={() => void openExternal()}
          />
        ) : view === "file-view" && filePath ? (
          <ContentFilePanel
            locale={locale}
            repoPath={repoPath}
            path={filePath}
            entries={entries}
            collapsed={infoCollapsed}
            locked={locks.some((item) => item.file_path === filePath)}
            onBack={() => setContentContext("folder")}
            onApply={(action) => applyWorkdirAction([filePath], action)}
            onExpandInfo={() => setInfoCollapsed(false)}
            onOpenExternal={() => void openExternal()}
          />
        ) : commitInspect ? (
          <ContentCommitPanel
            locale={locale}
            repoPath={repoPath}
            commit={commitInspect}
            head={Boolean(commitInspect.hash && commitInspect.hash === status?.head_commit)}
            busy={busy}
            onRefresh={onRefresh}
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
            forceEmpty={view === "stashes-null"}
            onNavigate={setFolderPath}
            onSelect={setSelection}
            onExpandInfo={() => setInfoCollapsed(false)}
            onNeedMore={onNeedMore}
            onChangedOnly={setChangedOnly}
            onOpenFile={openFile}
            onAddInCommit={(path) => onAddInCommit([path])}
            onRenameFile={onRenameFile}
            onDeleteFile={(path) => onDeleteFile([path])}
            onOpenInFolder={onOpenInFolder}
            onEditIn={onEditIn}
            onToggleLock={onToggleLock}
          />
        )}
        {showRight ? (
          moreFiles ? (
            <SelectMoreFilesPanel
              locale={locale}
              paths={selection}
              entries={entries}
              locks={locks}
              onCollapse={() => setInfoCollapsed(true)}
              onCreateCommit={onCreateCommitFromSelection}
              onFileAction={(action) => applyWorkdirAction(selection, action)}
            />
          ) : (
            <FileInfoPanel
              locale={locale}
              path={stashSidebar ? null : selection[0] ?? null}
              status={status}
              locks={locks}
              onCollapse={() => setInfoCollapsed(true)}
              onFileAction={(action) => applyWorkdirAction(selection.slice(0, 1), action)}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
