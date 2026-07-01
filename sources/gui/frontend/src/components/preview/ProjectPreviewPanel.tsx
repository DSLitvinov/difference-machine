import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FilePreviewGrid } from "@/components/preview/FilePreviewGrid";
import { FileHistoryView } from "@/components/preview/FileHistoryView";
import { FileViewer } from "@/components/preview/FileViewer";
import { FolderPreviewItem } from "@/components/preview/FolderPreviewItem";
import { PreviewBreadcrumbs } from "@/components/preview/PreviewBreadcrumbs";
import { PreviewToolbar, sortDirEntries, sortByName, nameLocaleFromSortMode, extensionKeyFromPath } from "@/components/preview/PreviewToolbar";
import { measureAsync } from "@/lib/performance";
import { gridMinCellSize } from "@/lib/previewScale";
import { ALL_FILES_PATH, isAllFilesPath } from "@/lib/projectViewPaths";
import { isEditableElement, isSelectAllShortcut } from "@/lib/keyboard";
import { useT, type TranslationKey } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { useWorkdirFolderEntries } from "@/hooks/useWorkdirFolderEntries";
import {
  committableFilesInSubtree,
  fetchStatus,
  fetchLockList,
  fetchWorkdirSearch,
  fetchWorkdirTree,
  locksByPath,
  normalizeRepoRelPath,
  vcsFileStatus,
  type DirEntry,
  type StatusPayload,
} from "@/wails/forester";

const PREVIEW_SECTION_HEADER =
  "text-xl font-semibold leading-7 tracking-tight text-foreground";
const LARGE_REPO_FILE_COUNT = 10000;
const LARGE_FOLDER_ENTRY_COUNT = 1000;

function breadcrumbSegments(
  folderPath: string,
  repoName: string | null,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): { label: string; path: string }[] {
  if (isAllFilesPath(folderPath)) {
    const label = repoName
      ? t("sidebar.allFilesProject", { name: repoName })
      : t("sidebar.allFiles");
    return [{ label, path: ALL_FILES_PATH }];
  }
  if (folderPath === "") {
    return [{ label: "root", path: "" }];
  }
  const parts = folderPath.split("/");
  const segments: { label: string; path: string }[] = [{ label: "root", path: "" }];
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    segments.push({ label: part, path: acc });
  }
  return segments;
}

function parentFolderPath(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}

