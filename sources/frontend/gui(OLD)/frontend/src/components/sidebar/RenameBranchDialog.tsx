import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { renameBranch } from "@/wails/forester";

interface RenameBranchDialogProps {
  open: boolean;
  branchName: string;
  onOpenChange: (open: boolean) => void;
  onRenamed: () => void | Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

export function RenameBranchDialog({
  open,
  branchName,
  onOpenChange,
  onRenamed,
  onError,
  onNotice,
}: RenameBranchDialogProps) {
  const t = useT();
  const [name, setName] = useState(branchName);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(branchName);
      setSubmitting(false);
    }
  }, [open, branchName]);

  const trimmedName = name.trim();
  const canSubmit =
    trimmedName.length > 0 && trimmedName !== branchName.trim() && !submitting;

  const handleRename = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    onError("");
    try {
      await renameBranch(branchName, trimmedName);
      await onRenamed();
      onNotice(t("branch.renamed", { branch: trimmedName }));
      onOpenChange(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("branch.renameTitle")}</DialogTitle>
        </DialogHeader>
        <div>
          <Label className="mb-1 text-muted-foreground" htmlFor="rename-branch-name">
            {t("branch.name")}
          </Label>
          <Input
            id="rename-branch-name"
            value={name}
            placeholder="feature/my-branch"
            disabled={submitting}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                e.preventDefault();
                void handleRename();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleRename()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("branch.renaming")}
              </>
            ) : (
              t("branch.renameAction")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
