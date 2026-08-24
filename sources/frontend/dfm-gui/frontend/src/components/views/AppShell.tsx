import { ProjectViewPanel } from "@/components/panels/ProjectViewPanel";
import { ContentViewPanel } from "@/components/panels/ContentViewPanel";
import { useAppStore } from "@/store/app-store";

type AppShellProps = {
  onSettings: () => void;
};

export function AppShell({ onSettings }: AppShellProps) {
  const locale = useAppStore((s) => s.locale);
  const userName = useAppStore((s) => s.userName);
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const changedOnly = useAppStore((s) => s.changedOnly);
  const status = useAppStore((s) => s.status);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const setChangedOnly = useAppStore((s) => s.setChangedOnly);

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-background-light">
      <div className="flex min-h-0 w-full flex-1 items-stretch">
        <ProjectViewPanel
          locale={locale}
          userName={userName}
          branchName={status?.current_branch}
          sidebarTab={sidebarTab}
          changedOnly={changedOnly}
          onSidebarTab={setSidebarTab}
          onChangedOnly={setChangedOnly}
          onSettings={onSettings}
        />
        <ContentViewPanel locale={locale} />
      </div>
    </div>
  );
}
