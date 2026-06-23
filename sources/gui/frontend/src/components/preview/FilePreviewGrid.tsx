import { useCallback, type MouseEvent } from "react";

import { FilePreviewItem } from "@/components/preview/FilePreviewItem";
import { useMarqueeSelection } from "@/hooks/useMarqueeSelection";
import { gridMinCellSize } from "@/lib/previewScale";
import { useProjectStore } from "@/stores/projectStore";
import type { DirEntry, VcsFileStatus } from "@/wails/forester";

interface FilePreviewGridProps {
  files: DirEntry[];
  orderedPaths: string[];
  thumbScale: number;
  vcsStatusFor: (path: string) => VcsFileStatus | null;
  subtitleFor?: (entry: DirEntry) => string | undefined;
  onOpen: (path: string) => void;
}

export function FilePreviewGrid({
  files,
  orderedPaths,
  thumbScale,
  vcsStatusFor,
  subtitleFor,
  onOpen,
}: FilePreviewGridProps) {
  const cellMin = gridMinCellSize(thumbScale);
  const selectedFilePaths = useProjectStore((s) => s.selectedFilePaths);
  const selectFile = useProjectStore((s) => s.selectFile);
  const selectFilePaths = useProjectStore((s) => s.selectFilePaths);

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

  const handleFileSelect = (path: string, event: MouseEvent<HTMLButtonElement>) => {
    const additive = event.metaKey || event.ctrlKey;
    const range = event.shiftKey;
    selectFile(path, orderedPaths, { additive, range });
  };

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      onMouseDown={onMouseDown}
    >
      <ul
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
        }}
      >
        {files.map((entry) => (
          <li key={entry.path} data-file-item data-file-path={entry.path}>
            <FilePreviewItem
              name={entry.name}
              path={entry.path}
              thumbScale={thumbScale}
              subtitle={subtitleFor?.(entry)}
              selected={selectedFilePaths.includes(entry.path)}
              vcsStatus={vcsStatusFor(entry.path)}
              onSelect={(event) => handleFileSelect(entry.path, event)}
              onOpen={() => onOpen(entry.path)}
            />
          </li>
        ))}
      </ul>
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
