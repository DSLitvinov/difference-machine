import { fetchDiffStat, type CommitLogEntry } from "@/wails/forester";

export interface CommitStat {
  files_changed: number;
  insertions: number;
  deletions: number;
}

const cache = new Map<string, CommitStat>();
const inflight = new Map<string, Promise<CommitStat>>();

const MAX_CONCURRENT = 1;
let activeRequests = 0;
const waitQueue: Array<() => void> = [];

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

export function clearCommitStatsCache(): void {
  cache.clear();
  inflight.clear();
  waitQueue.length = 0;
  activeRequests = 0;
}

export async function loadCommitStat(commit: CommitLogEntry): Promise<CommitStat> {
  const cached = cache.get(commit.hash);
  if (cached) return cached;

  const pending = inflight.get(commit.hash);
  if (pending) return pending;

  const promise = runWithConcurrencyLimit(async () => {
    const result = await fetchDiffStat(commit.hash, commit);
    const stat: CommitStat = {
      files_changed: result.files_changed ?? 0,
      insertions: result.insertions ?? 0,
      deletions: result.deletions ?? 0,
    };
    cache.set(commit.hash, stat);
    return stat;
  }).catch((err) => {
    inflight.delete(commit.hash);
    throw err;
  });

  inflight.set(commit.hash, promise);
  void promise.finally(() => {
    if (inflight.get(commit.hash) === promise) {
      inflight.delete(commit.hash);
    }
  });
  return promise;
}
