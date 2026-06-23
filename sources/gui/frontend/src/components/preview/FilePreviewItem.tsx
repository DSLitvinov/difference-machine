import type { MouseEvent } from "react";
import { File } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VcsFileStatus } from "@/wails/forester";
import { vcsBadgeLabel } from "@/wails/forester";

interface FilePreviewItemProps {
  name: string;
  path: string;
  selected: boolean;
  vcsStatus: VcsFileStatus | null;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
}

export function FilePreviewItem({
  name,
  selected,
  vcsStatus,
  onSelect,
  onOpen,
}: FilePreviewItemProps) {
  const badge = vcsStatus ? vcsBadgeLabel(vcsStatus) : null;
  const dimmed = vcsStatus === "deleted" || vcsStatus === "staged-deleted";

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
            "flex h-12 w-12 items-center justify-center rounded-md border border-border",
            dimmed && "opacity-50",
          )}
        >
          <File className="h-6 w-6 text-muted-foreground" />
        </div>
        {badge ? (
          <Badge
            className="absolute -bottom-1 -left-1 h-[22px] min-w-[22px] justify-center rounded-full px-1.5 text-xs font-semibold"
            title={vcsStatus ?? undefined}
          >
            {badge}
          </Badge>
        ) : null}
      </div>
      <span className="line-clamp-2 w-full break-all text-xs">{name}</span>
    </Button>
  );
}
