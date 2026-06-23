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
import { createBranch } from "@/wails/forester";

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  onCreated,
  onError,
  onNotice,
}: CreateBranchDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setSubmitting(false);
    }
  }, [open]);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !submitting;

  const handleCreate = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    onError("");
    try {
      await createBranch(trimmedName);
      await onCreated();
      onNotice(`Branch ${trimmedName} created`);
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
          <DialogTitle>Do you really want to create a new branch?</DialogTitle>
        </DialogHeader>
        <div>
          <Label className="mb-1 text-muted-foreground" htmlFor="branch-name">
            Branch name
          </Label>
          <Input
            id="branch-name"
            value={name}
            placeholder="feature/my-branch"
            disabled={submitting}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                e.preventDefault();
                void handleCreate();
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
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleCreate()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
