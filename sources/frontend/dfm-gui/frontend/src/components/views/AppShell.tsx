import { ProjectViewPanel } from "@/components/panels/ProjectViewPanel";
import { ContentViewPanel } from "@/components/panels/ContentViewPanel";
import { FileInfoPanel } from "@/components/panels/FileInfoPanel";
import { showRightColumn } from "@/lib/view";
import { useAppStore, useDerivedView } from "@/store/app-store";

type AppShellProps = {
  busy?: boolean;
  onSettings: () => void;
  onCreateRepository: () => void;
};

export function AppShell({ busy, onSettings, onCreateRepository }: AppShellProps) {
  const locale = useAppStore((s) => s.locale);
  const userName = useAppStore((s) => s.userName);
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const changedOnly = useAppStore((s) => s.changedOnly);
  const status = useAppStore((s) => s.status);
  const commits = useAppStore((s) => s.commits);
  const entries = useAppStore((s) => s.entries);
  const folderPath = useAppStore((s) => s.folderPath);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const setChangedOnly = useAppStore((s) => s.setChangedOnly);
  const setFolderPath = useAppStore((s) => s.setFolderPath);
  const view = useDerivedView();

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-background-light">
      <div className="flex min-h-0 w-full flex-1 items-stretch">
        <ProjectViewPanel
          locale={locale}
          userName={userName}
          view={view}
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
        <ContentViewPanel locale={locale} folderPath={folderPath} entries={entries} onNavigate={setFolderPath} />
        {showRightColumn(view) ? <FileInfoPanel locale={locale} /> : null}
      </div>
    </div>
  );
}
