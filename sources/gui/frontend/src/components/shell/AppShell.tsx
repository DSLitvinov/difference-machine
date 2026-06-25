import { useEffect, useState } from "react";
import { EventsOn, WindowSetMinSize } from "../../../wailsjs/runtime/runtime";

import { ContentInfoPanel } from "@/components/info/ContentInfoPanel";
import { HistoryPreviewPanel } from "@/components/preview/HistoryPreviewPanel";
import {
  bootstrapRepositories,
  ProjectSidebarPanel,
} from "@/components/sidebar/ProjectSidebarPanel";
import { HistorySidebarPanel } from "@/components/sidebar/HistorySidebarPanel";
import { ProjectPreviewPanel } from "@/components/preview/ProjectPreviewPanel";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { AppToast } from "@/components/shell/AppToast";
import { PanelResizeHandle } from "@/components/shell/PanelResizeHandle";
import { SidebarCollapseButton, SidebarRail } from "@/components/shell/SidebarRail";
import { usePanelLayout } from "@/hooks/usePanelLayout";
import { useProjectStatusPolling } from "@/hooks/useProjectStatusPolling";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_HISTORY,
  MIN_WINDOW_HISTORY_COLLAPSED,
  MIN_WINDOW_PROJECT,
  MIN_WINDOW_PROJECT_COLLAPSED,
  PREVIEW_MIN,
} from "@/lib/layout";
import { switchSidebarMode } from "@/lib/sidebarModeSwitch";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";

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

  const {
    sidebarMainWidth,
    previewWidth,
    infoWidth,
    startSidebarResize,
    startInfoResize,
    showSidebarHandle,
  } = usePanelLayout(sidebarMode, sidebarCollapsed);

  useEffect(() => {
    void bootstrapRepositories(setRepo, setError, setLoading);
  }, [setRepo, setError, setLoading]);

  useEffect(() => {
    if (!repoPath) {
      useHistoryStore.getState().reset();
    }
  }, [repoPath]);

  useEffect(() => {
    const minWidth =
      sidebarMode === "project"
        ? sidebarCollapsed
          ? MIN_WINDOW_PROJECT_COLLAPSED
          : MIN_WINDOW_PROJECT
        : sidebarCollapsed
          ? MIN_WINDOW_HISTORY_COLLAPSED
          : MIN_WINDOW_HISTORY;
    WindowSetMinSize(minWidth, MIN_WINDOW_HEIGHT);
  }, [sidebarMode, sidebarCollapsed]);

  useProjectStatusPolling();

  useEffect(() => {
    const cleanups = [
      EventsOn("gui:open-settings", () => setSettingsOpen(true)),
      EventsOn("gui:switch-mode", (mode: unknown) => {
        if (mode === "project" || mode === "history") {
          switchSidebarMode(mode);
        }
      }),
      EventsOn("gui:toggle-sidebar", () => {
        const collapsed = useAppStore.getState().sidebarCollapsed;
        useAppStore.getState().setSidebarCollapsed(!collapsed);
      }),
    ];
    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, []);

  const showInfo = sidebarMode === "project";

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-sidebar">
      <SidebarRail onSettingsClick={() => setSettingsOpen(true)} />

      {!sidebarCollapsed ? (
        <div
          className="relative flex min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
          style={{ width: sidebarMainWidth, minWidth: sidebarMainWidth }}
        >
          <SidebarCollapseButton onClick={() => setSidebarCollapsed(true)} />
          {sidebarMode === "project" ? (
            <ProjectSidebarPanel />
          ) : (
            <HistorySidebarPanel />
          )}
        </div>
      ) : null}

      {showSidebarHandle ? <PanelResizeHandle onMouseDown={startSidebarResize} /> : null}

      <main
        className="flex min-h-0 shrink-0 flex-col bg-background"
        style={{ width: previewWidth, minWidth: PREVIEW_MIN }}
      >
        {loading && !repoPath ? (
          <PlaceholderPanel title="Loading" subtitle="Opening repository…" />
        ) : sidebarMode === "project" ? (
          <ProjectPreviewPanel />
        ) : (
          <HistoryPreviewPanel />
        )}
      </main>

      {showInfo ? (
        <>
          <PanelResizeHandle onMouseDown={startInfoResize} />
          <aside
            className={!repoPath ? "flex min-h-0 shrink-0 flex-col border-l border-border bg-background opacity-60" : "flex min-h-0 shrink-0 flex-col border-l border-border bg-background"}
            style={{ width: infoWidth, minWidth: infoWidth }}
          >
            <ContentInfoPanel />
          </aside>
        </>
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

      <AppToast />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
