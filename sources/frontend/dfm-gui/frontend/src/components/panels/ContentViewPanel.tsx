import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { HeaderFolderAction } from "@/components/items/HeaderFolderAction";
import { FilePreviewItemMenu, type FileWorkdirAction } from "@/components/items/FilePreviewItemMenu";
import { FolderPreviewItemMenu } from "@/components/items/FolderPreviewItemMenu";
import { FolderEntryGrid } from "@/components/panels/FolderEntryGrid";
import { FolderNullPlaceholder } from "@/components/placeholders/FolderNullPlaceholder";
import { DamagedPlaceholder } from "@/components/placeholders/DamagedPlaceholder";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { foresterCall } from "@/lib/bridge";
import { applyFolderQuery, fileSelection, folderExtensions, inCurrentFolder, type GridFilter, type GridSort } from "@/lib/folder-query";
import { t, type Locale } from "@/lib/i18n";
import { isDirty, isStagedPath, mergeMissingEntries } from "@/lib/status";
import type { DirEntry, FileLock, StatusSnapshot } from "@/store/app-store";

type EntryMenu = {
  path: string;
  isDir: boolean;
  paths: string[];
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
  viewIgnored?: boolean;
  hasMore?: boolean;
  collapsed?: boolean;
  forceEmpty?: boolean;
  damaged?: boolean;
  busy?: boolean;
  onNavigate: (path: string) => void;
  onSelect: (paths: string[]) => void;
  onExpandInfo?: () => void;
  onNeedMore?: () => void;
  onChangedOnly?: (value: boolean) => void;
  onViewIgnored?: (value: boolean) => void;
  onOpenFile?: (path: string) => void;
  onFileAction?: (paths: string[], action: FileWorkdirAction) => void;
  onIgnore?: (path: string) => void;
  onUnignore?: (path: string) => void;
  onVerify?: () => void;
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
  viewIgnored,
  hasMore,
  collapsed,
  forceEmpty,
  damaged,
  busy,
  onNavigate,
  onSelect,
  onExpandInfo,
  onNeedMore,
  onChangedOnly,
  onViewIgnored,
  onOpenFile,
  onFileAction,
  onIgnore,
  onUnignore,
  onVerify,
}: ContentViewPanelProps) {
  const [anchor, setAnchor] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<GridSort>("modified");
  const [filter, setFilter] = useState<GridFilter>([]);
  const [searchEntries, setSearchEntries] = useState<DirEntry[] | null>(null);
  const [menu, setMenu] = useState<EntryMenu | null>(null);

  useEffect(() => {
    setAnchor(null);
    setSearchOpen(false);
    setQuery("");
    setDebounced("");
    setSearchEntries(null);
    setMenu(null);
  }, [folderPath, changedOnly, viewIgnored]);

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
        const result = (await foresterCall("workdir.search", {
          query: needle,
          limit: 200,
          include_ignored: Boolean(viewIgnored),
        })) as { entries?: DirEntry[] };
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
  }, [debounced, folderPath, viewIgnored]);

  const source = searchEntries ?? entries;
  const searching = searchEntries !== null;
  const listed = searching ? source : mergeMissingEntries(source, status, changedOnly ? null : folderPath);
  const visible = viewIgnored ? listed : listed.filter((entry) => !entry.ignored);
  const extensions = useMemo(() => folderExtensions(visible), [visible]);
  const folders = visible.filter((entry) => entry.is_dir);
  const files = visible.filter((entry) => !entry.is_dir);
  const rawItems = changedOnly && !searching ? files : [...folders, ...files];
  const items = useMemo(() => applyFolderQuery(rawItems, sort, filter), [rawItems, sort, filter]);
  const itemPaths = items.map((entry) => entry.path);

  useEffect(() => {
    setFilter((prev) => {
      const next = prev.filter((ext) => extensions.includes(ext));
      return next.length === prev.length ? prev : next;
    });
  }, [extensions]);

  function selectEntry(path: string, event: MouseEvent) {
    event.preventDefault();
    if (event.shiftKey && anchor) {
      const from = itemPaths.indexOf(anchor);
      const to = itemPaths.indexOf(path);
      if (from >= 0 && to >= 0) {
        const start = Math.min(from, to);
        const end = Math.max(from, to);
        onSelect(itemPaths.slice(start, end + 1));
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
    const keep = selection.includes(path);
    const files = keep ? fileSelection(selection, items) : [];
    const paths = files.length > 0 ? files : [path];
    if (!keep) {
      onSelect([path]);
      setAnchor(path);
    }
    setMenu({ path, isDir: false, paths, x: event.clientX, y: event.clientY });
  }

  function onFolderMenu(path: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!selection.includes(path)) {
      onSelect([path]);
      setAnchor(path);
    }
    setMenu({ path, isDir: true, paths: [path], x: event.clientX, y: event.clientY });
  }

  const showEmptyFolder = forceEmpty || (items.length === 0 && !changedOnly && !searching && filter.length === 0);
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
        changedOnly={Boolean(changedOnly)}
        viewIgnored={Boolean(viewIgnored)}
        dirty={isDirty(status)}
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
        onChangedOnly={(value) => onChangedOnly?.(value)}
        onViewIgnored={(value) => onViewIgnored?.(value)}
      />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        {damaged ? (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden p-4">
            <DamagedPlaceholder locale={locale} busy={busy} onVerify={() => onVerify?.()} />
          </div>
        ) : showEmptyFolder ? (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden p-4">
            <FolderNullPlaceholder locale={locale} body={forceEmpty ? t(locale).createStash : undefined} />
          </div>
        ) : items.length === 0 ? (
          <div className="min-h-0 flex-1" />
        ) : (
          <FolderEntryGrid
            key={`${folderPath}:${changedOnly ? "changed" : "folder"}:${viewIgnored ? "ignored" : "tracked"}:${searching ? "search" : "list"}`}
            repoPath={repoPath}
            entries={items}
            selection={selection}
            status={status}
            locks={locks}
            hasMore={paginate}
            onSelect={selectEntry}
            onOpenFolder={onNavigate}
            onOpenFile={onOpenFile}
            onNeedMore={onNeedMore}
            onFileMenu={onFileMenu}
            onFolderMenu={onFolderMenu}
          />
        )}
      </div>
      {menu ? (
        <DropdownMenu open onOpenChange={(open) => { if (!open) setMenu(null); }}>
          <DropdownMenuTrigger asChild>
            <span className="fixed z-50 size-0" style={{ left: menu.x, top: menu.y }} />
          </DropdownMenuTrigger>
          {menu.isDir ? (
            <FolderPreviewItemMenu
              locale={locale}
              ignored={Boolean(items.find((entry) => entry.path === menu.path)?.ignored)}
              onIgnore={() => onIgnore?.(menu.path)}
              onUnignore={() => onUnignore?.(menu.path)}
            />
          ) : (
            <FilePreviewItemMenu
              locale={locale}
              locked={menu.paths.length > 0 && menu.paths.every((item) => locks.some((lock) => lock.file_path === item))}
              ignored={menu.paths.length > 0 && menu.paths.every((item) => Boolean(items.find((entry) => entry.path === item)?.ignored))}
              disableRename={menu.paths.length > 1}
              disableUnstage={!menu.paths.some((item) => isStagedPath(item, status))}
              onCreateCommit={() => onFileAction?.(menu.paths, { kind: "createCommit" })}
              onAddInCommit={() => onFileAction?.(menu.paths, { kind: "addInCommit" })}
              onUnstage={() => onFileAction?.(menu.paths, { kind: "unstage" })}
              onIgnore={() => onFileAction?.(menu.paths, { kind: "ignore" })}
              onUnignore={() => onFileAction?.(menu.paths, { kind: "unignore" })}
              onRename={() => onFileAction?.(menu.paths, { kind: "rename" })}
              onOpenInFolder={() => onFileAction?.(menu.paths, { kind: "openInFolder" })}
              onEditIn={(editor) => onFileAction?.(menu.paths, { kind: "editIn", editor })}
              onToggleLock={() => onFileAction?.(menu.paths, { kind: "toggleLock" })}
              onDeleteInProject={() => onFileAction?.(menu.paths, { kind: "deleteInProject" })}
            />
          )}
        </DropdownMenu>
      ) : null}
    </section>
  );
}
