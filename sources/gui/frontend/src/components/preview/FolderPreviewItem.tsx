import { Folder } from "lucide-react";

import { Button } from "@/components/ui/button";

interface FolderPreviewItemProps {
  name: string;
  onOpen: () => void;
}

export function FolderPreviewItem({ name, onOpen }: FolderPreviewItemProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto w-full flex-col gap-2 rounded-md p-3 text-center text-sm font-normal hover:bg-accent"
      onClick={onOpen}
      onDoubleClick={onOpen}
    >
      <Folder className="h-8 w-8 text-muted-foreground" />
      <span className="line-clamp-2 w-full break-all">{name}</span>
    </Button>
  );
}
