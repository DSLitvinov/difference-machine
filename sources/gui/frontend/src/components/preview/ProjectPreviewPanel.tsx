import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FilePreviewItem } from "@/components/preview/FilePreviewItem";
import { FolderPreviewItem } from "@/components/preview/FolderPreviewItem";
import { PreviewToolbar, sortByName } from "@/components/preview/PreviewToolbar";
import { gridMinCellSize } from "@/lib/previewScale";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  committableFilesInSubtree,
  fetchStatus,
  fetchWorkdirEntries,
  fetchWorkdirSearch,
  fetchWorkdirTree,
  openWorkdirFile,
  vcsFileStatus,
  type DirEntry,
} from "@/wails/forester";
import type { SortLocale } from "@/lib/storage";

function dirEntriesFromPaths(paths: string[]): DirEntry[] {
  return paths.map((path) => ({
    name: path.split("/").pop() ?? path,
    path,
    is_dir: false,
    item_count: 0,
    size: 0,
  }));
}

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
    const [tree, status] = await Promise.all([fetchWorkdirTree("", 1), fetchStatus()]);
    store.setFolderTree(tree);
    store.setStatus(status);
    useAppStore.getState().setForesterError(null);
  } catch (err) {
    useAppStore.getState().setForesterError(err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    store.setTreeLoading(false);
  }
}

export function ProjectPreviewPanel() {
  const repoPath = useAppStore((s) => s.repoPath);
  const setError = useAppStore((s) => s.setError);
  const setNotice = useAppStore((s) => s.setNotice);
  const selectedFolderPath = useProjectStore((s) => s.selectedFolderPath);
  const selectedFilePaths = useProjectStore((s) => s.selectedFilePaths);
  const navigateToFolder = useProjectStore((s) => s.navigateToFolder);
  const navigateBack = useProjectStore((s) => s.navigateBack);
  const navigateForward = useProjectStore((s) => s.navigateForward);
  const navStack = useProjectStore((s) => s.navStack);
  const navIndex = useProjectStore((s) => s.navIndex);
  const toggleFileSelection = useProjectStore((s) => s.toggleFileSelection);
  const showChangedOnly = useProjectStore((s) => s.showChangedOnly);
  const committable = useProjectStore((s) => s.committable);
  const status = useProjectStore((s) => s.status);
  const sortLocale = useProjectStore((s) => s.sortLocale);
  const setSortLocale = useProjectStore((s) => s.setSortLocale);
  const thumbScale = useProjectStore((s) => s.thumbScale);
  const setThumbScale = useProjectStore((s) => s.setThumbScale);
  const previewSearchQuery = useProjectStore((s) => s.previewSearchQuery);
  const setPreviewSearchQuery = useProjectStore((s) => s.setPreviewSearchQuery);

  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [subfolders, setSubfolders] = useState<DirEntry[]>([]);
  const [searchResults, setSearchResults] = useState<DirEntry[]>([]);
  const [searchCapped, setSearchCapped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(previewSearchQuery);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(previewSearchQuery), 200);
    return () => window.clearTimeout(timer);
  }, [previewSearchQuery]);

  const isSearchActive = debouncedSearch.trim().length > 0;
  const cellMin = gridMinCellSize(thumbScale);

  useEffect(() => {
    if (!repoPath || isSearchActive) {
      if (!isSearchActive) {
        setSearchResults([]);
        setSearchCapped(false);
      }
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (showChangedOnly) {
          const paths = committableFilesInSubtree(selectedFolderPath, committable);
          if (!cancelled) {
            setEntries(dirEntriesFromPaths(paths));
            setSubfolders([]);
          }
        } else {
          const result = await fetchWorkdirEntries(selectedFolderPath, 0, 200);
          if (!cancelled) {
            setEntries(result.entries.filter((e) => !e.is_dir));
            setSubfolders(result.entries.filter((e) => e.is_dir));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoPath, selectedFolderPath, showChangedOnly, committable, isSearchActive]);

  useEffect(() => {
    if (!repoPath || !isSearchActive) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setSearchLoading(true);
      try {
        const result = await fetchWorkdirSearch(debouncedSearch.trim(), 200);
        if (cancelled) return;
        let entries = result.entries;
        if (showChangedOnly) {
          const allowed = new Set(committable);
          entries = entries.filter((entry) => !entry.is_dir && allowed.has(entry.path));
        }
        setSearchResults(entries);
        setSearchCapped(result.capped);
        if (result.capped) {
          setNotice("Showing first 200 search results");
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
  }, [repoPath, debouncedSearch, showChangedOnly, committable, isSearchActive, setError, setNotice]);

  const openFile = async (path: string) => {
    try {
      setError(null);
      await openWorkdirFile(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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

  if (!repoPath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a repository from the sidebar
      </div>
    );
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

      <div className="flex-1 overflow-auto px-4 py-3">
        {isSearchActive ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Search results for &ldquo;{debouncedSearch.trim()}&rdquo; ({searchResults.length})
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewSearchQuery("")}
              >
                Clear
              </Button>
            </div>
            {searchLoading ? (
              <p className="text-sm text-muted-foreground">Searching…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No results for &ldquo;{debouncedSearch.trim()}&rdquo;
              </p>
            ) : (
              <>
                {searchCapped ? (
                  <p className="text-xs text-muted-foreground">Showing first 200 matches</p>
                ) : null}
                {!showChangedOnly && searchFolders.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Folders ({searchFolders.length})
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
                      Files ({searchFiles.length})
                    </p>
                    <ul
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
                      }}
                    >
                      {searchFiles.map((entry) => (
                        <li key={entry.path}>
                          <FilePreviewItem
                            name={entry.name}
                            path={entry.path}
                            thumbScale={thumbScale}
                            subtitle={parentFolderPath(entry.path) || "root"}
                            selected={selectedFilePaths.includes(entry.path)}
                            vcsStatus={vcsFileStatus(entry.path, status)}
                            onSelect={(event) =>
                              toggleFileSelection(entry.path, event.metaKey || event.ctrlKey)
                            }
                            onOpen={() => void openFile(entry.path)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-6">
            {!showChangedOnly && subfolders.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Folders</p>
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
                {showChangedOnly ? "No changed files" : "No files in this folder"}
              </p>
            ) : (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {showChangedOnly
                    ? `Changed files (${sortedEntries.length})`
                    : `Files${selectedFolderPath ? ` (${selectedFolderPath.split("/").pop()})` : ""}`}
                </p>
                <ul
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
                  }}
                >
                  {sortedEntries.map((entry) => (
                    <li key={entry.path}>
                      <FilePreviewItem
                        name={entry.name}
                        path={entry.path}
                        thumbScale={thumbScale}
                        subtitle={
                          showChangedOnly ? parentFolderPath(entry.path) || "root" : undefined
                        }
                        selected={selectedFilePaths.includes(entry.path)}
                        vcsStatus={vcsFileStatus(entry.path, status)}
                        onSelect={(event) =>
                          toggleFileSelection(entry.path, event.metaKey || event.ctrlKey)
                        }
                        onOpen={() => void openFile(entry.path)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
