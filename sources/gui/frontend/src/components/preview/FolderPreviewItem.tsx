import { Folder } from "lucide-react";

import { cn } from "@/lib/utils";

interface FolderPreviewItemProps {
  name: string;
  onOpen: () => void;
}

export function FolderPreviewItem({ name, onOpen }: FolderPreviewItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full flex-col items-center gap-2 rounded-md border border-border p-3 text-center text-sm transition-colors hover:bg-accent",
      )}
      onClick={onOpen}
      onDoubleClick={onOpen}
    >
      <Folder className="h-8 w-8 text-muted-foreground" />
      <span className="line-clamp-2 w-full break-all">{name}</span>
    </button>
  );
}
