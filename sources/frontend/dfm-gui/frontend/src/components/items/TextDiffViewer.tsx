import { DiffTextUnifiedRow } from "@/components/atoms/DiffTextUnifiedRow";
import { DiffTextSplitRow } from "@/components/atoms/DiffTextSplitRow";
import { Button } from "@/components/ui/button";
import { parseUnified } from "@/lib/unified-diff";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useState } from "react";

type TextDiffViewerProps = {
  locale: Locale;
  unified: string;
  noCommits?: boolean;
  busy?: boolean;
  onCompare?: () => void;
  onRevert?: () => void;
};

type Tab = "unified" | "split";

function DiffTabs({
  value,
  onChange,
  labels,
  disabled,
}: {
  value: Tab;
  onChange: (tab: Tab) => void;
  labels: { unified: string; split: string };
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center rounded-md bg-background-muted p-1">
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "rounded-sm px-3 py-1.5 text-[14px] font-medium leading-5",
          disabled ? "text-foreground-disabled" : value === "unified" ? "bg-background text-foreground shadow-sm" : "text-foreground-muted",
        )}
        onClick={() => onChange("unified")}
      >
        {labels.unified}
      </button>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "rounded-sm px-3 py-1.5 text-[14px] font-medium leading-5",
          disabled ? "text-foreground-disabled" : value === "split" ? "bg-background text-foreground shadow-sm" : "text-foreground-muted",
        )}
        onClick={() => onChange("split")}
      >
        {labels.split}
      </button>
    </div>
  );
}

function noCommitLines(unified: string): { line: number; text: string }[] {
  return parseUnified(unified)
    .filter((row) => row.type !== "deleted")
    .map((row, index) => ({ line: index + 1, text: row.text }));
}

export function TextDiffViewer({ locale, unified, noCommits, busy, onCompare, onRevert }: TextDiffViewerProps) {
  const copy = t(locale);
  const [tab, setTab] = useState<Tab>("unified");
  const rows = parseUnified(unified);
  const plain = noCommitLines(unified);
  const showActions = Boolean(onCompare && onRevert);
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className={cn("flex w-full items-center justify-end p-2", showActions && "gap-3")}>
        <DiffTabs value={tab} onChange={setTab} labels={{ unified: copy.tabUnified, split: copy.tabSplit }} disabled={noCommits} />
        {showActions ? (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onCompare}>
              {copy.compare}
            </Button>
            <Button type="button" disabled={busy} onClick={onRevert}>
              {copy.revert}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {noCommits
          ? plain.map((row) => <DiffTextSplitRow key={row.line} type="default" line={row.line} text={row.text} />)
          : tab === "unified"
            ? rows.map((row, index) => (
                <DiffTextUnifiedRow key={index} type={row.type} oldNo={row.oldNo} newNo={row.newNo} text={row.text} />
              ))
            : rows.map((row, index) => (
                <div key={index} className="flex w-full">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    {row.type === "added" ? <div className="h-6" /> : <DiffTextSplitRow type={row.type} line={row.oldNo ?? 0} text={row.text} />}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    {row.type === "deleted" ? <div className="h-6" /> : <DiffTextSplitRow type={row.type === "added" ? "added" : "default"} line={row.newNo ?? 0} text={row.text} />}
                  </div>
                </div>
              ))}
      </div>
    </div>
  );
}
