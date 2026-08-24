import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import chevronRight from "@/assets/icons/chevron-right.svg";

type HeaderFileCommitActionProps = {
  locale: Locale;
  fileName: string;
  busy?: boolean;
  onBack: () => void;
  onCompare: () => void;
  onRevert: () => void;
};

export function HeaderFileCommitAction({
  locale,
  fileName,
  busy,
  onBack,
  onCompare,
  onRevert,
}: HeaderFileCommitActionProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center justify-between pb-2 pt-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button type="button" variant="outline" size="icon" aria-label={copy.back} onClick={onBack}>
          <FigmaIcon src={chevronRight} size={16} className="-scale-x-100" />
        </Button>
        <p className="min-w-0 flex-1 truncate text-center text-[14px] font-medium leading-5 text-foreground">{fileName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCompare}>
          {copy.compare}
        </Button>
        <Button type="button" disabled={busy} onClick={onRevert}>
          {copy.revert}
        </Button>
      </div>
    </div>
  );
}
