import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { changeCounts } from "@/lib/status";
import type { BranchSummary, StatusSnapshot } from "@/store/app-store";

function DirtyBranchSwitch({ locale, status }: { locale: Locale; status: StatusSnapshot | null }) {
  const copy = t(locale);
  const counts = changeCounts(status);
  const modified = counts.append + counts.modified + counts.deleted + (status?.renamed_files?.length ?? 0);
  const untracked = counts.new;
  return (
    <div className="w-full text-[13px] leading-normal text-[#18181b] dark:text-foreground">
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
    <Dialog
      className="w-[390px]"
      title={copy.switchBranchTitle(target)}
      titleId="switch-branch-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy} onClick={onConfirm}>
            {copy.stashAndSwitch}
          </Button>
        </>
      }
    >
      <DirtyBranchSwitch locale={locale} status={status} />
    </Dialog>
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
    <Dialog
      className="w-[430px]"
      title={copy.createBranchTitle}
      titleId="create-branch-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy || !trimmed} onClick={() => onCreate(trimmed)}>
            {copy.create}
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
          if (event.key === "Enter" && trimmed) {
            onCreate(trimmed);
          }
        }}
      />
    </Dialog>
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
    <Dialog
      className="w-[430px]"
      title={copy.renameBranchTitle}
      titleId="rename-branch-title"
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
  const [picked, setPicked] = useState("");
  const selected = deletable.some((branch) => branch.name === picked) ? picked : (deletable[0]?.name ?? "");
  const canDelete = Boolean(selected) && !busy;
  return (
    <Dialog
      className="w-[520px]"
      title={copy.deleteBranchSelectTitle}
      titleId="delete-branch-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={!canDelete} onClick={() => onDelete(selected)}>
            {copy.deleteBranch}
          </Button>
        </>
      }
    >
      <div className="flex w-full flex-col gap-3">
        <p className="text-[13px] leading-normal text-[#dc2626]">{copy.deleteBranchBody}</p>
        <div className="flex w-full flex-col overflow-clip" role="listbox" aria-labelledby="delete-branch-title">
          {branches.map((branch) => {
            if (!branch.name) {
              return null;
            }
            const current = isCurrentBranch(branch, currentBranch);
            const active = !current && branch.name === selected;
            const label = current ? copy.branchCurrent(branch.name) : branch.name;
            if (current) {
              return (
                <div key={branch.name} className="flex w-full items-center px-4 py-2" role="option" aria-disabled="true" aria-selected="false">
                  <p className="min-w-0 flex-1 truncate text-[16px] font-normal leading-6 text-[#71717a] dark:text-foreground-muted">{label}</p>
                </div>
              );
            }
            return (
              <button
                key={branch.name}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  "flex w-full items-center rounded-[10px] px-2.5 py-2 text-left text-sm font-medium leading-5 text-[#18181b] dark:text-foreground",
                  active && "bg-[#e4e4e7] dark:bg-background-muted",
                )}
                disabled={busy}
                onClick={() => setPicked(branch.name)}
              >
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
