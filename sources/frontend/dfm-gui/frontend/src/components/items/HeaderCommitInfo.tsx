import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import gitMerge from "@/assets/icons/git-merge.svg";
import copyIcon from "@/assets/icons/copy.svg";
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
          {merge ? <FigmaIcon src={gitMerge} size={16} /> : null}
          {head ? (
            <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-background-primary px-3 text-[12px] font-semibold leading-4 text-foreground-primary">
              {copy.head}
            </span>
          ) : null}
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-foreground">{title}</p>
        </div>
        <p className="text-[12px] leading-4 text-foreground">{author}</p>
        <div className="flex w-full items-center gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[12px] leading-4 text-foreground">{shortHash}</p>
            <button
              type="button"
              className="size-4 shrink-0"
              aria-label={copy.copy}
              onClick={() => void navigator.clipboard.writeText(hash)}
            >
              <FigmaIcon src={copyIcon} size={16} />
            </button>
          </div>
          {stat ? (
            <p className="flex min-w-0 flex-1 items-center justify-end gap-1 text-[12px] leading-4">
              <span className="text-foreground">
                {copy.filesChangedLabel} {stat.files_changed}
              </span>
              <span className="text-[#047857]">+ {stat.insertions}</span>
              <span className="text-[#ef4444]">- {stat.deletions}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
