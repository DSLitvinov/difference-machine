import { FilePreview } from "@/components/atoms/FilePreview";
import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { fileKind } from "@/lib/file-kind";
import { GRID_PREVIEW_DEFAULT } from "@/lib/grid";
import type { LetterStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { DragEvent, MouseEvent } from "react";

type FileGridTileProps = {
  name: string;
  selected?: boolean;
  letter?: LetterStatus | null;
  ignored?: boolean;
  locked?: boolean;
  src?: string;
  text?: string;
  missing?: boolean;
  previewSize?: number;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen?: () => void;
  onMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Paths dragged together. Empty disables dragging. */
  dragPaths?: string[];
};

export const DFM_MOVE_TYPE = "application/x-dfm-move";

function stubSrc(name: string, theme: "light" | "dark", missing?: boolean): string {
  if (missing) {
    return asset("file-types/missing.svg", theme);
  }
  const kind = fileKind(name);
  if (kind === "image") {
    return asset("file-types/image.svg", theme);
  }
  if (kind === "text") {
    return asset("file-types/text.svg", theme);
  }
  return asset("file-types/binary.svg", theme);
}

export function FileGridTile({
  name,
  selected,
  letter,
  ignored,
  locked,
  src,
  text,
  missing,
  previewSize = GRID_PREVIEW_DEFAULT,
  onSelect,
  onOpen,
  onMenu,
  dragPaths,
}: FileGridTileProps) {
  const theme = useAppStore((s) => s.theme);
  const canDrag = Boolean(dragPaths && dragPaths.length > 0 && !missing);
  const hasPreview = Boolean(!missing && (src || text));
  const typeIcon = missing ? stubSrc(name, theme, true) : stubSrc(name, theme);
  return (
    <button
      type="button"
      draggable={canDrag}
      onClick={onSelect}
      onDoubleClick={() => onOpen?.()}
      onContextMenu={onMenu}
      onDragStart={
        canDrag
          ? (event: DragEvent<HTMLButtonElement>) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(DFM_MOVE_TYPE, dragPaths!.join("\n"));
            }
          : undefined
      }
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-2 rounded-md border p-2",
        selected ? "border-border-accent bg-foreground-accent" : "border-transparent hover:bg-foreground-accent",
      )}
    >
      <div className="relative shrink-0" style={{ width: previewSize, height: previewSize }}>
        {hasPreview ? (
          <FilePreview
            src={src}
            text={text}
            size="S"
            className="size-auto"
            style={{ width: previewSize, height: previewSize }}
          />
        ) : (
          <ThemeImg src={typeIcon} alt="" width={previewSize} height={previewSize} className="size-full object-contain" />
        )}
        {locked || ignored || letter ? (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center gap-1 pb-2">
            {locked ? <FileStatusBadge type="lock" iconOnly /> : null}
            {ignored ? <FileStatusBadge type="ignored" iconOnly /> : letter ? <FileStatusBadge type={letter} iconOnly /> : null}
          </div>
        ) : null}
      </div>
      <div className="flex h-[34px] w-full flex-col justify-start">
        <p className="w-full truncate text-center text-[12px] leading-4 text-foreground">{name}</p>
      </div>
    </button>
  );
}
