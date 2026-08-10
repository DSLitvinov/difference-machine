import { File } from "lucide-react";

import { cn } from "@/lib/utils";

interface InfoFilePreviewTileProps {
  className?: string;
}

export function InfoFilePreviewTile({ className }: InfoFilePreviewTileProps) {
  return (
    <div
      className={cn(
        "flex size-[110px] items-center justify-center rounded-[18px] border-2 border-border bg-background p-[23px] shadow-sm",
        className,
      )}
    >
      <File className="size-14 text-muted-foreground" />
    </div>
  );
}
