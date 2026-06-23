import { cn } from "@/lib/utils";
import type { DiffFileEntry } from "@/wails/forester";

const STATUS_STYLES: Record<DiffFileEntry["status"], string> = {
  A: "bg-emerald-600 text-white",
  M: "bg-amber-500 text-white",
  D: "bg-destructive text-destructive-foreground",
};

const STATUS_LABELS: Record<DiffFileEntry["status"], string> = {
  A: "Added",
  M: "Modified",
  D: "Deleted",
};

interface ChangedFileItemProps {
  file: DiffFileEntry;
  selected: boolean;
  onSelect: () => void;
}

export function ChangedFileItem({ file, selected, onSelect }: ChangedFileItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
        selected ? "bg-accent" : "hover:bg-accent/60",
      )}
      title={STATUS_LABELS[file.status]}
      onClick={onSelect}
    >
      <span
        className={cn(
          "flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-xs font-semibold",
          STATUS_STYLES[file.status],
        )}
      >
        {file.status}
      </span>
      <span className="min-w-0 flex-1 truncate">{file.path}</span>
    </button>
  );
}

interface ChangedFilesListProps {
  files: DiffFileEntry[];
  selectedPath: string | null;
  loading: boolean;
  onSelect: (path: string) => void;
}

export function ChangedFilesList({ files, selectedPath, loading, onSelect }: ChangedFilesListProps) {
  return (
    <div className="flex h-full min-h-0 w-[373px] shrink-0 flex-col border-r border-border bg-background">
      <div className="shrink-0 bg-accent px-3 py-2 text-sm font-medium text-foreground">
        {loading ? "Loading…" : `${files.length} files changed`}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        ) : files.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No files changed in this commit</p>
        ) : (
          files.map((file) => (
            <ChangedFileItem
              key={`${file.status}:${file.path}`}
              file={file}
              selected={selectedPath === file.path}
              onSelect={() => onSelect(file.path)}
            />
          ))
        )}
      </div>
    </div>
  );
}
