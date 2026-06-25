import { useState } from "react";
import { Copy, MoreVertical } from "lucide-react";

import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shortHash } from "@/lib/format";
import { useAppStore } from "@/stores/appStore";
import {
  compareExtract,
  openWorkdirPath,
  restoreVersion,
  revertCommit,
  resetCommit,
  type CommitResetMode,
  type CommitLogEntry,
} from "@/wails/forester";

const TMP_REVIEW_PATH = ".DFM/tmp_review";

type PendingAction = "restore" | "revert" | { kind: "reset"; mode: CommitResetMode } | null;

interface CommitCardMenuProps {
  commit: CommitLogEntry;
  isHead: boolean;
  onSelect: () => void;
  onAfterAction?: () => void | Promise<void>;
}

export function CommitCardMenu({ commit, isHead, onSelect, onAfterAction }: CommitCardMenuProps) {
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);

  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [acting, setActing] = useState(false);

  const hashShort = shortHash(commit.hash);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard");
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleCompare = async () => {
    setMenuOpen(false);
    setError(null);
    setActing(true);
    try {
      const path = await compareExtract(commit.hash);
      await openWorkdirPath(TMP_REVIEW_PATH);
      setNotice(path ? `Compare opened: ${path}` : `Compare opened: ${TMP_REVIEW_PATH}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setActing(true);
    setError(null);
    try {
      if (pendingAction === "restore") {
        await restoreVersion(commit.hash);
        setNotice(`Working tree restored to ${hashShort}`);
      } else if (pendingAction === "revert") {
        await revertCommit(commit.hash);
        setNotice(`Reverted commit ${hashShort}`);
      } else {
        await resetCommit(commit.hash, pendingAction.mode);
        setNotice(`Reset ${pendingAction.mode} to ${hashShort}`);
      }
      setPendingAction(null);
      await onAfterAction?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const dialogCopy = (() => {
    if (pendingAction === "restore") {
      return {
        title: `Restore version ${hashShort}?`,
        description:
          "Replace the entire working directory with the contents of this commit. Uncommitted changes may be lost.",
        confirmLabel: "Restore",
      };
    }
    if (pendingAction === "revert") {
      return {
        title: `Revert commit ${hashShort}?`,
        description:
          "Create a new commit that undoes the changes introduced by this commit. Merge commits may require manual resolution.",
        confirmLabel: "Revert",
      };
    }
    if (pendingAction && typeof pendingAction === "object" && pendingAction.kind === "reset") {
      const modeDescriptions: Record<CommitResetMode, string> = {
        soft: "Move HEAD to this commit and keep all changes staged.",
        mixed: "Move HEAD to this commit, keep file changes in the working tree, and reset the index.",
        hard: "Move HEAD to this commit and discard tracked working tree and index changes.",
      };
      return {
        title: `Reset ${pendingAction.mode} to ${hashShort}?`,
        description: `${modeDescriptions[pendingAction.mode]}\n\nThis rewrites the current branch pointer. Use only when you intentionally want to move the branch back to this commit.`,
        confirmLabel: pendingAction.mode === "hard" ? "Hard reset" : `Reset ${pendingAction.mode}`,
      };
    }
    return {
      title: "",
      description: "",
      confirmLabel: "Confirm",
    };
  })();

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            aria-label="Commit actions"
            disabled={acting}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuItem
            onClick={() => {
              onSelect();
              setMenuOpen(false);
            }}
          >
            View in Preview
          </DropdownMenuItem>
          <DropdownMenuItem disabled={acting} onClick={() => void handleCompare()}>
            Compare with working tree
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={acting}
            onClick={() => {
              setMenuOpen(false);
              setPendingAction("restore");
            }}
          >
            Restore this version
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={acting || isHead}
            title={isHead ? "Cannot revert HEAD commit" : undefined}
            onClick={() => {
              setMenuOpen(false);
              setPendingAction("revert");
            }}
          >
            Revert commit
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              disabled={acting || isHead}
              title={isHead ? "Already at this commit" : undefined}
            >
              Reset branch to commit
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[12rem]">
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  setPendingAction({ kind: "reset", mode: "soft" });
                }}
              >
                Soft reset
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  setPendingAction({ kind: "reset", mode: "mixed" });
                }}
              >
                Mixed reset
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setMenuOpen(false);
                  setPendingAction({ kind: "reset", mode: "hard" });
                }}
              >
                Hard reset
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            onClick={() => {
              void copyText(commit.hash);
              setMenuOpen(false);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy hash
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onClick={() => {
              void copyText(commit.message);
              setMenuOpen(false);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmAlertDialog
        open={pendingAction !== null}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={acting ? "Working…" : dialogCopy.confirmLabel}
        loading={acting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (!acting) setPendingAction(null);
        }}
      />
    </>
  );
}
