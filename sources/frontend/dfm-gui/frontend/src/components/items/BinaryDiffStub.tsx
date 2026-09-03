import { DiffBinaryPlaceholder } from "@/components/placeholders/DiffBinaryPlaceholder";
import { Button } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";

type BinaryDiffStubProps = {
  locale: Locale;
  onOpen?: () => void;
  noCommits?: boolean;
  busy?: boolean;
  onCompare?: () => void;
  onRevert?: () => void;
};

export function BinaryDiffStub({ locale, onOpen, busy, onCompare, onRevert }: BinaryDiffStubProps) {
  const copy = t(locale);
  const showActions = Boolean(onCompare && onRevert);
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {showActions ? (
        <div className="flex w-full items-center justify-end p-2">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onCompare}>
              {copy.compare}
            </Button>
            <Button type="button" disabled={busy} onClick={onRevert}>
              {copy.revert}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <DiffBinaryPlaceholder locale={locale} onOpen={onOpen} />
      </div>
    </div>
  );
}
