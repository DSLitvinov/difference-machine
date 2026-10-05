import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { GRID_PREVIEW_DEFAULT } from "@/lib/grid";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useState, type DragEvent, type MouseEvent } from "react";
import { DFM_MOVE_TYPE } from "@/components/items/FileGridTile";

type FolderGridTileProps = {
  name: string;
  itemCount: number;
  ignored?: boolean;
  selected?: boolean;
  previewSize?: number;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  onMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
  onDropPaths?: (paths: string[]) => void;
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
  onDropPaths,
}: FolderGridTileProps) {
  const theme = useAppStore((s) => s.theme);
  const [dropOver, setDropOver] = useState(false);
  function acceptsMove(event: DragEvent<HTMLButtonElement>): boolean {
    return Boolean(onDropPaths) && event.dataTransfer.types.includes(DFM_MOVE_TYPE);
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      onDragEnter={(event) => {
        if (!acceptsMove(event)) {
          return;
        }
        event.preventDefault();
        setDropOver(true);
      }}
      onDragOver={(event) => {
        if (!acceptsMove(event)) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setDropOver(false);
      }}
      onDrop={(event) => {
        if (!acceptsMove(event)) {
          return;
        }
        event.preventDefault();
        setDropOver(false);
        const paths = event.dataTransfer
          .getData(DFM_MOVE_TYPE)
          .split("\n")
          .map((path) => path.trim())
          .filter(Boolean);
        if (paths.length > 0) {
          onDropPaths?.(paths);
        }
      }}
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-2 rounded-md border p-2",
        dropOver || selected ? "border-border-accent bg-foreground-accent" : "border-transparent hover:bg-foreground-accent",
      )}
    >
      <div className="relative shrink-0" style={{ width: previewSize, height: previewSize }}>
        <ThemeImg src={asset("file-types/folder.svg", theme)} alt="" width={previewSize} height={previewSize} className="size-full object-contain" />
        {ignored ? (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-2">
            <FileStatusBadge type="ignored" iconOnly />
          </div>
        ) : null}
      </div>
      <div className="flex h-[34px] w-full flex-col items-center gap-0.5 text-center text-[12px] leading-4">
        <p className="w-full truncate text-foreground">{name}</p>
        <p className="w-full truncate text-foreground-muted">{itemCount} Files</p>
      </div>
    </button>
  );
}
