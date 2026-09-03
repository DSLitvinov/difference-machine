import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { GRID_PREVIEW_DEFAULT } from "@/lib/grid";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { MouseEvent } from "react";

type FolderGridTileProps = {
  name: string;
  itemCount: number;
  ignored?: boolean;
  selected?: boolean;
  previewSize?: number;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  onMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function FolderGridTile({
  name,
  itemCount,
  ignored,
  selected,
  previewSize = GRID_PREVIEW_DEFAULT,
  onSelect,
  onOpen,
  onMenu,
}: FolderGridTileProps) {
  const theme = useAppStore((s) => s.theme);
  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-2 rounded-md border p-2",
        selected ? "border-border-accent bg-foreground-accent" : "border-transparent hover:bg-foreground-accent",
      )}
    >
      <div className="relative shrink-0" style={{ width: previewSize, height: previewSize }}>
        <ThemeImg src={asset("file-types/folder.svg", theme)} alt="" width={previewSize} height={previewSize} className="size-full object-contain" />
        {ignored ? <FileStatusBadge type="ignored" className="absolute bottom-1 left-1" /> : null}
      </div>
      <div className="flex h-[34px] w-full flex-col items-center gap-0.5 text-center text-[12px] leading-4">
        <p className="w-full truncate text-foreground">{name}</p>
        <p className="w-full truncate text-foreground-muted">{itemCount} Files</p>
      </div>
    </button>
  );
}
