import { useCallback, useEffect, useRef, useState } from "react";

import { measureAsync } from "@/lib/performance";
import { ALL_FILES_PATH, isAllFilesPath } from "@/lib/projectViewPaths";
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

    loadGenerationRef.current += 1;
    const loadGeneration = loadGenerationRef.current;
    loadingMoreRef.current = false;
    setLoadingMore(false);

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (showChangedOnly) {
          const paths = committableFilesInSubtree(folderPath, committable);
          const result = await measureAsync(`workdir.entries_by_paths:${folderPath || "root"}`, () =>
            fetchWorkdirEntriesByPaths(paths),
          );
          if (!cancelled && loadGeneration === loadGenerationRef.current) {
            setEntries(result.entries);
            setSubfolders([]);
            setTotal(result.entries.length);
            setHasMore(false);
          }
        } else if (isAllFilesPath(folderPath)) {
          const result = await measureAsync("workdir.entries:*:0", () =>
            fetchWorkdirEntries(ALL_FILES_PATH, 0, PAGE_SIZE),
          );
          if (!cancelled && loadGeneration === loadGenerationRef.current) {
            setEntries(result.entries.filter((entry) => !entry.is_dir));
            setSubfolders([]);
            setTotal(result.total);
            setHasMore(result.has_more);
          }
        } else {
          const result = await measureAsync(`workdir.entries:${folderPath || "root"}:0`, () =>
            fetchWorkdirEntries(folderPath, 0, PAGE_SIZE),
          );
          if (!cancelled && loadGeneration === loadGenerationRef.current) {
            setEntries(result.entries.filter((entry) => !entry.is_dir));
            setSubfolders(result.entries.filter((entry) => entry.is_dir));
            setTotal(result.total);
            setHasMore(result.has_more);
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
  }, [enabled, folderPath, showChangedOnly, committable, workdirGeneration]);

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
