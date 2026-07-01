import { useCallback, useEffect, useRef, useState } from "react";

import { changedPreviewPaths, sameDirEntryList } from "@/lib/dirEntries";
import { measureAsync } from "@/lib/performance";
import { ALL_FILES_PATH, isAllFilesPath } from "@/lib/projectViewPaths";
import { invalidateWorkdirPreview } from "@/lib/workdirPreviewCache";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  committableFilesInSubtree,
  fetchWorkdirEntries,
  fetchWorkdirEntriesByPaths,
  type DirEntry,
} from "@/wails/forester";

const PAGE_SIZE = 200;

interface UseWorkdirFolderEntriesOptions {
  folderPath: string;
  enabled: boolean;
  showChangedOnly: boolean;
  committable: string[];
}

function applyFileEntries(
  prev: DirEntry[],
  next: DirEntry[],
  repoPath: string | null,
): DirEntry[] {
  if (sameDirEntryList(prev, next)) {
    return prev;
  }
  if (repoPath) {
    const changed = changedPreviewPaths(prev, next);
    if (changed.length > 0) {
      invalidateWorkdirPreview(repoPath, changed);
    }
  }
  return next;
}

export function useWorkdirFolderEntries({
  folderPath,
  enabled,
  showChangedOnly,
  committable,
}: UseWorkdirFolderEntriesOptions) {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [subfolders, setSubfolders] = useState<DirEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const workdirGeneration = useProjectStore((s) => s.workdirGeneration);
  const committableKey = committable.join("\0");
  const scopeKey = showChangedOnly
    ? `${folderPath}\0${showChangedOnly}\0${committableKey}`
    : `${folderPath}\0${showChangedOnly}`;
  const prevScopeKeyRef = useRef(scopeKey);
  const loadGenerationRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setEntries([]);
      setSubfolders([]);
      setTotal(0);
      setHasMore(false);
      return;
    }

    const scopeChanged = prevScopeKeyRef.current !== scopeKey;
    if (scopeChanged) {
      prevScopeKeyRef.current = scopeKey;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setEntries([]);
      setSubfolders([]);
      setTotal(0);
      setHasMore(false);
    }

    loadGenerationRef.current += 1;
    const loadGeneration = loadGenerationRef.current;

    let cancelled = false;
    const load = async () => {
      if (scopeChanged) {
        setLoading(true);
      }
      const repoPath = useAppStore.getState().repoPath;
      try {
        if (showChangedOnly) {
          const paths = committableFilesInSubtree(folderPath, committable);
          if (paths.length === 0) {
            if (!cancelled && loadGeneration === loadGenerationRef.current) {
              setEntries((prev) => (prev.length === 0 ? prev : []));
              setSubfolders((prev) => (prev.length === 0 ? prev : []));
              setTotal((prev) => (prev === 0 ? prev : 0));
              setHasMore((prev) => (prev ? false : prev));
            }
            return;
          }
          const result = await measureAsync(`workdir.entries_by_paths:${folderPath || "root"}`, () =>
            fetchWorkdirEntriesByPaths(paths),
          );
          if (!cancelled && loadGeneration === loadGenerationRef.current) {
            const nextFiles = result.entries.filter((entry) => !entry.is_dir);
            setEntries((prev) => applyFileEntries(prev, nextFiles, repoPath));
            setSubfolders((prev) => (prev.length === 0 ? prev : []));
            setTotal((prev) => (prev === result.entries.length ? prev : result.entries.length));
            setHasMore((prev) => (prev ? false : prev));
          }
        } else if (isAllFilesPath(folderPath)) {
          const result = await measureAsync("workdir.entries:*:0", () =>
            fetchWorkdirEntries(ALL_FILES_PATH, 0, PAGE_SIZE),
          );
          if (!cancelled && loadGeneration === loadGenerationRef.current) {
            const nextFiles = result.entries.filter((entry) => !entry.is_dir);
            setEntries((prev) => applyFileEntries(prev, nextFiles, repoPath));
            setSubfolders((prev) => (prev.length === 0 ? prev : []));
            setTotal((prev) => (prev === result.total ? prev : result.total));
            setHasMore((prev) => (prev === result.has_more ? prev : result.has_more));
          }
        } else {
          const result = await measureAsync(`workdir.entries:${folderPath || "root"}:0`, () =>
            fetchWorkdirEntries(folderPath, 0, PAGE_SIZE),
          );
          if (!cancelled && loadGeneration === loadGenerationRef.current) {
            const nextFiles = result.entries.filter((entry) => !entry.is_dir);
            const nextFolders = result.entries.filter((entry) => entry.is_dir);
            setEntries((prev) => applyFileEntries(prev, nextFiles, repoPath));
            setSubfolders((prev) => (sameDirEntryList(prev, nextFolders) ? prev : nextFolders));
            setTotal((prev) => (prev === result.total ? prev : result.total));
            setHasMore((prev) => (prev === result.has_more ? prev : result.has_more));
          }
        }
      } catch {
        if (!cancelled && loadGeneration === loadGenerationRef.current && scopeChanged) {
          setEntries([]);
          setSubfolders([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, scopeKey, workdirGeneration, folderPath, showChangedOnly, committableKey]);

  const loadMore = useCallback(async () => {
    if (
      !enabled ||
      showChangedOnly ||
      !hasMore ||
      loadingMore ||
      loading ||
      loadingMoreRef.current
    ) {
      return;
    }

    const loadGeneration = loadGenerationRef.current;
    const offset = entries.length;
    const entriesPath = isAllFilesPath(folderPath) ? ALL_FILES_PATH : folderPath;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await measureAsync(`workdir.entries:${entriesPath}:${offset}`, () =>
        fetchWorkdirEntries(entriesPath, offset, PAGE_SIZE),
      );
      if (loadGeneration !== loadGenerationRef.current) {
        return;
      }
      const pageFiles = result.entries.filter((entry) => !entry.is_dir);
      setEntries((prev) => {
        const seen = new Set(prev.map((entry) => entry.path));
        const fresh = pageFiles.filter((entry) => !seen.has(entry.path));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      setHasMore(result.has_more);
      setTotal(result.total);
    } finally {
      if (loadGeneration === loadGenerationRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [enabled, showChangedOnly, hasMore, loadingMore, loading, folderPath, entries.length]);

  return {
    entries,
    subfolders,
    total,
    hasMore,
    loading,
    loadingMore,
    loadMore,
  };
}
