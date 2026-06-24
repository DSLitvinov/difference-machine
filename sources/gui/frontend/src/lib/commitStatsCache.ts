import { fetchDiffStat, type CommitLogEntry } from "@/wails/forester";

export interface CommitStat {
  files_changed: number;
  insertions: number;
  deletions: number;
}

const cache = new Map<string, CommitStat>();
const inflight = new Map<string, Promise<CommitStat>>();

const MAX_CONCURRENT = 4;
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
}

export async function loadCommitStat(commit: CommitLogEntry): Promise<CommitStat> {
  const cached = cache.get(commit.hash);
  if (cached) return cached;

  const pending = inflight.get(commit.hash);
  if (pending) return pending;

  const promise = runWithConcurrencyLimit(() =>
    fetchDiffStat(commit.hash, commit).then((result) => {
      const stat: CommitStat = {
        files_changed: result.files_changed ?? 0,
        insertions: result.insertions ?? 0,
        deletions: result.deletions ?? 0,
      };
      cache.set(commit.hash, stat);
      inflight.delete(commit.hash);
      return stat;
    }),
  ).catch((err) => {
    inflight.delete(commit.hash);
    throw err;
  });

  inflight.set(commit.hash, promise);
  return promise;
}
