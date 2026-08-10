import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import { useT } from "@/lib/i18n";

interface DeleteBranchDialogProps {
  open: boolean;
  branchName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteBranchDialog({
  open,
  branchName,
  loading,
  onConfirm,
  onCancel,
}: DeleteBranchDialogProps) {
  const t = useT();
  return (
    <ConfirmAlertDialog
      open={open}
      title={t("branch.deleteTitle", { branch: branchName })}
      description={t("branch.deleteDescription")}
      confirmLabel={loading ? t("common.deleting") : t("branch.deleteAction")}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
