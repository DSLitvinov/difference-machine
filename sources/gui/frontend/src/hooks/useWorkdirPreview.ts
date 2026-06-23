import { useEffect, useState } from "react";

import type { InfoPreviewKind } from "@/lib/fileKinds";
import { base64ToObjectUrl, fetchWorkdirThumbnail } from "@/wails/forester";

export interface WorkdirPreviewState {
  loading: boolean;
  previewUrl: string | null;
  textPreview: string | null;
  failed: boolean;
}

const initialState: WorkdirPreviewState = {
  loading: false,
  previewUrl: null,
  textPreview: null,
  failed: false,
};

export function useWorkdirPreview(path: string | null, kind: InfoPreviewKind | "image"): WorkdirPreviewState {
  const [state, setState] = useState<WorkdirPreviewState>(initialState);

  useEffect(() => {
    if (!path) {
      setState(initialState);
      return;
    }

    if (kind !== "image" && kind !== "text" && kind !== "blend") {
      setState({ ...initialState, loading: false });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setState({ ...initialState, loading: true });
      try {
        const result = await fetchWorkdirThumbnail(path);
        if (cancelled) return;

        if (result.kind === "image" && result.content_base64) {
          objectUrl = base64ToObjectUrl(result.content_base64, result.mime);
          setState({
            loading: false,
            previewUrl: objectUrl,
            textPreview: null,
            failed: false,
          });
          return;
        }

        if (result.kind === "text" && result.text_preview) {
          setState({
            loading: false,
            previewUrl: null,
            textPreview: result.text_preview,
            failed: false,
          });
          return;
        }

        setState({ ...initialState, loading: false, failed: kind === "image" || kind === "blend" });
      } catch {
        if (!cancelled) {
          setState({ ...initialState, loading: false, failed: true });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path, kind]);

  return state;
}
