import folderIcon from "@icons/48/Folder.svg";
import { cn } from "@/lib/utils";

type FolderGridTileProps = {
  name: string;
  itemCount: number;
  onOpen: () => void;
};

export function FolderGridTile({ name, itemCount, onOpen }: FolderGridTileProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-2 rounded-md border border-transparent p-2",
        "hover:bg-foreground-accent",
      )}
    >
      <div className="flex aspect-square w-full items-center justify-center">
        <img src={folderIcon} alt="" width={48} height={48} className="theme-asset size-12 shrink-0" />
      </div>
      <div className="flex h-[34px] w-full flex-col items-center gap-0.5 text-center text-[12px] leading-4">
        <p className="w-full truncate text-foreground">{name}</p>
        <p className="w-full truncate text-foreground-muted">{itemCount} Files</p>
      </div>
    </button>
  );
}
