import { File } from "lucide-react";

import { cn } from "@/lib/utils";

interface InfoFilePreviewTileProps {
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function InfoFilePreviewTile({ rotation = 0, className, style }: InfoFilePreviewTileProps) {
  return (
    <div
      className={cn(
        "flex h-[110px] w-[110px] items-center justify-center rounded-2xl border-2 border-border bg-background p-2 shadow-sm",
        className,
      )}
      style={{ ...style, transform: `rotate(${rotation}deg)` }}
    >
      <File className="h-14 w-14 text-muted-foreground" />
    </div>
  );
}
