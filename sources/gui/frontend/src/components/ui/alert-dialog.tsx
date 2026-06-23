import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface AlertDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AlertDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading,
  onConfirm,
  onCancel,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
