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
import { useT } from "@/lib/i18n";

interface RenameFileDialogProps {
  open: boolean;
  fileName: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newName: string) => void | Promise<void>;
}

export function RenameFileDialog({
  open,
  fileName,
  loading,
  onOpenChange,
  onSave,
}: RenameFileDialogProps) {
  const t = useT();
  const [name, setName] = useState(fileName);

  useEffect(() => {
    if (open) {
      setName(fileName);
    }
  }, [open, fileName]);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && trimmedName !== fileName && !loading;

  const handleSave = async () => {
    if (!canSubmit) return;
    await onSave(trimmedName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("preview.renameTitle")}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          disabled={loading}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) {
              e.preventDefault();
              void handleSave();
            }
          }}
        />
        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleSave()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
