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
  const cacheKey = path && repoPath ? previewCacheKey(repoPath, path) : null;
  const [preview, setPreview] = useState<WorkdirPreviewState>(initialState);

  useEffect(() => {
    if (!cacheKey) {
      setPreview(initialState);
      return;
    }

    setPreview(getCachedPreview(cacheKey));
    return subscribePreview(cacheKey, () => {
      setPreview(getCachedPreview(cacheKey));
    });
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheKey || !path || !repoPath) return;
    void ensurePreviewLoaded(cacheKey, path, kind);
  }, [cacheKey, path, kind, repoPath]);

  if (!cacheKey) return initialState;
  return preview;
}
