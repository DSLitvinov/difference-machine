import type { ReactNode } from "react";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import { relativeTime } from "@/lib/relative-time";

type CommitProjectCardProps = {
  locale: Locale;
  title: string;
  author: string;
  description?: string;
  timestamp: number;
  head?: boolean;
  merge?: boolean;
  tag?: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
  more?: ReactNode;
};

export function CommitProjectCard({
  locale,
  title,
  author,
  description,
  timestamp,
  head,
  merge,
  tag,
  filesChanged,
  insertions,
  deletions,
  more,
}: CommitProjectCardProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-center gap-1">
          {merge ? <FigmaIcon src="icons/git-merge.svg" size={16} /> : null}
          {head ? (
            <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-background-primary px-3 text-[12px] font-semibold leading-4 text-foreground-primary">
              {copy.head}
            </span>
          ) : null}
          <p className="min-w-0 flex-1 text-[14px] font-semibold leading-5 text-foreground">{title}</p>
          {more ?? (
            <button type="button" className="size-4 shrink-0" aria-label={copy.more} onClick={(event) => event.stopPropagation()}>
              <FigmaIcon src="icons/ellipsis-vertical.svg" size={16} />
            </button>
          )}
        </div>
        <p className="w-full text-[12px] leading-4 text-foreground">{author}</p>
      </div>
      {description ? (
        <p className="line-clamp-2 h-8 overflow-hidden text-ellipsis text-[12px] leading-4 text-foreground-muted">{description}</p>
      ) : null}
      {filesChanged != null ? (
        <p className="flex gap-1 text-[12px] leading-4">
          <span className="text-foreground-muted">{copy.filesChangedCount(filesChanged)}</span>
          {insertions != null ? <span className="text-[#047857]">+ {insertions}</span> : null}
          {deletions != null ? <span className="text-[#ef4444]">- {deletions}</span> : null}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="inline-flex h-[22px] items-center rounded-full bg-background-muted px-3 text-[12px] font-semibold leading-4 text-foreground-secondary">
          {relativeTime(timestamp, locale)}
        </span>
        {tag ? (
          <span className="inline-flex h-[22px] items-center rounded-full border border-border px-3 text-[12px] font-semibold leading-4 text-foreground">
            {tag}
          </span>
        ) : null}
      </div>
    </div>
  );
}
