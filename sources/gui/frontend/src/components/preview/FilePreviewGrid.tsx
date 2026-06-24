import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { FilePreviewItem } from "@/components/preview/FilePreviewItem";
import { useMarqueeSelection } from "@/hooks/useMarqueeSelection";
import {
  computeColumnCount,
  estimateGridRowHeight,
  gridMinCellSizeForScale,
} from "@/lib/previewGrid";
import { useProjectStore } from "@/stores/projectStore";
import type { DirEntry, VcsFileStatus } from "@/wails/forester";

interface FilePreviewGridProps {
  files: DirEntry[];
  orderedPaths: string[];
  thumbScale: number;
  scrollElement: HTMLElement | null;
  vcsStatusFor: (path: string) => VcsFileStatus | null;
  lockUserFor?: (path: string) => string | null;
  subtitleFor?: (entry: DirEntry) => string | undefined;
  onOpen: (path: string) => void;
  onNearEnd?: () => void;
}

export function FilePreviewGrid({
  files,
  orderedPaths,
  thumbScale,
  scrollElement,
  vcsStatusFor,
  lockUserFor,
  subtitleFor,
  onOpen,
  onNearEnd,
}: FilePreviewGridProps) {
  const cellMin = gridMinCellSizeForScale(thumbScale);
  const hasSubtitle = Boolean(subtitleFor);
  const rowHeight = estimateGridRowHeight(thumbScale, hasSubtitle);
  const selectedFilePaths = useProjectStore((s) => s.selectedFilePaths);
  const selectFile = useProjectStore((s) => s.selectFile);
  const selectFilePaths = useProjectStore((s) => s.selectFilePaths);

  const [columnCount, setColumnCount] = useState(1);
  const [gridWidth, setGridWidth] = useState(0);

  const handleMarqueeSelect = useCallback(
    (paths: string[], additive: boolean) => {
      selectFilePaths(paths, { additive });
    },
    [selectFilePaths],
  );

  const { containerRef, marquee, onMouseDown } = useMarqueeSelection({
    orderedPaths,
    onSelect: handleMarqueeSelect,
    onClear: () => useProjectStore.getState().clearFileSelection(),
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      setGridWidth(width);
      setColumnCount(computeColumnCount(width, cellMin));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cellMin, containerRef]);

  const rowCount = Math.max(1, Math.ceil(files.length / columnCount));

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    overscan: 3,
    gap: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!onNearEnd || files.length === 0) return;
    const last = virtualRows[virtualRows.length - 1];
    if (last && last.index >= rowCount - 2) {
      onNearEnd();
    }
  }, [virtualRows, rowCount, onNearEnd, files.length]);

  const handleFileSelect = (path: string, event: MouseEvent<HTMLButtonElement>) => {
    const additive = event.metaKey || event.ctrlKey;
    const range = event.shiftKey;
    selectFile(path, orderedPaths, { additive, range });
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      onMouseDown={onMouseDown}
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowFiles = files.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 grid w-full gap-2"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns:
                  gridWidth > 0
                    ? `repeat(${columnCount}, minmax(0, 1fr))`
                    : `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
              }}
            >
              {rowFiles.map((entry) => (
                <div key={entry.path} data-file-item data-file-path={entry.path}>
                  <FilePreviewItem
                    name={entry.name}
                    path={entry.path}
                    thumbScale={thumbScale}
                    subtitle={subtitleFor?.(entry)}
                    selected={selectedFilePaths.includes(entry.path)}
                    vcsStatus={vcsStatusFor(entry.path)}
                    lockUser={lockUserFor?.(entry.path) ?? null}
                    onSelect={(event) => handleFileSelect(entry.path, event)}
                    onOpen={() => onOpen(entry.path)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {marquee ? (
        <div
          className="pointer-events-none fixed z-50 border border-ring bg-primary/10"
          style={{
            left: marquee.left,
            top: marquee.top,
            width: marquee.width,
            height: marquee.height,
          }}
        />
      ) : null}
    </div>
  );
}

export type { FilePreviewGridProps };
