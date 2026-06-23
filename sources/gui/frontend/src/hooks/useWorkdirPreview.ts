import { useEffect, useRef, useState } from "react";

import type { InfoPreviewKind } from "@/lib/fileKinds";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { base64ToObjectUrl, fetchWorkdirThumbnail } from "@/wails/forester";

export interface WorkdirPreviewState {
  loading: boolean;
  previewUrl: string | null;
  textPreview: string | null;
  failed: boolean;
}

const emptyState: WorkdirPreviewState = {
  loading: false,
  previewUrl: null,
  textPreview: null,
  failed: false,
};

function shouldLoad(kind: InfoPreviewKind | "image"): boolean {
  return kind === "image" || kind === "text" || kind === "blend";
}

export function useWorkdirPreview(path: string | null, kind: InfoPreviewKind | "image"): WorkdirPreviewState {
  const repoPath = useAppStore((s) => s.repoPath);
  const previewGeneration = useProjectStore((s) => s.previewGeneration);
  const [preview, setPreview] = useState<WorkdirPreviewState>(emptyState);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!path || !repoPath || !shouldLoad(kind)) {
      setPreview(emptyState);
      return;
    }

    let cancelled = false;
    setPreview({ ...emptyState, loading: true });

    void (async () => {
      try {
        const result = await fetchWorkdirThumbnail(path);
        if (cancelled) return;

        if (result.kind === "image" && result.content_base64) {
          const previewUrl = base64ToObjectUrl(result.content_base64, result.mime);
          previewUrlRef.current = previewUrl;
          setPreview({
            loading: false,
            previewUrl,
            textPreview: null,
            failed: false,
          });
          return;
        }

        if (result.kind === "text" && result.text_preview) {
          setPreview({
            loading: false,
            previewUrl: null,
            textPreview: result.text_preview,
            failed: false,
          });
          return;
        }

        setPreview({
          loading: false,
          previewUrl: null,
          textPreview: null,
          failed: kind === "image" || kind === "blend",
        });
      } catch {
        if (!cancelled) {
          setPreview({ ...emptyState, failed: true });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [path, kind, repoPath, previewGeneration]);

  return preview;
}
