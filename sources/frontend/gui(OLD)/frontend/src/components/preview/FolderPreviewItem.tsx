import { FolderIcon } from "@/components/preview/FolderIcon";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FolderPreviewItemProps {
  name: string;
  fileCount?: number;
  thumbScale?: number;
  subtitle?: string;
  selected?: boolean;
  onOpen: () => void;
}

export function FolderPreviewItem({
  name,
  fileCount,
  thumbScale = 48,
  subtitle,
  selected = false,
  onOpen,
}: FolderPreviewItemProps) {
  const t = useT();
  const iconSize = Math.max(20, Math.round(thumbScale * 0.65));
  const countLabel =
    fileCount === undefined
      ? null
      : fileCount === 1
        ? t("preview.folderFileCountOne")
        : t("preview.folderFileCount", { count: fileCount });

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto w-full flex-col gap-2 rounded-md p-2 text-center text-xs font-normal hover:bg-accent",
        selected && "border border-ring bg-accent",
      )}
      onClick={onOpen}
      onDoubleClick={onOpen}
      aria-label={countLabel ? `${name}, ${countLabel}` : name}
      aria-current={selected ? "true" : undefined}
    >
      <FolderIcon size={iconSize} />
      <span className="flex w-full min-w-0 flex-col items-center gap-0.5">
        <span className="w-full truncate text-foreground" title={name}>
          {name}
        </span>
        {countLabel ? (
          <span className="w-full truncate text-center text-muted-foreground" title={countLabel}>
            {countLabel}
          </span>
        ) : null}
        {subtitle ? (
          <span className="w-full truncate text-center text-muted-foreground" title={subtitle}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </Button>
  );
}
