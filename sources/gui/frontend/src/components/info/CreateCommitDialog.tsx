import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { shortHash } from "@/lib/format";
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
      setNotice(hash ? `Commit ${hash} created` : "Commit created");
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
      <DialogHeader title="Create commit" onClose={() => onOpenChange(false)} />
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">Author</p>
          <p className="text-sm">{author || "Unknown"}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground" htmlFor="commit-subject">
            Message
          </label>
          <Input
            id="commit-subject"
            placeholder="Write commit..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground" htmlFor="commit-body">
            Description
          </label>
          <Textarea
            id="commit-body"
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function prepareCommitPaths(
  selectedPaths: string[],
  committable: string[],
): { toStage: string[]; error?: string; warning?: string } {
  const committableSet = new Set(committable);
  const toStage = selectedPaths.filter((p) => committableSet.has(p));
  if (toStage.length === 0) {
    return { toStage, error: "Selected files are already committed" };
  }
  if (toStage.length < selectedPaths.length) {
    return {
      toStage,
      warning: `${toStage.length} of ${selectedPaths.length} files will be committed`,
    };
  }
  return { toStage };
}
