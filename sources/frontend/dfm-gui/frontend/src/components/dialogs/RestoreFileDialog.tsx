import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { t, type Locale } from "@/lib/i18n";

type RestoreFileDialogProps = {
  locale: Locale;
  title?: string;
  fileName: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RestoreFileDialog({ locale, title, fileName, confirmLabel, busy, onCancel, onConfirm }: RestoreFileDialogProps) {
  const copy = t(locale);
  const heading = title ?? copy.revert;
  const confirm = confirmLabel ?? copy.revert;
  return (
    <Dialog
      className="w-[430px]"
      title={heading}
      titleId="restore-file-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy} onClick={onConfirm}>
            {confirm}
          </Button>
        </>
      }
    >
      <p className="truncate text-[13px] leading-normal text-[#18181b] dark:text-foreground">{fileName}</p>
    </Dialog>
  );
}
