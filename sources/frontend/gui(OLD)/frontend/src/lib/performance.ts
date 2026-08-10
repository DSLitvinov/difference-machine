const PERFORMANCE_DEBUG_KEY = "dfm.debug.performance";

export function isPerformanceDebugEnabled(): boolean {
  try {
    return localStorage.getItem(PERFORMANCE_DEBUG_KEY) === "true";
  } catch {
    return false;
  }
}

export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isPerformanceDebugEnabled()) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = Math.round(performance.now() - start);
    console.info(`[dfm:perf] ${label}: ${duration}ms`);
  }
}

