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
import { authorDisplayName } from "@/lib/author";
import { shortHash } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import {
  compareExtract,
  fetchLockList,
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
  const t = useT();
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const currentUser = useAppStore((s) => s.userName);

  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [acting, setActing] = useState(false);

  const hashShort = shortHash(commit.hash);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t("common.copiedToClipboard"));
    } catch {
      setError(t("common.copyFailed"));
    }
  };

  const handleCompare = async () => {
    setMenuOpen(false);
    setError(null);
    setActing(true);
    try {
      const path = await compareExtract(commit.hash);
      await openWorkdirPath(TMP_REVIEW_PATH);
      setNotice(t("commit.compareOpened", { path: path || TMP_REVIEW_PATH }));
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
        const locks = await fetchLockList();
        const blocked = locks.find(
          (lock) => lock.user !== currentUser && lock.user !== authorDisplayName(currentUser),
        );
        if (blocked) {
          setError(t("history.fileLockedBy", { user: blocked.user }));
          return;
        }
        await restoreVersion(commit.hash);
        setNotice(t("commit.restoredWorkingTree", { hash: hashShort }));
      } else if (pendingAction === "revert") {
        await revertCommit(commit.hash);
        setNotice(t("commit.reverted", { hash: hashShort }));
      } else {
        await resetCommit(commit.hash, pendingAction.mode);
        setNotice(t("commit.resetDone", { mode: pendingAction.mode, hash: hashShort }));
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
        title: t("commit.restoreTitle", { hash: hashShort }),
        description: t("commit.restoreDescription"),
        confirmLabel: t("commit.restoreAction"),
      };
    }
    if (pendingAction === "revert") {
      return {
        title: t("commit.revertTitle", { hash: hashShort }),
        description: t("commit.revertDescription"),
        confirmLabel: t("commit.revertAction"),
      };
    }
    if (pendingAction && typeof pendingAction === "object" && pendingAction.kind === "reset") {
      const modeDescriptions: Record<CommitResetMode, string> = {
        soft: t("commit.resetSoftDescription"),
        mixed: t("commit.resetMixedDescription"),
        hard: t("commit.resetHardDescription"),
      };
      return {
        title: t("commit.resetTitle", { mode: pendingAction.mode, hash: hashShort }),
        description: `${modeDescriptions[pendingAction.mode]}\n\n${t("commit.resetWarning")}`,
        confirmLabel:
          pendingAction.mode === "hard"
            ? t("commit.resetHardAction")
            : t("commit.resetAction", { mode: pendingAction.mode }),
      };
    }
    return {
      title: "",
      description: "",
      confirmLabel: t("common.confirm"),
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
            aria-label={t("commit.actions")}
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
            {t("commit.viewPreview")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={acting} onClick={() => void handleCompare()}>
            {t("commit.compareWorkingTree")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={acting}
            onClick={() => {
              setMenuOpen(false);
              setPendingAction("restore");
            }}
          >
            {t("commit.restoreVersion")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={acting || isHead}
            title={isHead ? t("commit.cannotRevertHead") : undefined}
            onClick={() => {
              setMenuOpen(false);
              setPendingAction("revert");
            }}
          >
            {t("commit.revert")}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              disabled={acting || isHead}
              title={isHead ? t("commit.alreadyAtCommit") : undefined}
            >
              {t("commit.resetBranch")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[12rem]">
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  setPendingAction({ kind: "reset", mode: "soft" });
                }}
              >
                {t("commit.softReset")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  setPendingAction({ kind: "reset", mode: "mixed" });
                }}
              >
                {t("commit.mixedReset")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setMenuOpen(false);
                  setPendingAction({ kind: "reset", mode: "hard" });
                }}
              >
                {t("commit.hardReset")}
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
            {t("commit.copyHash")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onClick={() => {
              void copyText(commit.message);
              setMenuOpen(false);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            {t("commit.copyMessage")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmAlertDialog
        open={pendingAction !== null}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={acting ? t("common.working") : dialogCopy.confirmLabel}
        loading={acting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (!acting) setPendingAction(null);
        }}
      />
    </>
  );
}
