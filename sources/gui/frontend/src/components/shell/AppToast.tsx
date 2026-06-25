import { useEffect, type ReactNode } from "react";
import { AlertCircle, FolderOpen, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  reopenRepositoryFromPicker,
  retryForesterConnection,
} from "@/hooks/useProjectStatusPolling";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";

const NOTICE_DISMISS_MS = 4000;

export function AppToast() {
  const t = useT();
  const notice = useAppStore((s) => s.notice);
  const error = useAppStore((s) => s.error);
  const foresterError = useAppStore((s) => s.foresterError);
  const repoPath = useAppStore((s) => s.repoPath);
  const loading = useAppStore((s) => s.loading);
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const setForesterError = useAppStore((s) => s.setForesterError);

  useEffect(() => {
    if (!notice || error || foresterError) return;
    const id = window.setTimeout(() => setNotice(null), NOTICE_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [notice, error, foresterError, setNotice]);

  const dismissErrors = () => {
    setError(null);
    setForesterError(null);
  };

  if (foresterError) {
    return (
      <ToastShell variant="destructive">
        <div className="flex gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-medium">{t("common.foresterUnavailable")}</p>
            <p className="text-sm">{foresterError}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto gap-1 border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={loading}
                onClick={() => void reopenRepositoryFromPicker()}
              >
                <FolderOpen className="h-3 w-3" />
                {t("common.reOpen")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto gap-1 border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={loading}
                onClick={() => void retryForesterConnection()}
              >
                <RotateCcw className="h-3 w-3" />
                {t("common.retry")}
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={t("common.dismissError")}
            onClick={dismissErrors}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </ToastShell>
    );
  }

  if (error) {
    return (
      <ToastShell variant="destructive">
        <div className="flex gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-medium">{t("common.error")}</p>
            <p className="text-sm">{error}</p>
            {!repoPath ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto gap-1 border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={loading}
                onClick={() => void reopenRepositoryFromPicker()}
              >
                <FolderOpen className="h-3 w-3" />
                {t("common.reOpen")}…
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={t("common.dismissError")}
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </ToastShell>
    );
  }

  if (!notice) return null;

  return (
    <ToastShell variant="default">
      <p className="text-sm">{notice}</p>
    </ToastShell>
  );
}

function ToastShell({
  variant,
  children,
}: {
  variant: "default" | "destructive";
  children: ReactNode;
}) {
  return (
    <div
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(
        "fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-lg border px-4 py-3 shadow-lg",
        variant === "default" && "border-border bg-background text-foreground",
        variant === "destructive" &&
          "border-destructive/50 bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </div>
  );
}
