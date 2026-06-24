import { FolderIcon } from "@/components/preview/FolderIcon";
import { Button } from "@/components/ui/button";

interface FolderPreviewItemProps {
  name: string;
  thumbScale?: number;
  subtitle?: string;
  onOpen: () => void;
}

export function FolderPreviewItem({
  name,
  thumbScale = 48,
  subtitle,
  onOpen,
}: FolderPreviewItemProps) {
  const iconSize = Math.max(20, Math.round(thumbScale * 0.65));

  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto w-full flex-col gap-2 rounded-md p-3 text-center text-sm font-normal hover:bg-accent"
      onClick={onOpen}
      onDoubleClick={onOpen}
    >
      <FolderIcon size={iconSize} />
      <span className="line-clamp-2 w-full break-all" title={name}>
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
