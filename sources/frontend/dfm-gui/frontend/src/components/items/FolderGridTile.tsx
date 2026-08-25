import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { GRID_PREVIEW_DEFAULT } from "@/lib/grid";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type FolderGridTileProps = {
  name: string;
  itemCount: number;
  previewSize?: number;
  onOpen: () => void;
};

export function FolderGridTile({ name, itemCount, previewSize = GRID_PREVIEW_DEFAULT, onOpen }: FolderGridTileProps) {
  const theme = useAppStore((s) => s.theme);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-2 rounded-md border border-transparent p-2",
        "hover:bg-foreground-accent",
      )}
    >
      <ThemeImg src={asset("illustrations/folder.svg", theme)} alt="" width={previewSize} height={previewSize} className="shrink-0 object-contain" />
      <div className="flex h-[34px] w-full flex-col items-center gap-0.5 text-center text-[12px] leading-4">
        <p className="w-full truncate text-foreground">{name}</p>
        <p className="w-full truncate text-foreground-muted">{itemCount} Files</p>
      </div>
    </button>
  );
}
