import { Flag, Merge } from "lucide-react";
import type { ReactNode } from "react";
import { IconBadge } from "@/components/atoms/CommitProjectCard";
import { t, type Locale } from "@/lib/i18n";
import { relativeTime } from "@/lib/relative-time";

type CommitFileCardProps = {
  locale: Locale;
  title: string;
  author: string;
  description?: string;
  timestamp: number;
  head?: boolean;
  merge?: boolean;
  tag?: string;
  insertions?: number;
  deletions?: number;
  more?: ReactNode;
};

export function CommitFileCard({
  locale,
  title,
  author,
  description,
  timestamp,
  head,
  merge,
  tag,
  insertions,
  deletions,
  more,
}: CommitFileCardProps) {
  const copy = t(locale);
  const hasStats = insertions != null || deletions != null;
  return (
    <div className="flex w-full flex-col gap-0.5">
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-center gap-1">
          {merge ? <IconBadge icon={Merge} label={copy.merge} /> : null}
          {head ? <IconBadge icon={Flag} label={copy.head} /> : null}
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-[#18181b] dark:text-foreground">{title}</p>
          {more}
        </div>
        <p className="w-full truncate text-[12px] leading-4 text-[#18181b] dark:text-foreground">{author}</p>
      </div>
      {description ? (
        <p className="line-clamp-2 h-8 overflow-hidden text-ellipsis text-[12px] leading-4 text-[#71717a] dark:text-foreground-muted">{description}</p>
      ) : null}
      {hasStats ? (
        <p className="flex gap-1 whitespace-nowrap text-[12px] leading-4">
          {insertions != null ? <span className="text-[#166534] dark:text-[#4ade80]">+ {insertions}</span> : null}
          {deletions != null ? <span className="text-[#dc2626]">- {deletions}</span> : null}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="truncate text-[12px] leading-4 text-[#18181b] dark:text-foreground">{relativeTime(timestamp, locale)}</span>
        {tag ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#e4e4e7] px-2 py-0.5 text-[12px] font-semibold leading-4 text-[#18181b] dark:bg-background-muted dark:text-foreground">
            {tag}
          </span>
        ) : null}
      </div>
    </div>
  );
}