export async function loadProjectData() {
  const store = useProjectStore.getState();
  const repoPath = useAppStore.getState().repoPath;
  if (!repoPath) return;
  store.restoreRepoPrefs(repoPath);
  const pendingStatus = store.consumePendingOpenStatus(repoPath);
  store.setTreeLoading(true);
  try {
    const statusTask: Promise<StatusPayload> =
      pendingStatus !== undefined ? Promise.resolve(pendingStatus) : fetchStatus();
    const [tree, status, locks] = await measureAsync("project.load", () =>
      Promise.all([
        fetchWorkdirTree("", 1),
        statusTask,
        fetchLockList(),
      ]),
    );
    store.setFolderTree(tree);
    store.setStatus(status);
    store.setLocks(locksByPath(locks));
    await measureAsync("project.hydrateExpandedFolders", () => store.hydrateExpandedFolders());
    store.markProjectDataLoaded(repoPath);
    useAppStore.getState().setForesterError(null);
  } catch (err) {
    useAppStore.getState().setForesterError(err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    store.setTreeLoading(false);
  }
}

export function ProjectPreviewPanel() {
  const t = useT();
  const repoPath = useAppStore((s) => s.repoPath);
  const repoName = useAppStore((s) => s.repoName);
  const setError = useAppStore((s) => s.setError);
  const setNotice = useAppStore((s) => s.setNotice);
  const selectedFolderPath = useProjectStore((s) => s.selectedFolderPath);
  const navigateToFolder = useProjectStore((s) => s.navigateToFolder);
  const showChangedOnly = useProjectStore((s) => s.showChangedOnly);
  const setShowChangedOnly = useProjectStore((s) => s.setShowChangedOnly);
  const committable = useProjectStore((s) => s.committable);
  const status = useProjectStore((s) => s.status);
  const folderTree = useProjectStore((s) => s.folderTree);
  const lockedByPath = useProjectStore((s) => s.lockedByPath);
  const sortMode = useProjectStore((s) => s.sortMode);
  const setSortMode = useProjectStore((s) => s.setSortMode);
  const thumbScale = useProjectStore((s) => s.thumbScale);
  const setThumbScale = useProjectStore((s) => s.setThumbScale);
  const previewSearchQuery = useProjectStore((s) => s.previewSearchQuery);
  const setPreviewSearchQuery = useProjectStore((s) => s.setPreviewSearchQuery);
  const selectFilePaths = useProjectStore((s) => s.selectFilePaths);
  const clearFileSelection = useProjectStore((s) => s.clearFileSelection);
  const projectPreviewMode = useProjectStore((s) => s.projectPreviewMode);
  const fileHistoryPath = useProjectStore((s) => s.fileHistoryPath);
  const fileViewerPath = useProjectStore((s) => s.fileViewerPath);
  const openFileViewer = useProjectStore((s) => s.openFileViewer);
  const closeFileViewer = useProjectStore((s) => s.closeFileViewer);
  const closeFileHistory = useProjectStore((s) => s.closeFileHistory);

  const [searchResults, setSearchResults] = useState<DirEntry[]>([]);
  const [searchCapped, setSearchCapped] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(previewSearchQuery);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [hiddenExtensions, setHiddenExtensions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(previewSearchQuery), 200);
    return () => window.clearTimeout(timer);
  }, [previewSearchQuery]);

  useEffect(() => {
    setHiddenExtensions(new Set());
  }, [repoPath]);

  const toggleExtensionFilter = useCallback((ext: string, checked: boolean) => {
    setHiddenExtensions((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.delete(ext);
      } else {
        next.add(ext);
      }
      return next;
    });
  }, []);

  const clearExtensionFilters = useCallback(() => {
    setHiddenExtensions(new Set());
  }, []);

  const passesExtensionFilter = useCallback(
    (entry: DirEntry) => entry.is_dir || !hiddenExtensions.has(extensionKeyFromPath(entry.path)),
    [hiddenExtensions],
  );

  const isSearchActive = debouncedSearch.trim().length > 0;
  const cellMin = gridMinCellSize(thumbScale);

  const {
    entries,
    subfolders,
    total: entriesTotal,
    hasMore: entriesHasMore,
    loading,
    loadingMore,
    loadMore,
  } = useWorkdirFolderEntries({
    folderPath: selectedFolderPath,
    enabled: Boolean(repoPath) && !isSearchActive,
    showChangedOnly,
    committable,
  });

  const handleNearEnd = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (!isSearchActive) {
      setSearchResults([]);
      setSearchCapped(false);
    }
  }, [isSearchActive]);

  useEffect(() => {
    if (!repoPath || !isSearchActive) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setSearchLoading(true);
      try {
        const result = await measureAsync(`workdir.search:${debouncedSearch.trim()}`, () =>
          fetchWorkdirSearch(debouncedSearch.trim(), 200),
        );
        if (cancelled) return;
        let entries = result.entries;
        if (showChangedOnly) {
          const allowed = new Set(
            committableFilesInSubtree(selectedFolderPath, committable).map(normalizeRepoRelPath),
          );
          entries = entries.filter(
            (entry) => !entry.is_dir && allowed.has(normalizeRepoRelPath(entry.path)),
          );
        }
        setSearchResults(entries);
        setSearchCapped(result.capped);
        if (result.capped) {
          setNotice(t("preview.showingFirstSearchResults"));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    repoPath,
    debouncedSearch,
    showChangedOnly,
    committable,
    selectedFolderPath,
    isSearchActive,
    setError,
    setNotice,
    t,
  ]);

  const openFile = (path: string) => {
    openFileViewer(path);
  };

  const crumbs = breadcrumbSegments(selectedFolderPath, repoName, t);
  const allFilesView = isAllFilesPath(selectedFolderPath);
  const nameLocale = nameLocaleFromSortMode(sortMode);
  const sortedSubfolders = sortByName(subfolders, nameLocale);
  const filteredEntries = useMemo(() => {
    let scoped = entries;
    if (showChangedOnly) {
      const allowed = new Set(
        committableFilesInSubtree(selectedFolderPath, committable).map(normalizeRepoRelPath),
      );
      scoped = entries.filter(
        (entry) => !entry.is_dir && allowed.has(normalizeRepoRelPath(entry.path)),
      );
    }
    return scoped.filter(passesExtensionFilter);
  }, [entries, showChangedOnly, selectedFolderPath, committable, passesExtensionFilter]);
  const sortedEntries = sortDirEntries(filteredEntries, sortMode, { byPath: showChangedOnly });

  const fileSourcesForExtensions = useMemo(
    () => (isSearchActive ? searchResults.filter((entry) => !entry.is_dir) : entries),
    [isSearchActive, searchResults, entries],
  );
  const availableExtensions = useMemo(() => {
    const extensions = new Set<string>();
    for (const entry of fileSourcesForExtensions) {
      extensions.add(extensionKeyFromPath(entry.path));
    }
    return Array.from(extensions).sort((a, b) => a.localeCompare(b));
  }, [fileSourcesForExtensions]);

  const searchFolders = useMemo(
    () => sortByName(searchResults.filter((entry) => entry.is_dir), nameLocale),
    [searchResults, nameLocale],
  );
  const searchFiles = useMemo(
    () => sortDirEntries(
      searchResults.filter((entry) => !entry.is_dir && passesExtensionFilter(entry)),
      sortMode,
    ),
    [searchResults, sortMode, passesExtensionFilter],
  );
  const searchFilePaths = useMemo(() => searchFiles.map((f) => f.path), [searchFiles]);
  const sortedEntryPaths = useMemo(() => sortedEntries.map((f) => f.path), [sortedEntries]);
  const selectableFilePaths = isSearchActive ? searchFilePaths : sortedEntryPaths;

  const vcsStatusFor = useCallback((path: string) => vcsFileStatus(path, status), [status]);
  const lockUserFor = useCallback(
    (path: string) => lockedByPath[path] ?? null,
    [lockedByPath],
  );
  const searchSubtitleFor = useCallback(
    (entry: DirEntry) => parentFolderPath(entry.path) || "root",
    [],
  );
  const changedSubtitleFor = useCallback(
    (entry: DirEntry) => parentFolderPath(entry.path) || "root",
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearFileSelection();
        return;
      }
      if (!isSelectAllShortcut(event)) return;
      if (isEditableElement(event.target)) return;
      if (selectableFilePaths.length === 0) return;

      event.preventDefault();
      selectFilePaths(selectableFilePaths);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearFileSelection, selectFilePaths, selectableFilePaths]);

  if (!repoPath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("common.selectRepositoryFromSidebar")}
      </div>
    );
  }

  if (projectPreviewMode === "fileHistory" && fileHistoryPath) {
    return <FileHistoryView filePath={fileHistoryPath} onBack={closeFileHistory} />;
  }

  if (projectPreviewMode === "fileViewer" && fileViewerPath) {
    return <FileViewer filePath={fileViewerPath} onBack={closeFileViewer} />;
  }

  return (
    <div className="flex h-full flex-col">
      <PreviewToolbar
        showChangedOnly={showChangedOnly}
        searchQuery={previewSearchQuery}
        searchLoading={searchLoading}
        sortMode={sortMode}
        thumbScale={thumbScale}
        availableExtensions={availableExtensions}
        hiddenExtensions={hiddenExtensions}
        onShowChangedOnlyChange={setShowChangedOnly}
        onSearchChange={setPreviewSearchQuery}
        onSearchClear={() => setPreviewSearchQuery("")}
        onSortModeChange={setSortMode}
        onToggleExtensionFilter={toggleExtensionFilter}
        onClearExtensionFilters={clearExtensionFilters}
        onThumbScaleChange={setThumbScale}
      />

      {!isSearchActive ? (
        <PreviewBreadcrumbs segments={crumbs} onSelect={navigateToFolder} />
      ) : null}

      <div ref={setScrollElement} className="flex-1 overflow-auto px-4 py-3">
        {folderTree && folderTree.item_count >= LARGE_REPO_FILE_COUNT ? (
          <p className="mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("preview.largeRepository", { count: folderTree.item_count.toLocaleString() })}
          </p>
        ) : null}
        {isSearchActive ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {t("preview.searchResults", {
                  query: debouncedSearch.trim(),
                  count: searchResults.length,
                })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewSearchQuery("")}
              >
                {t("common.clear")}
              </Button>
            </div>
            {searchLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.searching")}</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("preview.noResults", { query: debouncedSearch.trim() })}
              </p>
            ) : (
              <>
                {searchCapped ? (
                  <p className="text-xs text-muted-foreground">{t("preview.showingFirstMatches")}</p>
                ) : null}
                {!showChangedOnly && searchFolders.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    <p className={PREVIEW_SECTION_HEADER}>
                      {t("common.folders")} ({searchFolders.length})
                    </p>
                    <ul
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
                      }}
                    >
                      {searchFolders.map((entry) => (
                        <li key={entry.path}>
                          <FolderPreviewItem
                            name={entry.name}
                            thumbScale={thumbScale}
                            subtitle={entry.path}
                            onOpen={() => navigateToFolder(entry.path)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {searchFiles.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    <p className={PREVIEW_SECTION_HEADER}>
                      {t("common.files")} ({searchFiles.length})
                    </p>
                    <FilePreviewGrid
                      files={searchFiles}
                      orderedPaths={searchFilePaths}
                      thumbScale={thumbScale}
                      scrollElement={scrollElement}
                      vcsStatusFor={vcsStatusFor}
                      lockUserFor={lockUserFor}
                      subtitleFor={searchSubtitleFor}
                      onOpen={openFile}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {!showChangedOnly && !allFilesView && subfolders.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <p className={PREVIEW_SECTION_HEADER}>{t("common.folders")}</p>
                <ul
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
                  }}
                >
                  {sortedSubfolders.map((entry) => (
                    <li key={entry.path}>
                      <FolderPreviewItem
                        name={entry.name}
                        fileCount={entry.item_count}
                        thumbScale={thumbScale}
                        onOpen={() => navigateToFolder(entry.path)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {sortedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {showChangedOnly ? t("common.noChangedFiles") : t("common.noFilesInFolder")}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                <p className={PREVIEW_SECTION_HEADER}>
                  {showChangedOnly
                    ? t("preview.changedFilesCount", { count: sortedEntries.length })
                    : allFilesView
                      ? repoName
                        ? t("sidebar.allFilesProject", { name: repoName })
                        : t("sidebar.allFiles")
                      : `${t("common.files")} (${selectedFolderPath.split("/").pop() ?? ""})`}
                </p>
                {entriesHasMore && !showChangedOnly ? (
                  <p className="mb-2 text-xs text-muted-foreground">
                    {loadingMore ? t("common.loadingMoreFiles") : t("preview.scrollToLoadMore")}
                  </p>
                ) : null}
                {entriesTotal >= LARGE_FOLDER_ENTRY_COUNT && !showChangedOnly ? (
                  <p className="mb-2 text-xs text-muted-foreground">
                    {t("preview.largeFolder", { count: entriesTotal.toLocaleString() })}
                  </p>
                ) : null}
                <FilePreviewGrid
                  files={sortedEntries}
                  orderedPaths={sortedEntryPaths}
                  thumbScale={thumbScale}
                  scrollElement={scrollElement}
                  vcsStatusFor={vcsStatusFor}
                  lockUserFor={lockUserFor}
                  subtitleFor={
                    showChangedOnly || allFilesView ? changedSubtitleFor : undefined
                  }
                  onOpen={openFile}
                  onNearEnd={entriesHasMore ? handleNearEnd : undefined}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
