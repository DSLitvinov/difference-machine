import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import { useT } from "@/lib/i18n";
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
  const t = useT();
  const lines = status ? dirtyWorktreeSummary(status) : [];
  const description = [t("branch.uncommittedChanges"), ...lines].join("\n");

  return (
    <ConfirmAlertDialog
      open={open}
      title={t("branch.switchTitle", { branch: targetBranch })}
      description={description}
      confirmLabel={switching ? t("common.switchingBranch") : t("branch.stashAndSwitch")}
      cancelLabel={t("common.cancel")}
      loading={switching}
      onConfirm={onStashAndSwitch}
      onCancel={onCancel}
    />
  );
}
