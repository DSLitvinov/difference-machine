import { useMemo } from "react";
import { DiffTextSplitRow } from "@/components/atoms/DiffTextSplitRow";
import { highlightLines } from "@/lib/syntax";

type ContentViewTextProps = {
  text: string;
  fileName: string;
};

export function ContentViewText({ text, fileName }: ContentViewTextProps) {
  const lines = useMemo(() => highlightLines(text, fileName), [text, fileName]);
  return (
    <div className="syntax-hl flex min-h-0 w-full flex-1 flex-col overflow-auto">
      {lines.map((spans, index) => (
        <DiffTextSplitRow key={index} line={index + 1}>
          {spans.map((span, spanIndex) =>
            span.className ? (
              <span key={spanIndex} className={span.className}>
                {span.text}
              </span>
            ) : (
              <span key={spanIndex}>{span.text}</span>
            ),
          )}
        </DiffTextSplitRow>
      ))}
    </div>
  );
}
