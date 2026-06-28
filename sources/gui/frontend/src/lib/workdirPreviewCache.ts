import { base64ToObjectUrl, fetchWorkdirThumbnail } from "@/wails/forester";

export interface WorkdirPreviewState {
  loading: boolean;
  previewUrl: string | null;
  textPreview: string | null;
  failed: boolean;
}

const MAX_CACHE_ENTRIES = 128;
const MAX_CONCURRENT = 4;

type CachedPreview = Omit<WorkdirPreviewState, "loading"> & { generation: number };

const cache = new Map<string, CachedPreview>();
const inflight = new Map<string, Promise<CachedPreview>>();

let activeRequests = 0;
const waitQueue: Array<() => void> = [];

type PreviewListener = () => void;
const listeners = new Set<PreviewListener>();

function cacheKey(repoPath: string, path: string): string {
  return `${repoPath}\0${path}`;
}

function inflightKey(repoPath: string, path: string, generation: number): string {
  return `${cacheKey(repoPath, path)}\0${generation}`;
}

function notifyWorkdirPreviewChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeWorkdirPreview(listener: PreviewListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function touch(key: string, entry: CachedPreview): void {
  cache.delete(key);
  cache.set(key, entry);
}

function revokePreviewUrl(url: string | null): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function evictOldest(): void {
  const oldestKey = cache.keys().next().value as string | undefined;
  if (!oldestKey) return;
  const entry = cache.get(oldestKey);
  revokePreviewUrl(entry?.previewUrl ?? null);
  cache.delete(oldestKey);
}

function storeEntry(key: string, entry: CachedPreview): void {
  const existing = cache.get(key);
  if (existing && existing.previewUrl && existing.previewUrl !== entry.previewUrl) {
    revokePreviewUrl(existing.previewUrl);
  }
  touch(key, entry);
  while (cache.size > MAX_CACHE_ENTRIES) {
    evictOldest();
  }
}

function runWithConcurrencyLimit<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeRequests += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeRequests -= 1;
          const next = waitQueue.shift();
          if (next) next();
        });
    };
    if (activeRequests < MAX_CONCURRENT) {
      run();
    } else {
      waitQueue.push(run);
    }
  });
}

function toCachedPreview(
  generation: number,
  result: Awaited<ReturnType<typeof fetchWorkdirThumbnail>>,
  failOnPlaceholder: boolean,
): CachedPreview {
  if (result.kind === "image" && result.content_base64) {
    return {
      generation,
      previewUrl: base64ToObjectUrl(result.content_base64, result.mime),
      textPreview: null,
      failed: false,
    };
  }

  if (result.kind === "text" && result.text_preview) {
    return {
      generation,
      previewUrl: null,
      textPreview: result.text_preview,
      failed: false,
    };
  }

  return {
    generation,
    previewUrl: null,
    textPreview: null,
    failed: failOnPlaceholder,
  };
}

export function clearWorkdirPreviewCache(): void {
  for (const entry of cache.values()) {
    revokePreviewUrl(entry.previewUrl);
  }
  cache.clear();
  inflight.clear();
  notifyWorkdirPreviewChange();
}

export function getWorkdirPreviewCached(
  repoPath: string,
  path: string,
  generation: number,
): WorkdirPreviewState | null {
  const key = cacheKey(repoPath, path);
  const entry = cache.get(key);
  if (!entry || entry.generation !== generation) {
    return null;
  }
  touch(key, entry);
  return {
    loading: false,
    previewUrl: entry.previewUrl,
    textPreview: entry.textPreview,
    failed: entry.failed,
  };
}

export function isWorkdirPreviewLoading(
  repoPath: string,
  path: string,
  generation: number,
): boolean {
  return inflight.has(inflightKey(repoPath, path, generation));
}

export async function loadWorkdirPreview(
  repoPath: string,
  path: string,
  generation: number,
  failOnPlaceholder: boolean,
): Promise<WorkdirPreviewState> {
  const key = cacheKey(repoPath, path);
  const requestKey = inflightKey(repoPath, path, generation);
  const cached = cache.get(key);
  if (cached && cached.generation === generation) {
    touch(key, cached);
    return {
      loading: false,
      previewUrl: cached.previewUrl,
      textPreview: cached.textPreview,
      failed: cached.failed,
    };
  }

  const pending = inflight.get(requestKey);
  if (pending) {
    try {
      const entry = await pending;
      return {
        loading: false,
        previewUrl: entry.previewUrl,
        textPreview: entry.textPreview,
        failed: entry.failed,
      };
    } catch {
      return { loading: false, previewUrl: null, textPreview: null, failed: true };
    }
  }

  const promise = runWithConcurrencyLimit(async () => {
    const result = await fetchWorkdirThumbnail(path);
    return toCachedPreview(generation, result, failOnPlaceholder);
  })
    .then((entry) => {
      storeEntry(key, entry);
      return entry;
    })
    .finally(() => {
      if (inflight.get(requestKey) === promise) {
        inflight.delete(requestKey);
      }
      notifyWorkdirPreviewChange();
    });

  inflight.set(requestKey, promise);
  notifyWorkdirPreviewChange();

  try {
    const entry = await promise;
    return {
      loading: false,
      previewUrl: entry.previewUrl,
      textPreview: entry.textPreview,
      failed: entry.failed,
    };
  } catch {
    return { loading: false, previewUrl: null, textPreview: null, failed: true };
  }
}
