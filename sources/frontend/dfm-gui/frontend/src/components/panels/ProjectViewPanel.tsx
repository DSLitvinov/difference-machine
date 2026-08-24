import { HeaderSelectBranch } from "@/components/items/HeaderSelectBranch";
import { HeaderSettings } from "@/components/items/HeaderSettings";
import { SidebarCardDirectory } from "@/components/items/SidebarCardDirectory";
import { UncommittedFilesCard } from "@/components/atoms/UncommittedFilesCard";
import { NoHistoryProject } from "@/components/atoms/NoHistoryProject";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t, type Locale } from "@/lib/i18n";
import type { SidebarTab } from "@/lib/view";

type ProjectViewPanelProps = {
  locale: Locale;
  userName: string;
  branchName?: string;
  sidebarTab: SidebarTab;
  changedOnly: boolean;
  onSidebarTab: (tab: SidebarTab) => void;
  onChangedOnly: (value: boolean) => void;
  onSettings: () => void;
};

export function ProjectViewPanel({
  locale,
  userName,
  branchName,
  sidebarTab,
  changedOnly,
  onSidebarTab,
  onChangedOnly,
  onSettings,
}: ProjectViewPanelProps) {
  const copy = t(locale);
  return (
    <aside className="flex h-full w-[309px] shrink-0 flex-col overflow-hidden">
      <HeaderSelectBranch locale={locale} branchName={branchName} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex w-[309px] flex-col gap-2 px-3">
          <SidebarCardDirectory state="selected">
            <UncommittedFilesCard locale={locale} dirty={false} changedOnly={changedOnly} onChangedOnly={onChangedOnly} />
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
            <div className="flex w-full rounded-md border border-border bg-background-muted p-3">
              <NoHistoryProject locale={locale} />
            </div>
          ) : null}
        </div>
      </div>
      <HeaderSettings userName={userName} onSettings={onSettings} />
    </aside>
  );
}
