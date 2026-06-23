import { useEffect, useState } from "react";

import { ContentInfoPanel } from "@/components/info/ContentInfoPanel";
import { HistoryPreviewPanel } from "@/components/preview/HistoryPreviewPanel";
import {
  bootstrapRepositories,
  ProjectSidebarPanel,
} from "@/components/sidebar/ProjectSidebarPanel";
import { HistorySidebarPanel } from "@/components/sidebar/HistorySidebarPanel";
import { ProjectPreviewPanel } from "@/components/preview/ProjectPreviewPanel";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ForesterErrorBanner } from "@/components/shell/ForesterErrorBanner";
import { AppNotice } from "@/components/shell/AppNotice";
import { SidebarCollapseButton, SidebarRail } from "@/components/shell/SidebarRail";
import { useProjectStatusPolling } from "@/hooks/useProjectStatusPolling";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";

const SIDEBAR_MIN = 334;
const PREVIEW_MIN = 747;
const INFO_MIN = 354;

function PlaceholderPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm">{subtitle}</p>
    </div>
  );
}

export function AppShell() {
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const repoPath = useAppStore((s) => s.repoPath);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const setRepo = useAppStore((s) => s.setRepo);
  const setError = useAppStore((s) => s.setError);
  const setLoading = useAppStore((s) => s.setLoading);
  const loading = useAppStore((s) => s.loading);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void bootstrapRepositories(setRepo, setError, setLoading);
  }, [setRepo, setError, setLoading]);

  useEffect(() => {
    if (!repoPath) {
      useHistoryStore.getState().reset();
    }
  }, [repoPath]);

  useProjectStatusPolling();

  const showInfo = sidebarMode === "project";
  const sidebarWidth = sidebarCollapsed ? 48 : SIDEBAR_MIN;

  return (
    <div className="flex h-screen min-h-0 bg-sidebar">
      <SidebarRail onSettingsClick={() => setSettingsOpen(true)} />

      {!sidebarCollapsed ? (
        <div
          className="relative flex min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        >
          <SidebarCollapseButton onClick={() => setSidebarCollapsed(true)} />
          {sidebarMode === "project" ? (
            <ProjectSidebarPanel />
          ) : (
            <HistorySidebarPanel />
          )}
        </div>
      ) : (
        <div className="relative w-0" />
      )}

      <main
        className="flex min-h-0 min-w-0 flex-1 flex-col bg-background"
        style={{ minWidth: PREVIEW_MIN }}
      >
        <ForesterErrorBanner />
        {loading && !repoPath ? (
          <PlaceholderPanel title="Loading" subtitle="Opening repository…" />
        ) : sidebarMode === "project" ? (
          <ProjectPreviewPanel />
        ) : (
          <HistoryPreviewPanel />
        )}
      </main>

      {showInfo ? (
        <aside
          className={cn(
            "hidden shrink-0 border-l border-border bg-background xl:flex xl:flex-col",
            !repoPath && "opacity-60",
          )}
          style={{ width: INFO_MIN, minWidth: INFO_MIN }}
        >
          <ContentInfoPanel />
        </aside>
      ) : null}

      {sidebarCollapsed ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="fixed bottom-4 left-14 z-20 h-auto px-3 py-1 text-xs shadow-sm"
          onClick={() => setSidebarCollapsed(false)}
        >
          Expand sidebar
        </Button>
      ) : null}

      <AppNotice />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
