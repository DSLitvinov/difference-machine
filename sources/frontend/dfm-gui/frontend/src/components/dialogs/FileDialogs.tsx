import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { t, type Locale } from "@/lib/i18n";
import { basenameRel } from "@/lib/folder-query";

type FileRenameDialogProps = {
  locale: Locale;
  path: string;
  busy?: boolean;
  onCancel: () => void;
  onRename: (newName: string) => void;
};

export function FileRenameDialog({ locale, path, busy, onCancel, onRename }: FileRenameDialogProps) {
  const copy = t(locale);
  const [name, setName] = useState(basenameRel(path));
  const trimmed = name.trim();
  const canRename = Boolean(trimmed) && trimmed !== basenameRel(path) && !trimmed.includes("/") && !trimmed.includes("\\");
  return (
    <Dialog
      className="w-[430px]"
      title={copy.rename}
      titleId="rename-file-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy || !canRename} onClick={() => onRename(trimmed)}>
            {copy.rename}
          </Button>
        </>
      }
    >
      <Input
        value={name}
        disabled={busy}
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && canRename) {
            onRename(trimmed);
          }
        }}
      />
    </Dialog>
  );
}

type FileDeleteDialogProps = {
  locale: Locale;
  title?: string;
  body?: string;
  paths?: string[];
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export function FileDeleteDialog({ locale, title, body, paths, confirmLabel, busy, onCancel, onDelete }: FileDeleteDialogProps) {
  const copy = t(locale);
  const heading = title ?? copy.deleteInProject;
  const confirm = confirmLabel ?? copy.deleteInProject;
  const names = (paths ?? []).map((path) => basenameRel(path)).filter(Boolean);
  return (
    <Dialog
      className="w-[430px]"
      title={heading}
      titleId="delete-file-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}>
            {confirm}
          </Button>
        </>
      }
    >
      {names.length > 0 ? (
        <div className="flex w-full min-w-0 flex-col gap-1">
          {names.map((name, index) => (
            <p key={`${name}:${index}`} className="w-full min-w-0 break-words text-[14px] font-medium leading-5 text-[#18181b] dark:text-foreground">
              {name}
            </p>
          ))}
        </div>
      ) : null}
      {body ? <p className="text-[13px] leading-normal text-[#18181b] dark:text-foreground">{body}</p> : null}
    </Dialog>
  );
}
