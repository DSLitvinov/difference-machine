import { FilePreview } from "@/components/atoms/FilePreview";
import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { asset } from "@/assets/themed";
import { fileKind } from "@/lib/file-kind";
import { GRID_PREVIEW_DEFAULT } from "@/lib/grid";
import type { LetterStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { MouseEvent } from "react";

type FileGridTileProps = {
  name: string;
  selected?: boolean;
  letter?: LetterStatus | null;
  ignored?: boolean;
  locked?: boolean;
  src?: string;
  text?: string;
  stub?: boolean;
  missing?: boolean;
  previewSize?: number;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpen?: () => void;
  onMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
};

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
  stub,
  missing,
  previewSize = GRID_PREVIEW_DEFAULT,
  onSelect,
  onOpen,
  onMenu,
}: FileGridTileProps) {
  const theme = useAppStore((s) => s.theme);
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
          src={missing ? stubSrc(name, theme, true) : src ?? (stub && !text ? stubSrc(name, theme) : undefined)}
          text={missing ? undefined : text}
          size="S"
          className="size-auto"
          style={{ width: previewSize, height: previewSize }}
        />
        {ignored ? <FileStatusBadge type="ignored" className="absolute bottom-1 left-1" /> : letter ? <FileStatusBadge type={letter} className="absolute bottom-1 left-1" /> : null}
        {locked ? <FileStatusBadge type="lock" className="absolute bottom-1 right-1" /> : null}
      </div>
      <div className="flex h-[34px] w-full flex-col justify-start">
        <p className="w-full truncate text-center text-[12px] leading-4 text-foreground">{name}</p>
      </div>
    </button>
  );
}
