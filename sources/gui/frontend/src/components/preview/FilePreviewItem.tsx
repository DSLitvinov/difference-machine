import { File } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VcsFileStatus } from "@/wails/forester";
import { vcsBadgeLabel } from "@/wails/forester";

interface FilePreviewItemProps {
  name: string;
  path: string;
  selected: boolean;
  vcsStatus: VcsFileStatus | null;
  onSelect: () => void;
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
    <button
      type="button"
      className={cn(
        "relative flex w-full flex-col items-center gap-2 rounded-md p-2 text-center text-sm transition-colors",
        selected ? "border border-ring bg-accent" : "border border-transparent hover:bg-accent",
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
          <span
            className="absolute -bottom-1 -left-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
            title={vcsStatus ?? undefined}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <span className="line-clamp-2 w-full break-all text-xs">{name}</span>
    </button>
  );
}
