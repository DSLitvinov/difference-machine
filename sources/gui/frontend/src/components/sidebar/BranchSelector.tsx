import { useState } from "react";
import { Check, ChevronDown, GitBranch, GitMerge, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { branchDeleteBlockReason } from "@/lib/branchDelete";
import { useT, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface BranchSelectorProps {
  branches: string[];
  currentBranch: string;
  isDetached?: boolean;
  disabled?: boolean;
  mergeInProgress?: boolean;
  mergeBranch?: string | null;
  onSelect: (branch: string) => void;
  onCreateClick?: () => void;
  onMergeIntoCurrentClick?: () => void;
  onDeleteClick?: (branch: string) => void;
  mergeDisabled?: boolean;
}

export function BranchSelector({
  branches,
  currentBranch,
  isDetached,
  disabled,
  mergeInProgress,
  mergeBranch,
  onSelect,
  onCreateClick,
  onMergeIntoCurrentClick,
  onDeleteClick,
  mergeDisabled,
}: BranchSelectorProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const label = isDetached
    ? `${currentBranch || "HEAD"} (${t("branch.detached")})`
    : currentBranch || t("branch.noBranchesLabel");

  const deleteBlockKeys: Record<string, TranslationKey> = {
    "Cannot delete the only branch": "branch.cannotDeleteOnly",
    "This branch is protected": "branch.protected",
    "Switch to another branch before deleting this one": "branch.switchBeforeDelete",
    "Cannot delete the current branch during a merge": "branch.cannotDeleteCurrentDuringMerge",
    "Cannot delete a branch involved in an active merge": "branch.cannotDeleteActiveMerge",
    "Delete unavailable": "branch.deleteUnavailable",
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  const handleSelect = (branch: string) => {
    onSelect(branch);
    handleOpenChange(false);
  };

  const handleCreateClick = () => {
    handleOpenChange(false);
    onCreateClick?.();
  };

  const handleMergeClick = () => {
    handleOpenChange(false);
    onMergeIntoCurrentClick?.();
  };

  const handleDeleteClick = (branch: string) => {
    handleOpenChange(false);
    onDeleteClick?.(branch);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || mergeDisabled}
          className="w-full justify-between gap-2 bg-background font-medium"
          title={currentBranch || undefined}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="z-50 w-[var(--radix-popover-trigger-width)] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-56 overflow-auto">
          {branches.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("branch.noBranches")}</p>
          ) : (
            branches.map((branch) => {
              const deleteBlockReason = onDeleteClick
                ? branchDeleteBlockReason({
                    branch,
                    branches,
                    currentBranch,
                    isDetached: Boolean(isDetached),
                    mergeInProgress,
                    mergeBranch,
                  })
                : "Delete unavailable";
              const deleteTitle = deleteBlockReason
                ? t(deleteBlockKeys[deleteBlockReason] ?? "branch.deleteUnavailable")
                : t("branch.deleteBranch", { branch });
              const isCurrent = !isDetached && currentBranch === branch;

              return (
                <div key={branch} className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-auto min-w-0 flex-1 justify-start gap-2 px-3 py-2 font-normal",
                      isCurrent && "bg-accent",
                    )}
                    title={branch}
                    onClick={() => handleSelect(branch)}
                  >
                    {isCurrent ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">{branch}</span>
                  </Button>
                  {onDeleteClick ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={Boolean(deleteBlockReason)}
                      title={deleteTitle}
                      onClick={() => handleDeleteClick(branch)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        {onCreateClick ? (
          <>
            <Separator className="my-1" />
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-3 py-2 font-normal"
              onClick={handleCreateClick}
            >
              <Plus className="h-4 w-4" />
              {t("branch.createNew")}
            </Button>
          </>
        ) : null}
        {onMergeIntoCurrentClick ? (
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-2 px-3 py-2 font-normal"
            disabled={mergeDisabled}
            onClick={handleMergeClick}
          >
            <GitMerge className="h-4 w-4" />
            {t("merge.intoCurrent")}…
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
