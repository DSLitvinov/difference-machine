import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import { changeCounts } from "@/lib/status";
import type { StatusSnapshot } from "@/store/app-store";

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
          <FigmaIcon src="icons/x.svg" size={16} />
        </button>
        <p id={titleId} className="pr-6 text-[18px] font-semibold leading-7 text-foreground">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

function DirtyBranchSwitch({ locale, status }: { locale: Locale; status: StatusSnapshot | null }) {
  const copy = t(locale);
  const counts = changeCounts(status);
  const modified = counts.append + counts.modified + counts.deleted + (status?.renamed_files?.length ?? 0);
  const untracked = counts.new;
  return (
    <div className="w-full text-[13px] leading-normal text-foreground-muted">
      <p>{copy.uncommittedChanges}</p>
      {modified > 0 ? <p>{copy.modifiedCount(modified)}</p> : null}
      {untracked > 0 ? <p>{copy.untrackedCount(untracked)}</p> : null}
    </div>
  );
}

type SwitchBranchDialogProps = {
  locale: Locale;
  target: string;
  status: StatusSnapshot | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SwitchBranchDialog({ locale, target, status, busy, onCancel, onConfirm }: SwitchBranchDialogProps) {
  const copy = t(locale);
  return (
    <DialogShell locale={locale} title={copy.switchBranchTitle(target)} titleId="switch-branch-title" busy={busy} onClose={onCancel}>
      <DirtyBranchSwitch locale={locale} status={status} />
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" disabled={busy} onClick={onConfirm}>
          {copy.stashAndSwitch}
        </Button>
      </div>
    </DialogShell>
  );
}

type CreateBranchDialogProps = {
  locale: Locale;
  busy?: boolean;
  onCancel: () => void;
  onCreate: (name: string) => void;
};

export function CreateBranchDialog({ locale, busy, onCancel, onCreate }: CreateBranchDialogProps) {
  const copy = t(locale);
  const [name, setName] = useState("");
  const trimmed = name.trim();
  return (
    <DialogShell locale={locale} title={copy.createBranchTitle} titleId="create-branch-title" busy={busy} onClose={onCancel}>
      <Input
        value={name}
        placeholder="feature/my-branch"
        disabled={busy}
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && trimmed) {
            onCreate(trimmed);
          }
        }}
      />
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" disabled={busy || !trimmed} onClick={() => onCreate(trimmed)}>
          {copy.create}
        </Button>
      </div>
    </DialogShell>
  );
}

type RenameBranchDialogProps = {
  locale: Locale;
  oldName: string;
  busy?: boolean;
  onCancel: () => void;
  onRename: (newName: string) => void;
};

export function RenameBranchDialog({ locale, oldName, busy, onCancel, onRename }: RenameBranchDialogProps) {
  const copy = t(locale);
  const [name, setName] = useState(oldName);
  const trimmed = name.trim();
  const canRename = Boolean(trimmed) && trimmed !== oldName;
  return (
    <DialogShell locale={locale} title={copy.renameBranchTitle} titleId="rename-branch-title" busy={busy} onClose={onCancel}>
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
          {copy.rename}
        </Button>
      </div>
    </DialogShell>
  );
}

type DeleteBranchDialogProps = {
  locale: Locale;
  busy?: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export function DeleteBranchDialog({ locale, busy, onCancel, onDelete }: DeleteBranchDialogProps) {
  const copy = t(locale);
  return (
    <DialogShell locale={locale} title={copy.deleteBranchTitle} titleId="delete-branch-title" busy={busy} onClose={onCancel}>
      <p className="text-[13px] leading-normal text-foreground-muted">{copy.deleteBranchBody}</p>
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}>
          {copy.deleteBranch}
        </Button>
      </div>
    </DialogShell>
  );
}
