import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import { useT } from "@/lib/i18n";

interface RemoveRepositoryFromListDialogProps {
  open: boolean;
  repoPath: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemoveRepositoryFromListDialog({
  open,
  repoPath,
  onConfirm,
  onCancel,
}: RemoveRepositoryFromListDialogProps) {
  const t = useT();
  return (
    <ConfirmAlertDialog
      open={open}
      title={t("settings.removeRepoTitle")}
      description={t("settings.removeRepoDescription", { path: repoPath })}
      confirmLabel={t("settings.removeRepoAction")}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
