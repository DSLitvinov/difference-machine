import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { changeCounts } from "@/lib/status";
import type { BranchSummary, StatusSnapshot } from "@/store/app-store";

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
          <Icon icon={X} size={16} />
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
  branches: BranchSummary[];
  currentBranch: string;
  busy?: boolean;
  onCancel: () => void;
  onDelete: (name: string) => void;
};

function isCurrentBranch(branch: BranchSummary, currentBranch: string): boolean {
  return Boolean(branch.is_current) || (Boolean(branch.name) && branch.name === currentBranch);
}

export function DeleteBranchDialog({
  locale,
  branches,
  currentBranch,
  busy,
  onCancel,
  onDelete,
}: DeleteBranchDialogProps) {
  const copy = t(locale);
  const deletable = branches.filter((branch) => branch.name && !isCurrentBranch(branch, currentBranch));
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [picked, setPicked] = useState("");
  const selected = deletable.some((branch) => branch.name === picked) ? picked : (deletable[0]?.name ?? "");
  const canAdvance = Boolean(selected) && !busy;
  if (step === "confirm") {
    return (
      <DialogShell locale={locale} title={copy.deleteBranchTitle} titleId="delete-branch-title" busy={busy} onClose={onCancel}>
        <div className="flex w-full flex-col items-start gap-3">
          <p className="text-[14px] font-medium leading-5 text-foreground">{selected}</p>
          <p className="text-[13px] leading-normal text-foreground-muted">{copy.deleteBranchBody}</p>
        </div>
        <div className="flex w-full items-start justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" variant="destructive" disabled={!canAdvance} onClick={() => onDelete(selected)}>
            {copy.deleteBranch}
          </Button>
        </div>
      </DialogShell>
    );
  }
  return (
    <DialogShell locale={locale} title={copy.deleteBranchSelectTitle} titleId="delete-branch-select-title" busy={busy} onClose={onCancel}>
      <div className="flex w-full flex-col overflow-clip" role="listbox" aria-labelledby="delete-branch-select-title">
        {branches.map((branch) => {
          if (!branch.name) {
            return null;
          }
          const current = isCurrentBranch(branch, currentBranch);
          const active = !current && branch.name === selected;
          const label = current ? copy.branchCurrent(branch.name) : branch.name;
          const rowClass = cn(
            "flex w-full flex-col items-start overflow-clip rounded-sm px-4 py-2 text-left",
            active && "bg-background-muted",
            !current && !active && "hover:bg-background-muted",
          );
          const textClass = cn("min-w-0 flex-1 truncate text-[16px] leading-6", current ? "text-foreground-muted" : "text-foreground");
          if (current) {
            return (
              <div key={branch.name} className={rowClass} role="option" aria-disabled="true" aria-selected="false">
                <p className={textClass}>{label}</p>
              </div>
            );
          }
          return (
            <button
              key={branch.name}
              type="button"
              role="option"
              aria-selected={active}
              className={rowClass}
              disabled={busy}
              onClick={() => setPicked(branch.name)}
            >
              <p className={textClass}>{label}</p>
            </button>
          );
        })}
      </div>
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" disabled={!canAdvance} onClick={() => setStep("confirm")}>
          {copy.next}
        </Button>
      </div>
    </DialogShell>
  );
}
