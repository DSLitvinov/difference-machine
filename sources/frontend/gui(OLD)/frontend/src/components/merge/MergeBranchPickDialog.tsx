import { GitMerge } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface MergeBranchPickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: string[];
  currentBranch: string;
  onSelect: (branch: string) => void;
}

export function MergeBranchPickDialog({
  open,
  onOpenChange,
  branches,
  currentBranch,
  onSelect,
}: MergeBranchPickDialogProps) {
  const t = useT();
  const targets = branches.filter((b) => b !== currentBranch);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {t("merge.intoCurrent")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("merge.intoCurrentDescription", { branch: currentBranch })}
          </p>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          {targets.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("merge.noOtherBranches")}</p>
          ) : (
            targets.map((branch) => (
              <Button
                key={branch}
                type="button"
                variant="ghost"
                className={cn("h-auto w-full justify-start rounded-none px-4 py-3 font-normal")}
                onClick={() => {
                  onSelect(branch);
                  onOpenChange(false);
                }}
              >
                {branch}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
