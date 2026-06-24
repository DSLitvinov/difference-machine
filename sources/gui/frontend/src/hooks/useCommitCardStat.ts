import { useEffect, useRef, useState } from "react";

import { loadCommitStat, type CommitStat } from "@/lib/commitStatsCache";
import type { CommitLogEntry } from "@/wails/forester";

type StatState = "idle" | "loading" | "loaded" | "error";

export function useCommitCardStat(commit: CommitLogEntry) {
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
    if (!element) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (startedRef.current) return;
        startedRef.current = true;
        observer.disconnect();

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
      },
      { rootMargin: "120px" },
    );

    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [commit, element]);

  return { setElement, state, stat };
}
