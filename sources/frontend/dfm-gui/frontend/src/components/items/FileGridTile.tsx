import { FilePreview } from "@/components/atoms/FilePreview";
import { fileKind } from "@/lib/file-kind";
import { cn } from "@/lib/utils";
import fileImg from "@icons/256/File-IMG.svg";
import fileText from "@icons/256/File-TEXT.svg";
import fileBinary from "@icons/256/File-Binary.svg";
import type { MouseEvent } from "react";

type FileGridTileProps = {
  name: string;
  selected?: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
};

const stubs = {
  image: fileImg,
  text: fileText,
  blend: fileBinary,
  binary: fileBinary,
} as const;

export function FileGridTile({ name, selected, onSelect }: FileGridTileProps) {
  const stub = stubs[fileKind(name)];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-2 rounded-md p-2",
        selected ? "border border-border-accent bg-foreground-accent" : "hover:bg-foreground-accent",
      )}
    >
      <FilePreview src={stub} className="aspect-square size-auto w-full" />
      <p className="w-full truncate text-center text-[12px] leading-4 text-foreground">{name}</p>
    </button>
  );
}
