import { FilePreview } from "@/components/atoms/FilePreview";
import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { fileKind } from "@/lib/file-kind";
import type { LetterStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import fileImg from "@icons/256/File-IMG.svg";
import fileText from "@icons/256/File-TEXT.svg";
import fileBinary from "@icons/256/File-Binary.svg";
import type { MouseEvent } from "react";

type FileGridTileProps = {
  name: string;
  selected?: boolean;
  letter?: LetterStatus | null;
  locked?: boolean;
  src?: string;
  text?: string;
  stub?: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
};

const stubs = {
  image: fileImg,
  text: fileText,
  blend: fileBinary,
  binary: fileBinary,
} as const;

export function FileGridTile({ name, selected, letter, locked, src, text, stub, onSelect }: FileGridTileProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-2 rounded-md border p-2",
        selected ? "border-border-accent bg-foreground-accent" : "border-transparent hover:bg-foreground-accent",
      )}
    >
      <div className="relative w-full">
        {text ? (
          <div className="aspect-square w-full overflow-hidden rounded-sm border border-border bg-background">
            <pre className="h-full w-full overflow-hidden whitespace-pre-wrap break-all p-1 font-mono text-[10px] leading-3 text-foreground">
              {text}
            </pre>
          </div>
        ) : (
          <FilePreview src={src ?? (stub ? stubs[fileKind(name)] : undefined)} className="aspect-square size-auto w-full" />
        )}
        {letter ? <FileStatusBadge type={letter} className="absolute bottom-1 left-1" /> : null}
        {locked ? <FileStatusBadge type="lock" className="absolute bottom-1 right-1" /> : null}
      </div>
      <p className="w-full truncate text-center text-[12px] leading-4 text-foreground">{name}</p>
    </button>
  );
}
