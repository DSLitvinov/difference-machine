import { type ReactNode } from "react";
import {
  FolderGit2,
  GalleryVerticalEnd,
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
  onSettingsClick?: () => void;
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

export function SidebarRail({ onSettingsClick }: SidebarRailProps) {
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
      <div className="flex flex-col items-center gap-1 p-2">
        <RailButton label={t("common.home")} onClick={() => {}}>
          <GalleryVerticalEnd className="h-4 w-4" />
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

export function SidebarCollapseButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute -right-3 top-3 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-sm"
      onClick={onClick}
      title={t("common.collapseSidebar")}
      aria-label={t("common.collapseSidebar")}
    >
      <PanelLeft className="h-3.5 w-3.5" />
    </Button>
  );
}
