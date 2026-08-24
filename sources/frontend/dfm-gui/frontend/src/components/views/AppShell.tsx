import { ProjectViewPanel } from "@/components/panels/ProjectViewPanel";
import { ContentViewPanel } from "@/components/panels/ContentViewPanel";
import { FileInfoPanel } from "@/components/panels/FileInfoPanel";
import { SelectMoreFilesPanel } from "@/components/panels/SelectMoreFilesPanel";
import { showRightColumn } from "@/lib/view";
import { useAppStore, useDerivedView } from "@/store/app-store";

type AppShellProps = {
  busy?: boolean;
  onSettings: () => void;
  onCreateRepository: () => void;
  onApplySelection: (paths: string[]) => void;
};

export function AppShell({ busy, onSettings, onCreateRepository, onApplySelection }: AppShellProps) {
  const locale = useAppStore((s) => s.locale);
  const userName = useAppStore((s) => s.userName);
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const changedOnly = useAppStore((s) => s.changedOnly);
  const status = useAppStore((s) => s.status);
  const commits = useAppStore((s) => s.commits);
  const entries = useAppStore((s) => s.entries);
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
  const view = useDerivedView();
  const showRight = showRightColumn(view) && !infoCollapsed;

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-background-light">
      <div className="flex min-h-0 w-full flex-1 items-stretch">
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
          onSidebarTab={setSidebarTab}
          onChangedOnly={setChangedOnly}
          onSettings={onSettings}
          onCreateRepository={onCreateRepository}
        />
        <ContentViewPanel
          locale={locale}
          folderPath={folderPath}
          entries={entries}
          selection={selection}
          collapsed={infoCollapsed}
          onNavigate={setFolderPath}
          onSelect={setSelection}
          onExpandInfo={() => setInfoCollapsed(false)}
        />
        {showRight ? (
          selection.length > 1 ? (
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
