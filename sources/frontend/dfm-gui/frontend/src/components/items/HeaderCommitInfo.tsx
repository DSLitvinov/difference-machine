import { Copy, Flag, Merge } from "lucide-react";
import { IconBadge } from "@/components/atoms/CommitProjectCard";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";

import type { DiffStat } from "@/lib/revision-cache";

type HeaderCommitInfoProps = {
  locale: Locale;
  title: string;
  author: string;
  hash: string;
  head?: boolean;
  merge?: boolean;
  stat?: DiffStat;
};

export function HeaderCommitInfo({ locale, title, author, hash, head, merge, stat }: HeaderCommitInfoProps) {
  const copy = t(locale);
  const shortHash = hash.slice(0, 7);
  return (
    <div className="flex w-full items-center justify-center pb-2 pt-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-2">
        <div className="flex w-full items-center gap-1">
          {merge ? <IconBadge icon={Merge} label={copy.merge} /> : null}
          {head ? <IconBadge icon={Flag} label={copy.head} /> : null}
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-[#18181b] dark:text-foreground">{title}</p>
        </div>
        <p className="text-[12px] leading-4 text-[#18181b] dark:text-foreground">{author}</p>
        <div className="flex w-full items-center gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[12px] leading-4 text-[#18181b] dark:text-foreground">{shortHash}</p>
            <button
              type="button"
              className="size-4 shrink-0"
              aria-label={copy.copy}
              onClick={() => void navigator.clipboard.writeText(hash)}
            >
              <Icon icon={Copy} size={16} />
            </button>
          </div>
          {stat ? (
            <p className="flex min-w-0 flex-1 items-center justify-end gap-1 whitespace-nowrap text-[12px] leading-4">
              <span className="text-[#18181b] dark:text-foreground">
                {copy.filesChangedLabel} {stat.files_changed}
              </span>
              <span className="text-[#166534] dark:text-[#4ade80]">+ {stat.added}</span>
              <span className="text-[#dc2626]">- {stat.deleted}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
