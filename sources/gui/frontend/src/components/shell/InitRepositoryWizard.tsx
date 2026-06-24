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
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_DFMIGNORE_TEMPLATE,
  type InitRepositoryWizardStep,
} from "@/lib/initRepository";
import { basename } from "@/lib/utils";
import { fetchRepoUser } from "@/wails/bridge";

interface InitRepositoryWizardProps {
  open: boolean;
  path: string | null;
  loading: boolean;
  onCancel: () => void;
  onCreate: (options: { author: string; dfmignore: string }) => void;
}

export function InitRepositoryWizard({
  open,
  path,
  loading,
  onCancel,
  onCreate,
}: InitRepositoryWizardProps) {
  const [step, setStep] = useState<InitRepositoryWizardStep>("confirm");
  const [author, setAuthor] = useState("");
  const [dfmignore, setDfmignore] = useState(DEFAULT_DFMIGNORE_TEMPLATE);

  useEffect(() => {
    if (!open) {
      setStep("confirm");
      setAuthor("");
      setDfmignore(DEFAULT_DFMIGNORE_TEMPLATE);
      return;
    }
    void fetchRepoUser()
      .then((name) => setAuthor(name.trim()))
      .catch(() => setAuthor(""));
  }, [open]);

  const folderLabel = path ? basename(path) : "";
  const canGoNext =
    step === "confirm" ||
    (step === "author" && author.trim().length > 0) ||
    step === "ignore";

  const handlePrimary = () => {
    if (step === "confirm") {
      setStep("author");
      return;
    }
    if (step === "author") {
      setStep("ignore");
      return;
    }
    onCreate({ author: author.trim(), dfmignore });
  };

  const handleBack = () => {
    if (step === "ignore") {
      setStep("author");
      return;
    }
    if (step === "author") {
      setStep("confirm");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onCancel();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "confirm"
              ? "This folder is not a repository"
              : step === "author"
                ? "Author defaults"
                : ".dfmignore template"}
          </DialogTitle>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Do you want to make this folder a Forester repository?</p>
            {path ? (
              <p className="truncate rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground">
                {path}
              </p>
            ) : null}
            <p>
              The wizard will create <span className="font-medium text-foreground">.DFM/</span>,
              branch <span className="font-medium text-foreground">main</span>, and a default{" "}
              <span className="font-medium text-foreground">.dfmignore</span> file.
            </p>
          </div>
        ) : null}

        {step === "author" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Set the default author for commits in{" "}
              <span className="font-medium text-foreground">{folderLabel || "this repository"}</span>.
              This is stored in the repository config and prefilled from your global profile.
            </p>
            <div>
              <Label htmlFor="init-author">Author name</Label>
              <Input
                id="init-author"
                value={author}
                disabled={loading}
                autoFocus
                placeholder="Your name"
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {step === "ignore" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Review ignore patterns for{" "}
              <span className="font-medium text-foreground">.dfmignore</span>. Matching files will
              not appear in Project view or be tracked unless you change this file later.
            </p>
            <div>
              <Label htmlFor="init-dfmignore">Ignore patterns</Label>
              <Textarea
                id="init-dfmignore"
                value={dfmignore}
                disabled={loading}
                className="min-h-[240px] font-mono text-xs"
                onChange={(e) => setDfmignore(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {step !== "confirm" ? (
              <Button type="button" variant="outline" disabled={loading} onClick={handleBack}>
                Back
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || !canGoNext}
              onClick={() => void handlePrimary()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : step === "ignore" ? (
                "Create repository"
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
