import { useRef, type MouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CommitFileItem } from "@/components/atoms/CommitFileItem";
import { DiffFileListPlaceholder } from "@/components/placeholders/DiffFileListPlaceholder";
import { letterFromDiffStatus } from "@/lib/status";
import type { Locale } from "@/lib/i18n";
import type { NameStatusFile } from "@/lib/revision-cache";

type CommitFileListProps = {
  locale: Locale;
  files?: NameStatusFile[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  onFileMenu?: (file: NameStatusFile, event: MouseEvent) => void;
};

const ROW_H = 40;

export function CommitFileList({ locale, files, selectedPath, onSelect, onFileMenu }: CommitFileListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = files ?? [];
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
    paddingStart: 4,
    paddingEnd: 4,
  });

  if (!files) {
    return <div className="h-full w-[342px] shrink-0 overflow-y-auto border-r border-border" />;
  }
  if (files.length === 0) {
    return (
      <div className="flex h-full w-[342px] shrink-0 items-center justify-center overflow-hidden border-r border-border">
        <DiffFileListPlaceholder locale={locale} />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full w-[342px] shrink-0 overflow-y-auto border-r border-border">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const file = rows[row.index];
          return (
            <div
              key={file.path}
              className="absolute left-0 right-0"
              style={{ height: ROW_H, transform: `translateY(${row.start}px)` }}
            >
              <CommitFileItem
                path={file.path}
                letter={letterFromDiffStatus(file.status)}
                selected={file.path === selectedPath}
                onSelect={() => onSelect(file.path)}
                onMenu={(event) => onFileMenu?.(file, event)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
