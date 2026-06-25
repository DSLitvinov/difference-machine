import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { shortHash } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { createCommit, fetchStatus } from "@/wails/forester";

interface CreateCommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author: string;
  selectedPaths: string[];
}

export function CreateCommitDialog({
  open,
  onOpenChange,
  author,
  selectedPaths,
}: CreateCommitDialogProps) {
  const t = useT();
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const setStatus = useProjectStore((s) => s.setStatus);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = subject.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) return;

    const fullMessage = description.trim()
      ? `${trimmedSubject}\n\n${description.trim()}`
      : trimmedSubject;

    setSubmitting(true);
    setError(null);
    try {
      await createCommit(fullMessage, author || "Unknown");
      const status = await fetchStatus();
      setStatus(status);
      const hash = shortHash(status.head_commit);
      setNotice(hash ? t("commit.createdWithHash", { hash }) : t("commit.created"));
      setSubject("");
      setDescription("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("commit.create")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">{t("commit.author")}</p>
            <p className="text-sm">{author || t("common.unknown")}</p>
          </div>
          <div>
            <Label className="mb-1 text-muted-foreground" htmlFor="commit-subject">
              {t("commit.message")}
            </Label>
            <Input
              id="commit-subject"
              placeholder={t("commit.writePlaceholder")}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <Label className="mb-1 text-muted-foreground" htmlFor="commit-body">
              {t("common.description")}
            </Label>
            <Textarea
              id="commit-body"
              placeholder={t("commit.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("common.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function prepareCommitPaths(
  selectedPaths: string[],
  committable: string[],
  t: ReturnType<typeof useT>,
): { toStage: string[]; error?: string; warning?: string } {
  const committableSet = new Set(committable);
  const toStage = selectedPaths.filter((p) => committableSet.has(p));
  if (toStage.length === 0) {
    return { toStage, error: t("commit.selectedAlreadyCommitted") };
  }
  if (toStage.length < selectedPaths.length) {
    return {
      toStage,
      warning: t("commit.filesWillBeCommitted", {
        staged: toStage.length,
        selected: selectedPaths.length,
      }),
    };
  }
  return { toStage };
}
