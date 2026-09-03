import { useSyncExternalStore } from "react";
import { foresterCall, readThumbCache, writeThumbCache } from "@/lib/bridge";
import { usesFFmpegThumbCache } from "@/lib/file-kind";

export type ThumbRequest = {
  path: string;
  name: string;
  size: number;
  mtime: number;
};

export type ThumbRecord =
  | { kind: "image"; blobUrl: string }
  | { kind: "text"; text: string }
  | { kind: "placeholder" };

type ThumbApi = {
  kind?: "image" | "text" | "placeholder";
  mime?: string;
  content_base64?: string;
  text_preview?: string;
};

type Job = {
  key: string;
  repoAbs: string;
  file: ThumbRequest;
  priority: number;
  cancelled: boolean;
};

const MAX_INFLIGHT = 2;
const MIN_LRU = 24;

const memory = new Map<string, ThumbRecord>();
const pinnedKeys = new Set<string>();
const hydrating = new Set<string>();
const inflightKeys = new Set<string>();
const pending: Job[] = [];

let epoch = 0;
let lruLimit = 64;
let inflight = 0;
const listeners = new Set<() => void>();

export function thumbKey(repoAbs: string, path: string, size: number, mtime: number): string {
  return `${repoAbs}\0${path}\0${size}\0${mtime}`;
}

function emit() {
  epoch += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getEpoch(): number {
  return epoch;
}

export function useThumbEpoch(): number {
  return useSyncExternalStore(subscribe, getEpoch, getEpoch);
}

export function peekThumb(repoAbs: string, file: ThumbRequest): ThumbRecord | undefined {
  return memory.get(thumbKey(repoAbs, file.path, file.size, file.mtime));
}

export function setThumbLruLimit(visibleCount: number) {
  lruLimit = Math.max(MIN_LRU, visibleCount * 2 + 8);
  evict();
}

export function resetThumbCache() {
  for (const record of memory.values()) {
    if (record.kind === "image") {
      URL.revokeObjectURL(record.blobUrl);
    }
  }
  memory.clear();
  pinnedKeys.clear();
  hydrating.clear();
  pending.forEach((job) => {
    job.cancelled = true;
  });
  pending.length = 0;
  emit();
}

export function requestThumb(repoAbs: string, file: ThumbRequest) {
  pinnedKeys.add(thumbKey(repoAbs, file.path, file.size, file.mtime));
  void hydrate(repoAbs, file, -1);
}

export function releaseThumb(repoAbs: string, file: ThumbRequest) {
  pinnedKeys.delete(thumbKey(repoAbs, file.path, file.size, file.mtime));
}

export function scheduleVisibleThumbs(repoAbs: string, files: ThumbRequest[], centerIndex: number) {
  const wanted = new Set(files.map((file) => thumbKey(repoAbs, file.path, file.size, file.mtime)));
  for (const key of pinnedKeys) {
    wanted.add(key);
  }
  for (const job of pending) {
    if (!wanted.has(job.key)) {
      job.cancelled = true;
    }
  }
  files.forEach((file, index) => {
    const priority = Math.abs(index - centerIndex);
    void hydrate(repoAbs, file, priority);
  });
  pending.sort((a, b) => a.priority - b.priority);
  pump();
}

function touch(key: string, record: ThumbRecord) {
  memory.delete(key);
  memory.set(key, record);
  evict();
  emit();
}

function evict() {
  while (memory.size > lruLimit) {
    let evicted = false;
    for (const key of memory.keys()) {
      if (pinnedKeys.has(key)) {
        continue;
      }
      const record = memory.get(key);
      memory.delete(key);
      if (record?.kind === "image") {
        URL.revokeObjectURL(record.blobUrl);
      }
      evicted = true;
      break;
    }
    if (!evicted) {
      break;
    }
  }
}

function blobUrlFromBase64(b64: string, mime: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime || "image/png" }));
}

function putImage(key: string, b64: string, mime: string) {
  const previous = memory.get(key);
  if (previous?.kind === "image") {
    URL.revokeObjectURL(previous.blobUrl);
  }
  touch(key, { kind: "image", blobUrl: blobUrlFromBase64(b64, mime) });
}

async function hydrate(repoAbs: string, file: ThumbRequest, priority: number) {
  const key = thumbKey(repoAbs, file.path, file.size, file.mtime);
  if (memory.has(key) || inflightKeys.has(key)) {
    return;
  }
  const existing = pending.find((job) => job.key === key && !job.cancelled);
  if (existing) {
    existing.priority = Math.min(existing.priority, priority);
    return;
  }
  if (hydrating.has(key)) {
    return;
  }
  hydrating.add(key);
  try {
    if (usesFFmpegThumbCache(file.name)) {
      const cached = await readThumbCache(file.path, file.size, file.mtime);
      if (cached) {
        putImage(key, cached, "image/png");
        return;
      }
    }
    if (memory.has(key) || inflightKeys.has(key)) {
      return;
    }
    pending.push({ key, repoAbs, file, priority, cancelled: false });
    pump();
  } finally {
    hydrating.delete(key);
  }
}

function pump() {
  while (inflight < MAX_INFLIGHT) {
    const job = nextJob();
    if (!job) {
      return;
    }
    inflight += 1;
    inflightKeys.add(job.key);
    void runJob(job).finally(() => {
      inflight -= 1;
      inflightKeys.delete(job.key);
      pump();
    });
  }
}

function nextJob(): Job | undefined {
  pending.sort((a, b) => a.priority - b.priority);
  while (pending.length > 0) {
    const job = pending.shift();
    if (!job || job.cancelled || memory.has(job.key)) {
      continue;
    }
    return job;
  }
  return undefined;
}

async function runJob(job: Job) {
  try {
    const result = (await foresterCall("workdir.thumbnail", { path: job.file.path })) as ThumbApi;
    if (memory.has(job.key)) {
      return;
    }
    if (result.kind === "image" && result.content_base64) {
      putImage(job.key, result.content_base64, result.mime || "image/png");
      if (usesFFmpegThumbCache(job.file.name)) {
        void writeThumbCache(job.file.path, job.file.size, job.file.mtime, result.content_base64);
      }
      return;
    }
    if (result.kind === "text") {
      touch(job.key, { kind: "text", text: result.text_preview ?? "" });
      return;
    }
    touch(job.key, { kind: "placeholder" });
  } catch {
    touch(job.key, { kind: "placeholder" });
  }
}
