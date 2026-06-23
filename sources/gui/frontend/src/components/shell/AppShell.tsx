import { useEffect } from "react";

import {
  bootstrapRepositories,
  ProjectSidebarPanel,
} from "@/components/sidebar/ProjectSidebarPanel";
import { SidebarCollapseButton, SidebarRail } from "@/components/shell/SidebarRail";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";

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

  useEffect(() => {
    void bootstrapRepositories(setRepo, setError, setLoading);
  }, [setRepo, setError, setLoading]);

  const showInfo = sidebarMode === "project";
  const sidebarWidth = sidebarCollapsed ? 48 : SIDEBAR_MIN;

  return (
    <div className="flex h-screen min-h-0 bg-sidebar">
      <SidebarRail />

      {!sidebarCollapsed ? (
        <div
          className="relative flex min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        >
          <SidebarCollapseButton onClick={() => setSidebarCollapsed(true)} />
          {sidebarMode === "project" ? (
            <ProjectSidebarPanel />
          ) : (
            <PlaceholderPanel title="History" subtitle="Commit list — coming in slice 4" />
          )}
        </div>
      ) : (
        <div className="relative w-0" />
      )}

      <main
        className="flex min-h-0 min-w-0 flex-1 flex-col bg-background"
        style={{ minWidth: PREVIEW_MIN }}
      >
        {loading && !repoPath ? (
          <PlaceholderPanel title="Loading" subtitle="Opening repository…" />
        ) : (
          <PlaceholderPanel
            title="Content Preview"
            subtitle={
              repoPath
                ? "File grid and diff views — coming in slices 2–4"
                : "Select a repository from the sidebar"
            }
          />
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
          <PlaceholderPanel title="Content Info" subtitle="File details — coming in slice 3" />
        </aside>
      ) : null}

      {sidebarCollapsed ? (
        <button
          type="button"
          className="fixed bottom-4 left-14 z-20 rounded-md border border-border bg-background px-3 py-1 text-xs shadow-sm"
          onClick={() => setSidebarCollapsed(false)}
        >
          Expand sidebar
        </button>
      ) : null}
    </div>
  );
}
