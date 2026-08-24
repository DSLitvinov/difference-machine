import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import { basenameRel } from "@/lib/folder-query";
import xIcon from "@/assets/icons/x.svg";

type DialogShellProps = {
  locale: Locale;
  title: string;
  titleId: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
};

function DialogShell({ locale, title, titleId, busy, onClose, children }: DialogShellProps) {
  const copy = t(locale);
  const [backdropArmed, setBackdropArmed] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setBackdropArmed(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={busy || !backdropArmed ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex w-[451px] flex-col gap-4 rounded-md border border-border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="absolute right-[11px] top-[11px] flex size-6 items-center justify-center" aria-label={copy.close} onClick={onClose} disabled={busy}>
          <FigmaIcon src={xIcon} size={16} />
        </button>
        <p id={titleId} className="pr-6 text-[18px] font-semibold leading-7 text-foreground">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

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
    <DialogShell locale={locale} title="Rename" titleId="rename-file-title" busy={busy} onClose={onCancel}>
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
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" disabled={busy || !canRename} onClick={() => onRename(trimmed)}>
          Rename
        </Button>
      </div>
    </DialogShell>
  );
}

type FileDeleteDialogProps = {
  locale: Locale;
  busy?: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export function FileDeleteDialog({ locale, busy, onCancel, onDelete }: FileDeleteDialogProps) {
  const copy = t(locale);
  return (
    <DialogShell locale={locale} title="Delete in project" titleId="delete-file-title" busy={busy} onClose={onCancel}>
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}>
          Delete in project
        </Button>
      </div>
    </DialogShell>
  );
}
