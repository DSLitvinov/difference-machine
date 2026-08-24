import { useSyncExternalStore } from "react";
import { foresterCall } from "@/lib/bridge";

export type DiffStat = {
  files_changed: number;
  insertions: number;
  deletions: number;
};

export type NameStatusFile = {
  status: string;
  path: string;
  old_path?: string;
};

export type DiffTextPayload = {
  content: string;
  isBinary: boolean;
};

type CacheRecord =
  | { kind: "stat"; stat: DiffStat }
  | { kind: "names"; files: NameStatusFile[] }
  | { kind: "text"; payload: DiffTextPayload }
  | { kind: "blob"; blobUrl: string }
  | { kind: "miss" };

type Job = {
  key: string;
  priority: number;
  cancelled: boolean;
  run: () => Promise<void>;
};

const MAX_INFLIGHT = 2;
const LRU_LIMIT = 64;

const memory = new Map<string, CacheRecord>();
const inflightKeys = new Set<string>();
const pending: Job[] = [];

let epoch = 0;
let inflight = 0;
const listeners = new Set<() => void>();

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

export function useRevisionEpoch(): number {
  return useSyncExternalStore(subscribe, getEpoch, getEpoch);
}

function touch(key: string, record: CacheRecord) {
  const previous = memory.get(key);
  if (previous?.kind === "blob") {
    URL.revokeObjectURL(previous.blobUrl);
  }
  memory.delete(key);
  memory.set(key, record);
  while (memory.size > LRU_LIMIT) {
    const oldest = memory.keys().next().value;
    if (!oldest || oldest === key) {
      break;
    }
    const evicted = memory.get(oldest);
    memory.delete(oldest);
    if (evicted?.kind === "blob") {
      URL.revokeObjectURL(evicted.blobUrl);
    }
  }
  emit();
}

function enqueue(key: string, priority: number, run: () => Promise<void>) {
  if (memory.has(key) || inflightKeys.has(key)) {
    return;
  }
  const existing = pending.find((job) => job.key === key && !job.cancelled);
  if (existing) {
    existing.priority = Math.min(existing.priority, priority);
    return;
  }
  pending.push({ key, priority, cancelled: false, run });
  pump();
}

function pump() {
  pending.sort((a, b) => a.priority - b.priority);
  while (inflight < MAX_INFLIGHT) {
    const job = pending.shift();
    if (!job) {
      return;
    }
    if (job.cancelled || memory.has(job.key)) {
      continue;
    }
    inflight += 1;
    inflightKeys.add(job.key);
    void job.run().finally(() => {
      inflight -= 1;
      inflightKeys.delete(job.key);
      pump();
    });
  }
}

function blobUrlFromBase64(b64: string, mime: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime || "application/octet-stream" }));
}

export function resetRevisionCache() {
  for (const record of memory.values()) {
    if (record.kind === "blob") {
      URL.revokeObjectURL(record.blobUrl);
    }
  }
  memory.clear();
  pending.forEach((job) => {
    job.cancelled = true;
  });
  pending.length = 0;
  emit();
}

export function statKey(repoAbs: string, hash: string): string {
  return `${repoAbs}\0stat\0${hash}`;
}

export function namesKey(repoAbs: string, hash: string): string {
  return `${repoAbs}\0names\0${hash}`;
}

export function textKey(repoAbs: string, hash: string, path: string): string {
  return `${repoAbs}\0text\0${hash}\0${path}`;
}

export function blobKey(repoAbs: string, commit: string, path: string): string {
  return `${repoAbs}\0blob\0${commit}\0${path}`;
}

export function peekStat(repoAbs: string, hash: string): DiffStat | undefined {
  const record = memory.get(statKey(repoAbs, hash));
  return record?.kind === "stat" ? record.stat : undefined;
}

export function peekNames(repoAbs: string, hash: string): NameStatusFile[] | undefined {
  const record = memory.get(namesKey(repoAbs, hash));
  return record?.kind === "names" ? record.files : undefined;
}

export function peekText(repoAbs: string, hash: string, path: string): DiffTextPayload | undefined {
  const record = memory.get(textKey(repoAbs, hash, path));
  return record?.kind === "text" ? record.payload : undefined;
}

export function peekBlob(repoAbs: string, commit: string, path: string): string | undefined {
  const record = memory.get(blobKey(repoAbs, commit, path));
  return record?.kind === "blob" ? record.blobUrl : undefined;
}

export function requestStat(repoAbs: string, hash: string, priority = 10) {
  const key = statKey(repoAbs, hash);
  enqueue(key, priority, async () => {
    try {
      const result = (await foresterCall("diff.stat", { to: hash })) as DiffStat;
      touch(key, {
        kind: "stat",
        stat: {
          files_changed: result.files_changed ?? 0,
          insertions: result.insertions ?? 0,
          deletions: result.deletions ?? 0,
        },
      });
    } catch {
      touch(key, { kind: "miss" });
    }
  });
}

export function requestNames(repoAbs: string, hash: string) {
  const key = namesKey(repoAbs, hash);
  enqueue(key, 0, async () => {
    try {
      const result = (await foresterCall("diff.name_status", { to: hash })) as { files?: NameStatusFile[] };
      touch(key, { kind: "names", files: result.files ?? [] });
    } catch {
      touch(key, { kind: "names", files: [] });
    }
  });
}

export function requestText(repoAbs: string, hash: string, path: string) {
  const key = textKey(repoAbs, hash, path);
  enqueue(key, 0, async () => {
    try {
      const result = (await foresterCall("diff.text", { to: hash, path })) as {
        content?: string;
        is_binary?: boolean;
      };
      touch(key, { kind: "text", payload: { content: result.content ?? "", isBinary: Boolean(result.is_binary) } });
    } catch {
      touch(key, { kind: "miss" });
    }
  });
}

export function requestBlob(repoAbs: string, commit: string, path: string) {
  const key = blobKey(repoAbs, commit, path);
  enqueue(key, 0, async () => {
    try {
      const result = (await foresterCall("blob.get", { commit, path })) as { content_base64?: string; mime?: string };
      if (!result.content_base64) {
        touch(key, { kind: "miss" });
        return;
      }
      touch(key, { kind: "blob", blobUrl: blobUrlFromBase64(result.content_base64, result.mime || "application/octet-stream") });
    } catch {
      touch(key, { kind: "miss" });
    }
  });
}
