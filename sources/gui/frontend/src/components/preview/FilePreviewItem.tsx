import type { MouseEvent } from "react";
import { File } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isMaxThumbVisual } from "@/lib/previewScale";
import { cn } from "@/lib/utils";
import type { VcsFileStatus } from "@/wails/forester";
import { vcsBadgeLabel } from "@/wails/forester";

interface FilePreviewItemProps {
  name: string;
  path: string;
  selected: boolean;
  thumbScale?: number;
  subtitle?: string;
  vcsStatus: VcsFileStatus | null;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
}

export function FilePreviewItem({
  name,
  selected,
  thumbScale = 48,
  subtitle,
  vcsStatus,
  onSelect,
  onOpen,
}: FilePreviewItemProps) {
  const badge = vcsStatus ? vcsBadgeLabel(vcsStatus) : null;
  const dimmed = vcsStatus === "deleted" || vcsStatus === "staged-deleted";
  const maxVisual = isMaxThumbVisual(thumbScale);
  const iconSize = Math.max(16, Math.round(thumbScale * 0.5));

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "relative h-auto w-full flex-col gap-2 rounded-md p-2 text-center text-sm font-normal",
        selected ? "border border-ring bg-accent" : "border border-transparent",
      )}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
    >
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-center rounded-md border border-border",
            maxVisual && "bg-muted/40",
            dimmed && "opacity-50",
          )}
          style={{ width: thumbScale, height: thumbScale }}
        >
          <File className="text-muted-foreground" style={{ width: iconSize, height: iconSize }} />
        </div>
        {badge ? (
          <Badge
            className={cn(
              "absolute h-[22px] min-w-[22px] justify-center rounded-full px-1.5 text-xs font-semibold",
              maxVisual ? "bottom-0 left-1/2 -translate-x-1/2" : "-bottom-1 -left-1",
            )}
            title={vcsStatus ?? undefined}
          >
            {badge}
          </Badge>
        ) : null}
      </div>
      <span className="line-clamp-2 w-full break-all text-xs" title={name}>
        {name}
      </span>
      {subtitle ? (
        <span className="line-clamp-1 w-full text-[10px] text-muted-foreground" title={subtitle}>
          {subtitle}
        </span>
      ) : null}
    </Button>
  );
}
