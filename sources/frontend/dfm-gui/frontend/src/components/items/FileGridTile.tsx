import { FilePreview } from "@/components/atoms/FilePreview";
import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { asset } from "@/assets/themed";
import { fileKind } from "@/lib/file-kind";
import { GRID_PREVIEW_DEFAULT } from "@/lib/grid";
import type { LetterStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { MouseEvent } from "react";

type FileGridTileProps = {
  name: string;
  selected?: boolean;
  letter?: LetterStatus | null;
  locked?: boolean;
  src?: string;
  text?: string;
  stub?: boolean;
  previewSize?: number;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen?: () => void;
  onMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
};

const stubs = {
  image: asset("illustrations/file-img.svg"),
  text: asset("illustrations/file-text.svg"),
  blend: asset("illustrations/file-binary.svg"),
  binary: asset("illustrations/file-binary.svg"),
} as const;

export function FileGridTile({
  name,
  selected,
  letter,
  locked,
  src,
  text,
  stub,
  previewSize = GRID_PREVIEW_DEFAULT,
  onSelect,
  onOpen,
  onMenu,
}: FileGridTileProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={() => onOpen?.()}
      onContextMenu={onMenu}
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-2 rounded-md border p-2",
        selected ? "border-border-accent bg-foreground-accent" : "border-transparent hover:bg-foreground-accent",
      )}
    >
      <div className="relative" style={{ width: previewSize, height: previewSize }}>
        <FilePreview
          src={src ?? (stub && !text ? stubs[fileKind(name)] : undefined)}
          text={text}
          size="S"
          className="size-auto"
          style={{ width: previewSize, height: previewSize }}
        />
        {letter ? <FileStatusBadge type={letter} className="absolute bottom-1 left-1" /> : null}
        {locked ? <FileStatusBadge type="lock" className="absolute bottom-1 right-1" /> : null}
      </div>
      <div className="flex h-[34px] w-full flex-col justify-start">
        <p className="w-full truncate text-center text-[12px] leading-4 text-foreground">{name}</p>
      </div>
    </button>
  );
}
