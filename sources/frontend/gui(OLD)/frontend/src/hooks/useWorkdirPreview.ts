import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { InfoPreviewKind } from "@/lib/fileKinds";
import {
  clearWorkdirPreviewCache,
  getWorkdirPreviewCached,
  isWorkdirPreviewLoading,
  loadWorkdirPreview,
  subscribeWorkdirPreview,
  type WorkdirPreviewState,
} from "@/lib/workdirPreviewCache";
import { useAppStore } from "@/stores/appStore";

export type { WorkdirPreviewState };

const emptyState: WorkdirPreviewState = {
  loading: false,
  previewUrl: null,
  textPreview: null,
  failed: false,
};

const loadingState: WorkdirPreviewState = {
  loading: true,
  previewUrl: null,
  textPreview: null,
  failed: false,
};

function shouldLoad(kind: InfoPreviewKind | "image"): boolean {
  return kind === "image" || kind === "text" || kind === "blend";
}

function failOnPlaceholder(kind: InfoPreviewKind | "image"): boolean {
  return kind === "image" || kind === "blend";
}

function readPreviewSnapshot(
  repoPath: string | null,
  path: string | null,
  kind: InfoPreviewKind | "image",
): WorkdirPreviewState {
  if (!path || !repoPath || !shouldLoad(kind)) {
    return emptyState;
  }

  const cached = getWorkdirPreviewCached(repoPath, path);
  if (cached) {
    return cached;
  }

  if (isWorkdirPreviewLoading(repoPath, path)) {
    return loadingState;
  }

  return emptyState;
}

export function useWorkdirPreview(path: string | null, kind: InfoPreviewKind | "image"): WorkdirPreviewState {
  const repoPath = useAppStore((s) => s.repoPath);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const [preview, setPreview] = useState<WorkdirPreviewState>(() =>
    readPreviewSnapshot(repoPath, path, kind),
  );
  const prevRepoPathRef = useRef(repoPath);

  useEffect(() => {
    if (prevRepoPathRef.current !== repoPath) {
      clearWorkdirPreviewCache();
      prevRepoPathRef.current = repoPath;
    }
  }, [repoPath]);

  useLayoutEffect(() => {
    if (!path || !repoPath || !shouldLoad(kind)) {
      setPreview(emptyState);
      return;
    }

    const applySnapshot = () => {
      setPreview((prev) => {
        const next = readPreviewSnapshot(repoPath, path, kind);
        if (
          prev.loading === next.loading &&
          prev.previewUrl === next.previewUrl &&
          prev.textPreview === next.textPreview &&
          prev.failed === next.failed
        ) {
          return prev;
        }
        return next;
      });
    };

    applySnapshot();
    const unsubscribe = subscribeWorkdirPreview(applySnapshot);

    if (!getWorkdirPreviewCached(repoPath, path) && sidebarMode === "project") {
      let cancelled = false;
      const startLoad = () => {
        if (!cancelled) {
          void loadWorkdirPreview(repoPath, path, failOnPlaceholder(kind));
        }
      };
      let idleId: number | undefined;
      let timeoutId: number | undefined;
      if (typeof requestIdleCallback !== "undefined") {
        idleId = requestIdleCallback(startLoad, { timeout: 2500 });
      } else {
        timeoutId = window.setTimeout(startLoad, 50);
      }
      return () => {
        cancelled = true;
        if (idleId !== undefined && typeof cancelIdleCallback !== "undefined") {
          cancelIdleCallback(idleId);
        }
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
        unsubscribe();
      };
    }

    return unsubscribe;
  }, [path, kind, repoPath, sidebarMode]);

  return preview;
}
