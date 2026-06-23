import type { InfoPreviewKind } from "@/lib/fileKinds";
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

const MAX_CACHE_ENTRIES = 128;

type CacheRecord = WorkdirPreviewState & {
  previewUrlOwned: boolean;
};

const cache = new Map<string, CacheRecord>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();

export function previewCacheKey(repoPath: string | null, filePath: string): string {
  return `${repoPath ?? "@"}|${filePath}`;
}

function touchCacheKey(key: string, record: CacheRecord): void {
  cache.delete(key);
  cache.set(key, record);
}

function evictIfNeeded(): void {
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    const record = cache.get(oldest);
    if (record?.previewUrlOwned && record.previewUrl) {
      URL.revokeObjectURL(record.previewUrl);
    }
    cache.delete(oldest);
    listeners.delete(oldest);
    inflight.delete(oldest);
  }
}

function notify(key: string): void {
  listeners.get(key)?.forEach((listener) => listener());
}

export function getCachedPreview(key: string): WorkdirPreviewState {
  return cache.get(key) ?? emptyState;
}

export function subscribePreview(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set?.size === 0) {
      listeners.delete(key);
    }
  };
}

export function invalidatePreview(key: string): void {
  const record = cache.get(key);
  if (record?.previewUrlOwned && record.previewUrl) {
    URL.revokeObjectURL(record.previewUrl);
  }
  cache.delete(key);
  inflight.delete(key);
  notify(key);
}

function shouldLoad(kind: InfoPreviewKind | "image"): boolean {
  return kind === "image" || kind === "text" || kind === "blend";
}

export async function ensurePreviewLoaded(
  key: string,
  filePath: string,
  kind: InfoPreviewKind | "image",
): Promise<void> {
  if (!shouldLoad(kind)) {
    cache.set(key, { ...emptyState, previewUrlOwned: false });
    notify(key);
    return;
  }

  const existing = cache.get(key);
  if (existing && !existing.loading && !existing.failed) {
    touchCacheKey(key, existing);
    return;
  }

  const pending = inflight.get(key);
  if (pending) {
    await pending;
    return;
  }

  cache.set(key, { ...emptyState, loading: true, previewUrlOwned: false });
  notify(key);

  const loadPromise = (async () => {
    try {
      const result = await fetchWorkdirThumbnail(filePath);

      if (result.kind === "image" && result.content_base64) {
        const previewUrl = base64ToObjectUrl(result.content_base64, result.mime);
        const record: CacheRecord = {
          loading: false,
          previewUrl,
          textPreview: null,
          failed: false,
          previewUrlOwned: true,
        };
        cache.set(key, record);
        touchCacheKey(key, record);
        evictIfNeeded();
        return;
      }

      if (result.kind === "text" && result.text_preview) {
        const record: CacheRecord = {
          loading: false,
          previewUrl: null,
          textPreview: result.text_preview,
          failed: false,
          previewUrlOwned: false,
        };
        cache.set(key, record);
        touchCacheKey(key, record);
        evictIfNeeded();
        return;
      }

      cache.set(key, {
        ...emptyState,
        failed: kind === "image" || kind === "blend",
        previewUrlOwned: false,
      });
      touchCacheKey(key, cache.get(key)!);
      evictIfNeeded();
    } catch {
      cache.set(key, { ...emptyState, failed: true, previewUrlOwned: false });
      touchCacheKey(key, cache.get(key)!);
    } finally {
      inflight.delete(key);
      notify(key);
    }
  })();

  inflight.set(key, loadPromise);
  await loadPromise;
}
