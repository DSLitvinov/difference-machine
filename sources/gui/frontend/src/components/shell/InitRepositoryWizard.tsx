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
import { useT } from "@/lib/i18n";
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
  const t = useT();
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
              ? t("init.notRepository")
              : step === "author"
                ? t("init.authorDefaults")
                : t("init.ignoreTemplate")}
          </DialogTitle>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{t("init.makeRepository")}</p>
            {path ? (
              <p className="truncate rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground">
                {path}
              </p>
            ) : null}
            <p>
              {t("init.wizardCreates")}
            </p>
          </div>
        ) : null}

        {step === "author" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("init.authorDescription", { repo: folderLabel || t("init.thisRepository") })}
            </p>
            <div>
              <Label htmlFor="init-author">{t("init.authorName")}</Label>
              <Input
                id="init-author"
                value={author}
                disabled={loading}
                autoFocus
                placeholder={t("settings.yourName")}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {step === "ignore" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("init.ignoreDescription")}
            </p>
            <div>
              <Label htmlFor="init-dfmignore">{t("init.ignorePatterns")}</Label>
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
                {t("init.back")}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={loading || !canGoNext}
              onClick={() => void handlePrimary()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.creating")}
                </>
              ) : step === "ignore" ? (
                t("init.createRepository")
              ) : (
                t("init.next")
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
