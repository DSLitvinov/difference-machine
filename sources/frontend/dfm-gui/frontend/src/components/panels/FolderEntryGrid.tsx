import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FolderGridTile } from "@/components/items/FolderGridTile";
import { FileGridTile } from "@/components/items/FileGridTile";
import { columnCount, fileRowHeight, FOLDER_ROW_HEIGHT, GRID_GAP, GRID_PAD, trackWidth } from "@/lib/grid";
import { letterStatus } from "@/lib/status";
import { peekThumb, scheduleVisibleThumbs, setThumbLruLimit, useThumbEpoch, type ThumbRequest } from "@/lib/thumb-cache";
import type { DirEntry, FileLock, StatusSnapshot } from "@/store/app-store";
import type { MouseEvent } from "react";

type FolderEntryGridProps = {
  repoPath: string;
  entries: DirEntry[];
  selection: string[];
  status: StatusSnapshot | null;
  locks: FileLock[];
  hasMore?: boolean;
  onSelectFile: (path: string, event: MouseEvent) => void;
  onOpenFolder: (path: string) => void;
  onNeedMore?: () => void;
};

function asThumbRequest(entry: DirEntry): ThumbRequest {
  return {
    path: entry.path,
    name: entry.name,
    size: entry.size ?? 0,
    mtime: entry.modified ?? 0,
  };
}

export function FolderEntryGrid({
  repoPath,
  entries,
  selection,
  status,
  locks,
  hasMore,
  onSelectFile,
  onOpenFolder,
  onNeedMore,
}: FolderEntryGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nColsRef = useRef(1);
  const trackRef = useRef(200);
  const [innerWidth, setInnerWidth] = useState(200);
  useThumbEpoch();

  const nCols = columnCount(innerWidth);
  const track = trackWidth(innerWidth, nCols);
  nColsRef.current = nCols;
  trackRef.current = track;

  const rowCount = Math.ceil(entries.length / nCols) || 0;
  const fileH = fileRowHeight(track);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const cols = nColsRef.current;
      const slice = entries.slice(index * cols, index * cols + cols);
      const height = slice.some((entry) => !entry.is_dir) ? fileRowHeight(trackRef.current) : FOLDER_ROW_HEIGHT;
      return height + GRID_GAP;
    },
    overscan: 2,
    paddingStart: GRID_PAD,
    paddingEnd: GRID_PAD,
  });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      setInnerWidth(Math.max(0, el.clientWidth - GRID_PAD * 2));
      virtualizer.measure();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [virtualizer]);

  useEffect(() => {
    virtualizer.measure();
  }, [nCols, fileH, entries.length, virtualizer]);

  const virtualRows = virtualizer.getVirtualItems();
  const startRow = virtualRows[0]?.index ?? 0;
  const endRow = virtualRows[virtualRows.length - 1]?.index ?? 0;
  const startCell = startRow * nCols;
  const endCell = Math.min(entries.length, (endRow + 1) * nCols);
  const visibleFiles = entries.slice(startCell, endCell).filter((entry) => !entry.is_dir);
  const visiblePaths = visibleFiles.map((entry) => `${entry.path}:${entry.size ?? 0}:${entry.modified ?? 0}`).join("\0");

  useEffect(() => {
    setThumbLruLimit(visibleFiles.length);
    const files = visibleFiles.map(asThumbRequest);
    const center = Math.max(0, Math.floor((files.length - 1) / 2));
    scheduleVisibleThumbs(repoPath, files, center);
  }, [repoPath, visiblePaths]);

  const onNeedMoreRef = useRef(onNeedMore);
  onNeedMoreRef.current = onNeedMore;

  useEffect(() => {
    if (hasMore && rowCount > 0 && endRow >= rowCount - 2) {
      onNeedMoreRef.current?.();
    }
  }, [hasMore, endRow, rowCount, entries.length]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualRows.map((row) => {
          const slice = entries.slice(row.index * nCols, row.index * nCols + nCols);
          return (
            <div
              key={row.key}
              className="absolute left-0 right-0 grid items-start gap-2"
              style={{
                transform: `translateY(${row.start}px)`,
                gridTemplateColumns: `repeat(${nCols}, minmax(0, 1fr))`,
              }}
            >
              {slice.map((entry) => {
                if (entry.is_dir) {
                  return (
                    <FolderGridTile key={entry.path} name={entry.name} itemCount={entry.item_count ?? 0} onOpen={() => onOpenFolder(entry.path)} />
                  );
                }
                const thumb = peekThumb(repoPath, asThumbRequest(entry));
                const locked = locks.some((item) => item.file_path === entry.path);
                return (
                  <FileGridTile
                    key={entry.path}
                    name={entry.name}
                    selected={selection.includes(entry.path)}
                    letter={letterStatus(entry.path, status)}
                    locked={locked}
                    src={thumb?.kind === "image" ? thumb.blobUrl : undefined}
                    text={thumb?.kind === "text" ? thumb.text : undefined}
                    stub={thumb?.kind === "placeholder"}
                    onSelect={(event) => onSelectFile(entry.path, event)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
