import { useEffect, useRef, useState } from "react";

import { loadCommitStat, type CommitStat } from "@/lib/commitStatsCache";
import type { CommitLogEntry } from "@/wails/forester";

type StatState = "idle" | "loading" | "loaded" | "error";

export function useCommitCardStat(commit: CommitLogEntry, enabled: boolean) {
  const [state, setState] = useState<StatState>("idle");
  const [stat, setStat] = useState<CommitStat | null>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    setState("idle");
    setStat(null);
    startedRef.current = false;
  }, [commit.hash]);

  useEffect(() => {
    if (!enabled) return;
    if (!element) return;

    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (startedRef.current) return;
        startedRef.current = true;
        observer.disconnect();

        const startLoad = () => {
          if (cancelled) return;
          setState("loading");
          void loadCommitStat(commit)
            .then((loaded) => {
              if (cancelled) return;
              setStat(loaded);
              setState("loaded");
            })
            .catch(() => {
              if (cancelled) return;
              setState("error");
            });
        };

        if (typeof requestIdleCallback !== "undefined") {
          idleId = requestIdleCallback(startLoad, { timeout: 2000 });
        } else {
          timeoutId = window.setTimeout(startLoad, 50);
        }
      },
      { rootMargin: "0px" },
    );

    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      if (idleId !== undefined && typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [commit, element, enabled]);

  return { setElement, state, stat };
}
