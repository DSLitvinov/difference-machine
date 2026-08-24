import { useEffect, useState, type MouseEvent } from "react";
import { HeaderFolderAction } from "@/components/items/HeaderFolderAction";
import { FolderEntryGrid } from "@/components/panels/FolderEntryGrid";
import { FolderNullPlaceholder } from "@/components/placeholders/FolderNullPlaceholder";
import type { Locale } from "@/lib/i18n";
import type { DirEntry, FileLock, StatusSnapshot } from "@/store/app-store";

type ContentViewPanelProps = {
  locale: Locale;
  repoPath: string;
  folderPath: string;
  entries: DirEntry[];
  selection: string[];
  status: StatusSnapshot | null;
  locks: FileLock[];
  changedOnly?: boolean;
  hasMore?: boolean;
  collapsed?: boolean;
  onNavigate: (path: string) => void;
  onSelect: (paths: string[]) => void;
  onExpandInfo?: () => void;
  onNeedMore?: () => void;
  onOpenFile?: (path: string) => void;
};

export function ContentViewPanel({
  locale,
  repoPath,
  folderPath,
  entries,
  selection,
  status,
  locks,
  changedOnly,
  hasMore,
  collapsed,
  onNavigate,
  onSelect,
  onExpandInfo,
  onNeedMore,
  onOpenFile,
}: ContentViewPanelProps) {
  const folders = entries.filter((entry) => entry.is_dir);
  const files = entries.filter((entry) => !entry.is_dir);
  const items = changedOnly ? files : [...folders, ...files];
  const [anchor, setAnchor] = useState<string | null>(null);

  useEffect(() => {
    setAnchor(null);
  }, [folderPath, changedOnly]);

  function selectFile(path: string, event: MouseEvent) {
    event.preventDefault();
    const filePaths = files.map((entry) => entry.path);
    if (event.shiftKey && anchor) {
      const from = filePaths.indexOf(anchor);
      const to = filePaths.indexOf(path);
      if (from >= 0 && to >= 0) {
        const start = Math.min(from, to);
        const end = Math.max(from, to);
        onSelect(filePaths.slice(start, end + 1));
        return;
      }
    }
    if (event.metaKey || event.ctrlKey) {
      const next = selection.includes(path) ? selection.filter((item) => item !== path) : [...selection, path];
      onSelect(next);
      setAnchor(path);
      return;
    }
    onSelect([path]);
    setAnchor(path);
  }

  const showEmptyFolder = items.length === 0 && !changedOnly;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pb-3 pl-2 pr-3">
      <HeaderFolderAction locale={locale} folderPath={folderPath} collapsed={collapsed} onNavigate={onNavigate} onExpandInfo={onExpandInfo} />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        {showEmptyFolder ? (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden p-4">
            <FolderNullPlaceholder locale={locale} />
          </div>
        ) : items.length === 0 ? (
          <div className="min-h-0 flex-1" />
        ) : (
          <FolderEntryGrid
            key={`${folderPath}:${changedOnly ? "changed" : "folder"}`}
            repoPath={repoPath}
            entries={items}
            selection={selection}
            status={status}
            locks={locks}
            hasMore={hasMore}
            onSelectFile={selectFile}
            onOpenFolder={onNavigate}
            onOpenFile={onOpenFile}
            onNeedMore={onNeedMore}
          />
        )}
      </div>
    </section>
  );
}
