import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { relativeTime } from "@/lib/relative-time";
import ellipsisVertical from "@/assets/icons/ellipsis-vertical.svg";

type StageCardProps = {
  title: string;
  author: string;
  description?: string;
  timestamp: number;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
};

export function StageCard({ title, author, description, timestamp, filesChanged, insertions, deletions }: StageCardProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-center gap-1">
          <p className="min-w-0 flex-1 text-[14px] font-semibold leading-5 text-foreground">{title}</p>
          <button type="button" className="size-4 shrink-0" aria-label="More" onClick={(event) => event.stopPropagation()}>
            <FigmaIcon src={ellipsisVertical} size={16} />
          </button>
        </div>
        <p className="w-full text-[12px] leading-4 text-foreground">{author}</p>
      </div>
      {description ? (
        <p className="line-clamp-2 h-8 overflow-hidden text-ellipsis text-[12px] leading-4 text-foreground-muted">{description}</p>
      ) : null}
      {filesChanged != null ? (
        <p className="flex gap-1 text-[12px] leading-4">
          <span className="text-foreground-muted">{filesChanged} files changed</span>
          {insertions != null ? <span className="text-[#047857]">+ {insertions}</span> : null}
          {deletions != null ? <span className="text-[#ef4444]">- {deletions}</span> : null}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="inline-flex h-[22px] items-center rounded-full bg-background-muted px-3 text-[12px] font-semibold leading-4 text-foreground-secondary">
          {relativeTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
