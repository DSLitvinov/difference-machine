import { useMemo, useRef, useEffect } from "react";

import { parseUnifiedDiff, toSplitColumns } from "@/lib/parseUnifiedDiff";
import type { HistoryTextLayout } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface TextDiffPanelProps {
  content: string;
  layout: HistoryTextLayout;
  loading: boolean;
  error: string | null;
}

function diffLineClass(line: string, kind: "unified" | "left" | "right"): string {
  if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
    return "text-muted-foreground";
  }
  if (kind === "unified") {
    if (line.startsWith("+")) return "bg-emerald-50 text-emerald-900";
    if (line.startsWith("-")) return "bg-red-50 text-red-900";
    return "";
  }
  if (kind === "left" && line !== "") return "bg-red-50 text-red-900";
  if (kind === "right" && line !== "") return "bg-emerald-50 text-emerald-900";
  return "";
}

function DiffColumn({
  lines,
  kind,
  scrollRef,
  onScroll,
}: {
  lines: string[];
  kind: "unified" | "left" | "right";
  scrollRef?: React.RefObject<HTMLDivElement>;
  onScroll?: () => void;
}) {
  return (
    <div
      ref={scrollRef}
      className="h-full overflow-auto bg-background p-3 font-mono text-xs"
      onScroll={onScroll}
    >
      {lines.map((line, index) => (
        <div
          key={`${index}-${line.slice(0, 12)}`}
          className={cn("whitespace-pre-wrap px-1", diffLineClass(line, kind))}
        >
          {line || " "}
        </div>
      ))}
    </div>
  );
}

export function TextDiffPanel({ content, layout, loading, error }: TextDiffPanelProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const split = useMemo(() => {
    if (layout !== "split" || !content) return null;
    return toSplitColumns(parseUnifiedDiff(content));
  }, [content, layout]);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const syncFromLeft = () => {
      if (syncing.current) return;
      syncing.current = true;
      right.scrollTop = left.scrollTop;
      syncing.current = false;
    };
    const syncFromRight = () => {
      if (syncing.current) return;
      syncing.current = true;
      left.scrollTop = right.scrollTop;
      syncing.current = false;
    };

    left.addEventListener("scroll", syncFromLeft);
    right.addEventListener("scroll", syncFromRight);
    return () => {
      left.removeEventListener("scroll", syncFromLeft);
      right.removeEventListener("scroll", syncFromRight);
    };
  }, [layout, content]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading diff…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (layout === "split" && split) {
    return (
      <div className="grid h-full min-h-0 grid-cols-2">
        <div className="min-h-0 border-r border-border">
          <p className="border-b border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            Parent
          </p>
          <DiffColumn lines={split.left} kind="left" scrollRef={leftRef} />
        </div>
        <div className="min-h-0">
          <p className="border-b border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            Commit
          </p>
          <DiffColumn lines={split.right} kind="right" scrollRef={rightRef} />
        </div>
      </div>
    );
  }

  const lines = content.split("\n");
  return <DiffColumn lines={lines} kind="unified" />;
}
