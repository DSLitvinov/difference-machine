import { useEffect, useState, type MouseEvent } from "react";
import { HeaderFolderAction } from "@/components/items/HeaderFolderAction";
import { FolderGridTile } from "@/components/items/FolderGridTile";
import { FileGridTile } from "@/components/items/FileGridTile";
import { FolderNullPlaceholder } from "@/components/placeholders/FolderNullPlaceholder";
import type { Locale } from "@/lib/i18n";
import type { DirEntry } from "@/store/app-store";

type ContentViewPanelProps = {
  locale: Locale;
  folderPath: string;
  entries: DirEntry[];
  selection: string[];
  collapsed?: boolean;
  onNavigate: (path: string) => void;
  onSelect: (paths: string[]) => void;
  onExpandInfo?: () => void;
};

export function ContentViewPanel({
  locale,
  folderPath,
  entries,
  selection,
  collapsed,
  onNavigate,
  onSelect,
  onExpandInfo,
}: ContentViewPanelProps) {
  const folders = entries.filter((entry) => entry.is_dir);
  const files = entries.filter((entry) => !entry.is_dir);
  const [anchor, setAnchor] = useState<string | null>(null);

  useEffect(() => {
    setAnchor(null);
  }, [folderPath]);

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

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pb-3 pl-2 pr-3">
      <HeaderFolderAction locale={locale} folderPath={folderPath} collapsed={collapsed} onNavigate={onNavigate} onExpandInfo={onExpandInfo} />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        {entries.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden p-4">
            <FolderNullPlaceholder locale={locale} />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] items-start gap-2">
              {folders.map((entry) => (
                <FolderGridTile key={entry.path} name={entry.name} itemCount={entry.item_count ?? 0} onOpen={() => onNavigate(entry.path)} />
              ))}
              {files.map((entry) => (
                <FileGridTile
                  key={entry.path}
                  name={entry.name}
                  selected={selection.includes(entry.path)}
                  onSelect={(event) => selectFile(entry.path, event)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
