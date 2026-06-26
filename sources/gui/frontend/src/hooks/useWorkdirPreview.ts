import { useEffect, useRef, useState } from "react";

import type { InfoPreviewKind } from "@/lib/fileKinds";
import {
  clearWorkdirPreviewCache,
  getWorkdirPreviewCached,
  loadWorkdirPreview,
  type WorkdirPreviewState,
} from "@/lib/workdirPreviewCache";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";

export type { WorkdirPreviewState };

const emptyState: WorkdirPreviewState = {
  loading: false,
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

export function useWorkdirPreview(path: string | null, kind: InfoPreviewKind | "image"): WorkdirPreviewState {
  const repoPath = useAppStore((s) => s.repoPath);
  const previewGeneration = useProjectStore((s) => s.previewGeneration);
  const [preview, setPreview] = useState<WorkdirPreviewState>(emptyState);
  const prevRepoPathRef = useRef(repoPath);

  useEffect(() => {
    if (prevRepoPathRef.current !== repoPath) {
      clearWorkdirPreviewCache();
      prevRepoPathRef.current = repoPath;
    }
  }, [repoPath]);

  useEffect(() => {
    if (!path || !repoPath || !shouldLoad(kind)) {
      setPreview(emptyState);
      return;
    }

    const cached = getWorkdirPreviewCached(repoPath, path, previewGeneration);
    if (cached) {
      setPreview(cached);
      return;
    }

    let cancelled = false;
    setPreview({ ...emptyState, loading: true });

    void loadWorkdirPreview(repoPath, path, previewGeneration, failOnPlaceholder(kind)).then((result) => {
      if (!cancelled) {
        setPreview(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path, kind, repoPath, previewGeneration]);

  return preview;
}
