import { useMemo, useRef, useEffect } from "react";

import {
  buildSplitDisplayRows,
  buildUnifiedDisplayRows,
  type SplitDisplayRow,
  type UnifiedDisplayRow,
} from "@/lib/parseUnifiedDiff";
import type { TextSegment } from "@/lib/intralineDiff";
import type { HistoryTextLayout } from "@/lib/storage";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface TextDiffPanelProps {
  content: string;
  layout: HistoryTextLayout;
  loading: boolean;
  error: string | null;
}

function lineBgClass(kind: "context" | "add" | "del" | "empty"): string {
  if (kind === "add") return "bg-emerald-500/15 dark:bg-emerald-950/50";
  if (kind === "del") return "bg-red-500/15 dark:bg-red-950/50";
  return "";
}

function highlightClass(kind: "add" | "del"): string {
  if (kind === "add") return "bg-emerald-500/45 dark:bg-emerald-600/55";
  return "bg-red-500/45 dark:bg-red-600/55";
}

function SegmentText({
  segments,
  highlightKind,
}: {
  segments: TextSegment[];
  highlightKind?: "add" | "del";
}) {
  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={index}
          className={cn(segment.highlight && highlightKind ? highlightClass(highlightKind) : undefined)}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}

function LineNumberCell({ value }: { value: number | null }) {
  return (
    <span className="inline-block w-9 shrink-0 select-none pr-2 text-right tabular-nums text-muted-foreground">
      {value != null && value > 0 ? value : ""}
    </span>
  );
}

function UnifiedDiffRow({ row }: { row: UnifiedDisplayRow }) {
  if (row.type === "hunk") {
    return (
      <div className="bg-muted/40 px-3 py-0.5 font-mono text-xs text-muted-foreground">{row.header}</div>
    );
  }

  const bg = lineBgClass(row.kind);

  return (
    <div className={cn("flex min-w-0 font-mono text-xs leading-5", bg)}>
      <div className={cn("sticky left-0 z-[1] flex shrink-0 border-r border-border/60 px-2", bg)}>
        <LineNumberCell value={row.oldLine} />
        <LineNumberCell value={row.newLine} />
      </div>
      <div className="min-w-0 flex-1 whitespace-pre px-2 py-px">
        <span className="select-none text-muted-foreground">{row.prefix}</span>
        <SegmentText
          segments={row.segments}
          highlightKind={row.kind === "context" ? undefined : row.kind}
        />
      </div>
    </div>
  );
}

function SplitRowSide({
  lineNum,
  kind,
  segments,
  highlightKind,
  align,
}: {
  lineNum: number | null;
  kind: "context" | "add" | "del" | "empty";
  segments: TextSegment[];
  highlightKind?: "add" | "del";
  align: "left" | "right";
}) {
  const bg = lineBgClass(kind);

  return (
    <div className={cn("flex min-w-0 flex-1 font-mono text-xs leading-5", bg)}>
      <div
        className={cn(
          "sticky z-[1] shrink-0 border-border/60 px-2",
          bg,
          align === "left" ? "left-0 border-r" : "right-0 border-l",
        )}
      >
        <LineNumberCell value={lineNum} />
      </div>
      <div className="min-w-0 flex-1 whitespace-pre px-2 py-px">
        {kind === "empty" ? (
          " "
        ) : (
          <SegmentText segments={segments} highlightKind={highlightKind} />
        )}
      </div>
    </div>
  );
}


export function TextDiffPanel({ content, layout, loading, error }: TextDiffPanelProps) {
  const t = useT();
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const unifiedRows = useMemo(() => buildUnifiedDisplayRows(content), [content]);
  const splitRows = useMemo(() => buildSplitDisplayRows(content), [content]);

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
        {t("preview.loadingDiff")}
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
  if (!content.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("preview.noContentChanges")}
      </div>
    );
  }

  if (layout === "split") {
    return (
      <div className="grid h-full min-h-0 grid-cols-2">
        <div className="flex min-h-0 flex-col border-r border-border">
          <p className="shrink-0 border-b border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            {t("preview.parent")}
          </p>
          <div ref={leftRef} className="min-h-0 flex-1 overflow-auto bg-background">
            <div className="grid grid-cols-1">
              {splitRows.map((row, index) => {
                if (row.type === "hunk") {
                  return (
                    <div
                      key={`hunk-${index}`}
                      className="bg-muted/40 px-3 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {row.header}
                    </div>
                  );
                }
                if (row.type === "context") {
                  return (
                    <SplitRowSide
                      key={`ctx-${index}`}
                      lineNum={row.oldLine}
                      kind="context"
                      segments={row.segments}
                      align="left"
                    />
                  );
                }
                if (row.type === "modified") {
                  return (
                    <SplitRowSide
                      key={`mod-${index}`}
                      lineNum={row.oldLine}
                      kind="del"
                      segments={row.oldSegments}
                      highlightKind="del"
                      align="left"
                    />
                  );
                }
                if (row.type === "deleted") {
                  return (
                    <SplitRowSide
                      key={`del-${index}`}
                      lineNum={row.oldLine}
                      kind="del"
                      segments={row.segments}
                      highlightKind="del"
                      align="left"
                    />
                  );
                }
                return (
                  <SplitRowSide lineNum={null} kind="empty" segments={[]} align="left" key={`add-pad-${index}`} />
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <p className="shrink-0 border-b border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            {t("common.commit")}
          </p>
          <div ref={rightRef} className="min-h-0 flex-1 overflow-auto bg-background">
            <div className="grid grid-cols-1">
              {splitRows.map((row, index) => {
                if (row.type === "hunk") {
                  return (
                    <div
                      key={`hunk-r-${index}`}
                      className="bg-muted/40 px-3 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {row.header}
                    </div>
                  );
                }
                if (row.type === "context") {
                  return (
                    <SplitRowSide
                      key={`ctx-r-${index}`}
                      lineNum={row.newLine}
                      kind="context"
                      segments={row.segments}
                      align="right"
                    />
                  );
                }
                if (row.type === "modified") {
                  return (
                    <SplitRowSide
                      key={`mod-r-${index}`}
                      lineNum={row.newLine}
                      kind="add"
                      segments={row.newSegments}
                      highlightKind="add"
                      align="right"
                    />
                  );
                }
                if (row.type === "added") {
                  return (
                    <SplitRowSide
                      key={`add-${index}`}
                      lineNum={row.newLine}
                      kind="add"
                      segments={row.segments}
                      highlightKind="add"
                      align="right"
                    />
                  );
                }
                return (
                  <SplitRowSide lineNum={null} kind="empty" segments={[]} align="right" key={`del-pad-${index}`} />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      {unifiedRows.map((row, index) => (
        <UnifiedDiffRow key={`unified-${index}`} row={row} />
      ))}
    </div>
  );
}
