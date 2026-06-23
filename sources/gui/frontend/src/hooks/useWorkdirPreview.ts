import { useEffect, useState } from "react";

import type { InfoPreviewKind } from "@/lib/fileKinds";
import {
  ensurePreviewLoaded,
  getCachedPreview,
  previewCacheKey,
  subscribePreview,
  type WorkdirPreviewState,
} from "@/lib/previewCache";
import { useAppStore } from "@/stores/appStore";

const initialState: WorkdirPreviewState = {
  loading: false,
  previewUrl: null,
  textPreview: null,
  failed: false,
};

export type { WorkdirPreviewState };

export function useWorkdirPreview(path: string | null, kind: InfoPreviewKind | "image"): WorkdirPreviewState {
  const repoPath = useAppStore((s) => s.repoPath);
  const cacheKey = path ? previewCacheKey(repoPath, path) : null;
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!cacheKey) return;
    return subscribePreview(cacheKey, () => setRevision((n) => n + 1));
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheKey || !path) return;
    void ensurePreviewLoaded(cacheKey, path, kind);
  }, [cacheKey, path, kind]);

  if (!cacheKey) return initialState;
  void revision;
  return getCachedPreview(cacheKey);
}
