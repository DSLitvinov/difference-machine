import { useCallback, useEffect, useState } from "react";

import {
  committableFilesInSubtree,
  fetchWorkdirEntries,
  type DirEntry,
} from "@/wails/forester";

const PAGE_SIZE = 200;

function dirEntriesFromPaths(paths: string[]): DirEntry[] {
  return paths.map((path) => ({
    name: path.split("/").pop() ?? path,
    path,
    is_dir: false,
    item_count: 0,
    size: 0,
  }));
}

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

  useEffect(() => {
    if (!enabled) {
      setEntries([]);
      setSubfolders([]);
      setTotal(0);
      setHasMore(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (showChangedOnly) {
          const paths = committableFilesInSubtree(folderPath, committable);
          if (!cancelled) {
            setEntries(dirEntriesFromPaths(paths));
            setSubfolders([]);
            setTotal(paths.length);
            setHasMore(false);
          }
        } else {
          const result = await fetchWorkdirEntries(folderPath, 0, PAGE_SIZE);
          if (!cancelled) {
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
  }, [enabled, folderPath, showChangedOnly, committable]);

  const loadMore = useCallback(async () => {
    if (!enabled || showChangedOnly || !hasMore || loadingMore || loading) {
      return;
    }

    setLoadingMore(true);
    try {
      const result = await fetchWorkdirEntries(folderPath, entries.length, PAGE_SIZE);
      setEntries((prev) => [...prev, ...result.entries.filter((entry) => !entry.is_dir)]);
      setHasMore(result.has_more);
      setTotal(result.total);
    } finally {
      setLoadingMore(false);
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
