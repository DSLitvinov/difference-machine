import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import xIcon from "@/assets/icons/x.svg";

type RestoreFileDialogProps = {
  locale: Locale;
  fileName: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RestoreFileDialog({ locale, fileName, busy, onCancel, onConfirm }: RestoreFileDialogProps) {
  const copy = t(locale);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-file-title"
        className="relative w-[451px] rounded-md border border-border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="absolute right-[11px] top-[11px] flex size-6 items-center justify-center" aria-label={copy.close} onClick={onCancel}>
          <FigmaIcon src={xIcon} size={16} />
        </button>
        <p id="restore-file-title" className="pr-6 text-[18px] font-semibold leading-7 text-foreground">
          {copy.revert}
        </p>
        <p className="mt-4 truncate text-[13px] leading-normal text-foreground-muted">{fileName}</p>
        <div className="mt-4 flex w-full items-center justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy} onClick={onConfirm}>
            {copy.revert}
          </Button>
        </div>
      </div>
    </div>
  );
}
