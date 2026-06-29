import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FilePreviewGrid } from "@/components/preview/FilePreviewGrid";
import { FileHistoryView } from "@/components/preview/FileHistoryView";
import { FolderPreviewItem } from "@/components/preview/FolderPreviewItem";
import { PreviewToolbar, sortByName } from "@/components/preview/PreviewToolbar";
import { measureAsync } from "@/lib/performance";
import { gridMinCellSize } from "@/lib/previewScale";
import { isEditableElement, isSelectAllShortcut } from "@/lib/keyboard";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { useWorkdirFolderEntries } from "@/hooks/useWorkdirFolderEntries";
import type { SortLocale } from "@/lib/storage";
import {
  fetchStatus,
  fetchLockList,
  fetchWorkdirSearch,
  fetchWorkdirTree,
  locksByPath,
  vcsFileStatus,
  type DirEntry,
} from "@/wails/forester";

const LARGE_REPO_FILE_COUNT = 10000;
const LARGE_FOLDER_ENTRY_COUNT = 1000;

function sortByPath<T extends { path: string }>(items: T[], locale: SortLocale): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return [...items].sort((a, b) => collator.compare(a.path, b.path));
}

function breadcrumbSegments(folderPath: string): { label: string; path: string }[] {
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
  if (repoPath) {
    store.restoreRepoPrefs(repoPath);
  }
  store.setTreeLoading(true);
  try {
    const [tree, status, locks] = await measureAsync("project.load", () =>
      Promise.all([
        fetchWorkdirTree("", 1),
        fetchStatus(),
        fetchLockList(),
      ]),
    );
    store.setFolderTree(tree);
    store.setStatus(status);
    store.setLocks(locksByPath(locks));
    await measureAsync("project.hydrateExpandedFolders", () => store.hydrateExpandedFolders());
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
  const setError = useAppStore((s) => s.setError);
  const setNotice = useAppStore((s) => s.setNotice);
  const selectedFolderPath = useProjectStore((s) => s.selectedFolderPath);
  const navigateToFolder = useProjectStore((s) => s.navigateToFolder);
  const navigateBack = useProjectStore((s) => s.navigateBack);
  const navigateForward = useProjectStore((s) => s.navigateForward);
  const navStack = useProjectStore((s) => s.navStack);
  const navIndex = useProjectStore((s) => s.navIndex);
  const showChangedOnly = useProjectStore((s) => s.showChangedOnly);
  const committable = useProjectStore((s) => s.committable);
  const status = useProjectStore((s) => s.status);
  const folderTree = useProjectStore((s) => s.folderTree);
  const lockedByPath = useProjectStore((s) => s.lockedByPath);
  const sortLocale = useProjectStore((s) => s.sortLocale);
  const setSortLocale = useProjectStore((s) => s.setSortLocale);
  const thumbScale = useProjectStore((s) => s.thumbScale);
  const setThumbScale = useProjectStore((s) => s.setThumbScale);
  const previewSearchQuery = useProjectStore((s) => s.previewSearchQuery);
  const setPreviewSearchQuery = useProjectStore((s) => s.setPreviewSearchQuery);
  const selectFilePaths = useProjectStore((s) => s.selectFilePaths);
  const clearFileSelection = useProjectStore((s) => s.clearFileSelection);
  const projectPreviewMode = useProjectStore((s) => s.projectPreviewMode);
  const fileHistoryPath = useProjectStore((s) => s.fileHistoryPath);
  const openFileHistory = useProjectStore((s) => s.openFileHistory);
  const closeFileHistory = useProjectStore((s) => s.closeFileHistory);

  const [searchResults, setSearchResults] = useState<DirEntry[]>([]);
  const [searchCapped, setSearchCapped] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(previewSearchQuery);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(previewSearchQuery), 200);
    return () => window.clearTimeout(timer);
  }, [previewSearchQuery]);

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
          const allowed = new Set(committable);
          entries = entries.filter((entry) => !entry.is_dir && allowed.has(entry.path));
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
  }, [repoPath, debouncedSearch, showChangedOnly, committable, isSearchActive, setError, setNotice, t]);

  const openFile = (path: string) => {
    openFileHistory(path);
  };

  const crumbs = breadcrumbSegments(selectedFolderPath);
  const sortedSubfolders = sortByName(subfolders, sortLocale);
  const sortedEntries = showChangedOnly
    ? sortByPath(entries, sortLocale)
    : sortByName(entries, sortLocale);

  const searchFolders = useMemo(
    () => sortByName(searchResults.filter((entry) => entry.is_dir), sortLocale),
    [searchResults, sortLocale],
  );
  const searchFiles = useMemo(
    () => sortByName(searchResults.filter((entry) => !entry.is_dir), sortLocale),
    [searchResults, sortLocale],
  );
  const searchFilePaths = useMemo(() => searchFiles.map((f) => f.path), [searchFiles]);
  const sortedEntryPaths = useMemo(() => sortedEntries.map((f) => f.path), [sortedEntries]);
  const selectableFilePaths = isSearchActive ? searchFilePaths : sortedEntryPaths;

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

  return (
    <div className="flex h-full flex-col">
      <PreviewToolbar
        breadcrumbs={crumbs}
        canGoBack={navIndex > 0}
        canGoForward={navIndex < navStack.length - 1}
        showChangedOnly={showChangedOnly}
        searchQuery={previewSearchQuery}
        searchLoading={searchLoading}
        sortLocale={sortLocale}
        thumbScale={thumbScale}
        onBack={navigateBack}
        onForward={navigateForward}
        onBreadcrumbSelect={navigateToFolder}
        onSearchChange={setPreviewSearchQuery}
        onSearchClear={() => setPreviewSearchQuery("")}
        onSortLocaleChange={setSortLocale}
        onThumbScaleChange={setThumbScale}
      />

      <div ref={setScrollElement} className="flex-1 overflow-auto px-4 py-3">
        {folderTree && folderTree.item_count >= LARGE_REPO_FILE_COUNT ? (
          <p className="mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("preview.largeRepository", { count: folderTree.item_count.toLocaleString() })}
          </p>
        ) : null}
        {isSearchActive ? (
          <div className="space-y-6">
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
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
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
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      {t("common.files")} ({searchFiles.length})
                    </p>
                    <FilePreviewGrid
                      files={searchFiles}
                      orderedPaths={searchFilePaths}
                      thumbScale={thumbScale}
                      scrollElement={scrollElement}
                      vcsStatusFor={(path) => vcsFileStatus(path, status)}
                      lockUserFor={(path) => lockedByPath[path] ?? null}
                      subtitleFor={(entry) => parentFolderPath(entry.path) || "root"}
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
          <div className="space-y-6">
            {!showChangedOnly && subfolders.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {t("common.folders")}
                </p>
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
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {showChangedOnly
                    ? t("preview.changedFilesCount", { count: sortedEntries.length })
                    : `${t("common.files")}${selectedFolderPath ? ` (${selectedFolderPath.split("/").pop()})` : ""}${
                        entriesTotal > sortedEntries.length
                          ? ` — ${t("preview.showingFilesOfTotal", {
                              shown: sortedEntries.length,
                              total: entriesTotal,
                            })}`
                          : ""
                      }`}
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
                  vcsStatusFor={(path) => vcsFileStatus(path, status)}
                  lockUserFor={(path) => lockedByPath[path] ?? null}
                  subtitleFor={
                    showChangedOnly
                      ? (entry) => parentFolderPath(entry.path) || "root"
                      : undefined
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
