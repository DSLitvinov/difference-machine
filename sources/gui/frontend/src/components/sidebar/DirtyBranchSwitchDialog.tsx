import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import { dirtyWorktreeSummary } from "@/lib/worktreeDirty";
import type { StatusPayload } from "@/wails/forester";

interface DirtyBranchSwitchDialogProps {
  open: boolean;
  targetBranch: string;
  status: StatusPayload | null;
  switching: boolean;
  onCancel: () => void;
  onStashAndSwitch: () => void;
}

export function DirtyBranchSwitchDialog({
  open,
  targetBranch,
  status,
  switching,
  onCancel,
  onStashAndSwitch,
}: DirtyBranchSwitchDialogProps) {
  const lines = status ? dirtyWorktreeSummary(status) : [];
  const description = ["You have uncommitted changes:", ...lines].join("\n");

  return (
    <ConfirmAlertDialog
      open={open}
      title={`Switch branch to "${targetBranch}"?`}
      description={description}
      confirmLabel={switching ? "Switching…" : "Stash & switch"}
      cancelLabel="Cancel"
      loading={switching}
      onConfirm={onStashAndSwitch}
      onCancel={onCancel}
    />
  );
}
