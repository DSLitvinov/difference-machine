import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";

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
  return (
    <ConfirmAlertDialog
      open={open}
      title={`Delete branch "${branchName}"?`}
      description={
        "This cannot be undone. The branch ref will be removed from the repository.\n\nCommits that exist only on this branch may become harder to reach."
      }
      confirmLabel={loading ? "Deleting…" : "Delete branch"}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
