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
        // #region agent log
        if (prev.previewUrl && !next.previewUrl) {
          fetch("http://127.0.0.1:7622/ingest/6a6025bf-706d-42c5-983c-cc603dda0e71", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b5b4c3" },
            body: JSON.stringify({
              sessionId: "b5b4c3",
              runId: "post-fix",
              hypothesisId: "D",
              location: "useWorkdirPreview.ts:applySnapshot",
              message: "previewUrl cleared (flicker)",
              data: {
                path,
                nextLoading: next.loading,
                nextFailed: next.failed,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
        // #endregion
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

    const initial = readPreviewSnapshot(repoPath, path, kind);
    // #region agent log
    fetch("http://127.0.0.1:7622/ingest/6a6025bf-706d-42c5-983c-cc603dda0e71", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b5b4c3" },
      body: JSON.stringify({
        sessionId: "b5b4c3",
        runId: "post-fix",
        hypothesisId: "B",
        location: "useWorkdirPreview.ts:layoutEffect",
        message: "mount/remount snapshot",
        data: {
          path,
          hasUrl: Boolean(initial.previewUrl),
          loading: initial.loading,
          failed: initial.failed,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    applySnapshot();
    const unsubscribe = subscribeWorkdirPreview(applySnapshot);

    if (!getWorkdirPreviewCached(repoPath, path)) {
      void loadWorkdirPreview(repoPath, path, failOnPlaceholder(kind));
    }

    return unsubscribe;
  }, [path, kind, repoPath]);

  return preview;
}
