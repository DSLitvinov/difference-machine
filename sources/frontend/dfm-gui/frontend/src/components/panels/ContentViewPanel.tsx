import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { HeaderFolderAction } from "@/components/items/HeaderFolderAction";
import { FilePreviewItemMenu } from "@/components/items/FilePreviewItemMenu";
import { FolderEntryGrid } from "@/components/panels/FolderEntryGrid";
import { FolderNullPlaceholder } from "@/components/placeholders/FolderNullPlaceholder";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { foresterCall } from "@/lib/bridge";
import { applyFolderQuery, folderExtensions, inCurrentFolder, type GridFilter, type GridSort } from "@/lib/folder-query";
import type { Locale } from "@/lib/i18n";
import type { DirEntry, FileLock, StatusSnapshot } from "@/store/app-store";

type FileMenu = {
  path: string;
  x: number;
  y: number;
};

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
  onAddInCommit?: (path: string) => void;
  onRenameFile?: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  onOpenInFolder?: (path: string) => void;
  onEditIn?: (path: string, editor: string) => void;
  onToggleLock?: (path: string) => void;
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
  onAddInCommit,
  onRenameFile,
  onDeleteFile,
  onOpenInFolder,
  onEditIn,
  onToggleLock,
}: ContentViewPanelProps) {
  const [anchor, setAnchor] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<GridSort>("modified");
  const [filter, setFilter] = useState<GridFilter>([]);
  const [searchEntries, setSearchEntries] = useState<DirEntry[] | null>(null);
  const [menu, setMenu] = useState<FileMenu | null>(null);

  useEffect(() => {
    setAnchor(null);
    setSearchOpen(false);
    setQuery("");
    setDebounced("");
    setSearchEntries(null);
    setMenu(null);
  }, [folderPath, changedOnly]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const needle = debounced.trim();
    if (!needle) {
      setSearchEntries(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = (await foresterCall("workdir.search", { query: needle, limit: 200 })) as { entries?: DirEntry[] };
        if (cancelled) {
          return;
        }
        const found = (result.entries ?? []).filter((entry) => inCurrentFolder(entry.path, folderPath));
        setSearchEntries(found);
      } catch {
        if (!cancelled) {
          setSearchEntries([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, folderPath]);

  const source = searchEntries ?? entries;
  const searching = searchEntries !== null;
  const extensions = useMemo(() => folderExtensions(source), [searchEntries, entries]);
  const folders = source.filter((entry) => entry.is_dir);
  const files = source.filter((entry) => !entry.is_dir);
  const rawItems = changedOnly && !searching ? files : [...folders, ...files];
  const items = useMemo(() => applyFolderQuery(rawItems, sort, filter), [rawItems, sort, filter]);
  const filePaths = items.filter((entry) => !entry.is_dir).map((entry) => entry.path);

  useEffect(() => {
    setFilter((prev) => {
      const next = prev.filter((ext) => extensions.includes(ext));
      return next.length === prev.length ? prev : next;
    });
  }, [extensions]);

  function selectFile(path: string, event: MouseEvent) {
    event.preventDefault();
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

  function onFileMenu(path: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onSelect([path]);
    setAnchor(path);
    setMenu({ path, x: event.clientX, y: event.clientY });
  }

  const showEmptyFolder = items.length === 0 && !changedOnly && !searching && filter.length === 0;
  const paginate = Boolean(hasMore) && !searching;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pb-3 pl-2 pr-3">
      <HeaderFolderAction
        locale={locale}
        folderPath={folderPath}
        collapsed={collapsed}
        searchOpen={searchOpen}
        query={query}
        sort={sort}
        filter={filter}
        extensions={extensions}
        onNavigate={onNavigate}
        onExpandInfo={onExpandInfo}
        onSearchOpen={() => setSearchOpen(true)}
        onQuery={setQuery}
        onSearchEscape={() => {
          if (query) {
            setQuery("");
            return;
          }
          setSearchOpen(false);
        }}
        onSort={setSort}
        onFilter={setFilter}
      />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        {showEmptyFolder ? (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden p-4">
            <FolderNullPlaceholder locale={locale} />
          </div>
        ) : items.length === 0 ? (
          <div className="min-h-0 flex-1" />
        ) : (
          <FolderEntryGrid
            key={`${folderPath}:${changedOnly ? "changed" : "folder"}:${searching ? "search" : "list"}`}
            repoPath={repoPath}
            entries={items}
            selection={selection}
            status={status}
            locks={locks}
            hasMore={paginate}
            onSelectFile={selectFile}
            onOpenFolder={onNavigate}
            onOpenFile={onOpenFile}
            onNeedMore={onNeedMore}
            onFileMenu={onFileMenu}
          />
        )}
      </div>
      {menu ? (
        <DropdownMenu open onOpenChange={(open) => { if (!open) setMenu(null); }}>
          <DropdownMenuTrigger asChild>
            <span className="fixed z-50 size-0" style={{ left: menu.x, top: menu.y }} />
          </DropdownMenuTrigger>
          <FilePreviewItemMenu
            locale={locale}
            locked={locks.some((item) => item.file_path === menu.path)}
            onAddInCommit={() => onAddInCommit?.(menu.path)}
            onRename={() => onRenameFile?.(menu.path)}
            onOpenInFolder={() => onOpenInFolder?.(menu.path)}
            onEditIn={(editor) => onEditIn?.(menu.path, editor)}
            onToggleLock={() => onToggleLock?.(menu.path)}
            onDeleteInProject={() => onDeleteFile?.(menu.path)}
          />
        </DropdownMenu>
      ) : null}
    </section>
  );
}
