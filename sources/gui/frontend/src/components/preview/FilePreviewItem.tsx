import { memo, type MouseEvent } from "react";
import { File } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkdirPreview } from "@/hooks/useWorkdirPreview";
import { fileExtension, isThumbnailPreviewPath } from "@/lib/fileKinds";
import { useT } from "@/lib/i18n";
import { isMaxThumbVisual } from "@/lib/previewScale";
import { vcsStatusBadgeClass } from "@/lib/vcsBadge";
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
  lockUser?: string | null;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const FilePreviewItem = memo(function FilePreviewItem({
  name,
  path,
  selected,
  thumbScale = 48,
  subtitle,
  vcsStatus,
  lockUser,
  onSelect,
  onOpen,
  onContextMenu,
}: FilePreviewItemProps) {
  const t = useT();
  const badge = vcsStatus ? vcsBadgeLabel(vcsStatus) : null;
  const dimmed = vcsStatus === "deleted" || vcsStatus === "staged-deleted";
  const maxVisual = isMaxThumbVisual(thumbScale);
  const iconSize = Math.max(16, Math.round(thumbScale * 0.5));
  const wantsThumbnail = isThumbnailPreviewPath(path) && !dimmed;
  const previewKind = fileExtension(path) === "blend" ? "blend" : "image";
  const { previewUrl } = useWorkdirPreview(wantsThumbnail ? path : null, previewKind);

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "relative h-auto w-full flex-col gap-2 rounded-md p-2 text-center text-sm font-normal",
        selected ? "border border-ring bg-accent" : "border border-transparent",
      )}
      onClick={onSelect}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(event);
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
    >
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-md border border-border",
            maxVisual && "bg-muted/40",
            dimmed && "opacity-50",
          )}
          style={{ width: thumbScale, height: thumbScale }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className={cn(
                "h-full w-full",
                previewKind === "blend" ? "object-contain" : "object-cover",
              )}
              draggable={false}
            />
          ) : (
            <File className="text-muted-foreground" style={{ width: iconSize, height: iconSize }} />
          )}
        </div>
        {(badge || lockUser) ? (
          <div
            className={cn(
              "absolute left-1/2 flex -translate-x-1/2 items-center gap-1",
              maxVisual ? "bottom-0" : "-bottom-1",
            )}
          >
            {badge ? (
              <span
                className={cn(
                  "flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                  vcsStatusBadgeClass(vcsStatus!),
                )}
                title={vcsStatus ?? undefined}
              >
                {badge}
              </span>
            ) : null}
            {lockUser ? (
              <Badge
                variant="secondary"
                className="h-[22px] rounded-full px-1.5 text-xs font-semibold"
                title={t("info.lockedBy", { user: lockUser })}
              >
                {t("info.lock")}
              </Badge>
            ) : null}
          </div>
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
});
