import { type ReactNode } from "react";
import {
  FolderGit2,
  GitFork,
  PanelLeft,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { switchSidebarMode } from "@/lib/sidebarModeSwitch";
import { userDisplayInitials } from "@/lib/userInitials";
import { cn } from "@/lib/utils";
import { useAppStore, type SidebarMode } from "@/stores/appStore";

interface SidebarRailProps {
  collapsed?: boolean;
  onSettingsClick?: () => void;
  onToggleCollapse?: () => void;
}

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 rounded-sm",
        active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
      )}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

export function SidebarCollapseButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  const t = useT();
  const label = expanded ? t("common.collapseSidebar") : t("common.expandSidebar");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}

export function SidebarPanelTitleBar({
  title,
  onCollapse,
}: {
  title: string;
  onCollapse: () => void;
}) {
  return (
    <div className="flex h-6 items-center gap-2">
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold leading-6 text-foreground">
        {title}
      </h1>
      <SidebarCollapseButton expanded onClick={onCollapse} />
    </div>
  );
}

export function SidebarRail({ collapsed = false, onSettingsClick, onToggleCollapse }: SidebarRailProps) {
  const t = useT();
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const userName = useAppStore((s) => s.userName);
  const avatarLabel = userName.trim() || t("common.user");
  const avatarInitials = userDisplayInitials(userName);

  const switchMode = (mode: SidebarMode) => {
    switchSidebarMode(mode);
  };

  return (
    <aside className="flex h-full w-12 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex flex-col items-center gap-2 p-2">
        {collapsed && onToggleCollapse ? (
          <SidebarCollapseButton expanded={false} onClick={onToggleCollapse} />
        ) : null}
        <RailButton label={t("common.home")} onClick={() => {}}>
          <img src="/app-icon-32.png" alt="" className="h-4 w-4" draggable={false} />
        </RailButton>
        <RailButton
          active={sidebarMode === "project"}
          label={t("common.projectView")}
          onClick={() => switchMode("project")}
        >
          <FolderGit2 className="h-4 w-4" />
        </RailButton>
        <RailButton
          active={sidebarMode === "history"}
          label={t("common.history")}
          onClick={() => switchMode("history")}
        >
          <GitFork className="h-4 w-4" />
        </RailButton>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-1 p-2">
        <RailButton label={t("common.settings")} onClick={() => onSettingsClick?.()}>
          <Settings className="h-4 w-4" />
        </RailButton>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
          title={avatarLabel}
          aria-label={avatarLabel}
        >
          {avatarInitials}
        </div>
      </div>
    </aside>
  );
}
