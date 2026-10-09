import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { DFM_MOVE_TYPE } from "@/components/items/FileGridTile";
import { fileKind, typeLabel } from "@/lib/file-kind";
import { formatDateTime, formatSize } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore, type DirEntry } from "@/store/app-store";

type FolderEntryListProps = {
  locale: Locale;
  entries: DirEntry[];
  selection: string[];
  hasMore?: boolean;
  onSelect: (path: string, event: MouseEvent) => void;
  onOpenFolder: (path: string) => void;
  onOpenFile?: (path: string) => void;
  onNeedMore?: () => void;
  onFileMenu?: (path: string, event: MouseEvent) => void;
  onFolderMenu?: (path: string, event: MouseEvent) => void;
  onMoveFiles?: (paths: string[], dest: string) => void;
};

function entryIcon(entry: DirEntry): string {
  if (entry.missing) {
    return "file-types/missing.svg";
  }
  if (entry.is_dir) {
    return "file-types/list-folder.svg";
  }
  const kind = fileKind(entry.name);
  if (kind === "image") {
    return "file-types/image.svg";
  }
  if (kind === "text") {
    return "file-types/text.svg";
  }
  return "file-types/binary.svg";
}

function dragPathsFor(path: string, entries: DirEntry[], selection: string[]): string[] {
  const selectedFiles = selection.filter((item) =>
    entries.some((entry) => entry.path === item && !entry.is_dir && !entry.missing),
  );
  return selectedFiles.includes(path) ? selectedFiles : [path];
}

function EntryRow({
  locale,
  entry,
  entries,
  selection,
  onSelect,
  onOpenFolder,
  onOpenFile,
  onFileMenu,
  onFolderMenu,
  onMoveFiles,
}: Omit<FolderEntryListProps, "hasMore" | "onNeedMore"> & { entry: DirEntry }) {
  const copy = t(locale);
  const theme = useAppStore((state) => state.theme);
  const [dropOver, setDropOver] = useState(false);
  const canDrag = !entry.is_dir && !entry.missing;
  const acceptsMove = (event: DragEvent<HTMLButtonElement>) =>
    entry.is_dir && Boolean(onMoveFiles) && event.dataTransfer.types.includes(DFM_MOVE_TYPE);

  return (
    <button
      type="button"
      draggable={canDrag}
      onClick={(event) => onSelect(entry.path, event)}
      onDoubleClick={() => (entry.is_dir ? onOpenFolder(entry.path) : onOpenFile?.(entry.path))}
      onContextMenu={(event) =>
        entry.is_dir ? onFolderMenu?.(entry.path, event) : onFileMenu?.(entry.path, event)
      }
      onDragStart={
        canDrag
          ? (event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(DFM_MOVE_TYPE, dragPathsFor(entry.path, entries, selection).join("\n"));
            }
          : undefined
      }
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
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropOver(false);
        }
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
          onMoveFiles?.(paths, entry.path);
        }
      }}
      className={cn(
        "grid h-10 w-full grid-cols-[minmax(180px,1fr)_88px_88px_136px] items-center gap-2 rounded-[10px] px-2.5 text-left text-sm leading-5",
        dropOver || selection.includes(entry.path) ? "bg-background-muted" : "hover:bg-background-muted",
      )}
    >
      <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
        <ThemeImg src={asset(entryIcon(entry), theme)} alt="" width={24} height={24} />
        <span className="truncate">{entry.name}</span>
      </span>
      <span className="truncate text-foreground-muted">{entry.is_dir || entry.size == null ? "—" : formatSize(entry.size)}</span>
      <span className="truncate text-foreground-muted">
        {entry.is_dir ? copy.folder : typeLabel(entry.name) || copy.file}
      </span>
      <span className="truncate text-foreground-muted">
        {entry.created != null && entry.created > 0 ? formatDateTime(entry.created) : "—"}
      </span>
    </button>
  );
}

export function FolderEntryList(props: FolderEntryListProps) {
  const { entries, hasMore, onNeedMore } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const onNeedMoreRef = useRef(onNeedMore);
  onNeedMoreRef.current = onNeedMore;
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 4,
    gap: 2,
    paddingStart: 16,
    paddingEnd: 16,
  });
  const rows = virtualizer.getVirtualItems();
  const endRow = rows[rows.length - 1]?.index ?? 0;

  useEffect(() => {
    if (hasMore && entries.length > 0 && endRow >= entries.length - 4) {
      onNeedMoreRef.current?.();
    }
  }, [endRow, entries.length, hasMore]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-4">
      <div className="relative min-w-[540px] w-full" style={{ height: virtualizer.getTotalSize() }}>
        {rows.map((row) => {
          const entry = entries[row.index];
          return (
            <div
              key={entry.path}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 right-0"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <EntryRow {...props} entry={entry} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
