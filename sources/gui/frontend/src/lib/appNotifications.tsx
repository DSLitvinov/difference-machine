import { FolderOpen, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  reopenRepositoryFromPicker,
  retryForesterConnection,
} from "@/hooks/useProjectStatusPolling";
import { dismiss, toast } from "@/hooks/use-toast";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";

const NOTICE_DURATION_MS = 4000;
const PERSISTENT_DURATION_MS = 1000 * 60 * 60 * 24;

let persistentErrorToastId: string | undefined;
let persistentForesterToastId: string | undefined;

function t(key: TranslationKey, opts?: Record<string, string | number>) {
  const { language } = useAppStore.getState();
  return translate(language, key, opts);
}

export function dismissPersistentToasts() {
  if (persistentErrorToastId) {
    dismiss(persistentErrorToastId);
    persistentErrorToastId = undefined;
  }
  if (persistentForesterToastId) {
    dismiss(persistentForesterToastId);
    persistentForesterToastId = undefined;
  }
}

export function dismissErrorToast() {
  if (persistentErrorToastId) {
    dismiss(persistentErrorToastId);
    persistentErrorToastId = undefined;
  }
}

export function dismissForesterToast() {
  if (persistentForesterToastId) {
    dismiss(persistentForesterToastId);
    persistentForesterToastId = undefined;
  }
}

export function notifyNotice(message: string) {
  const { error, foresterError } = useAppStore.getState();
  if (error || foresterError) return;

  toast({
    description: message,
    duration: NOTICE_DURATION_MS,
  });
}

export function notifyError(message: string) {
  if (persistentForesterToastId) {
    dismiss(persistentForesterToastId);
    persistentForesterToastId = undefined;
  }
  if (persistentErrorToastId) {
    dismiss(persistentErrorToastId);
  }

  const { repoPath, loading } = useAppStore.getState();
  const showReopen = !repoPath;

  const { id } = toast({
    variant: "destructive",
    title: t("common.error"),
    description: (
      <div className="space-y-2">
        <p>{message}</p>
        {showReopen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto gap-1 border-destructive-foreground/40 bg-transparent px-2 py-1 text-xs text-destructive-foreground hover:bg-destructive-foreground/10 hover:text-destructive-foreground"
            disabled={loading}
            onClick={() => void reopenRepositoryFromPicker()}
          >
            <FolderOpen className="h-3 w-3" />
            {t("common.reOpen")}…
          </Button>
        ) : null}
      </div>
    ),
    duration: PERSISTENT_DURATION_MS,
    onOpenChange: (open) => {
      if (!open) {
        persistentErrorToastId = undefined;
        useAppStore.setState({ error: null });
      }
    },
  });
  persistentErrorToastId = id;
}

export function notifyForesterError(message: string) {
  if (persistentErrorToastId) {
    dismiss(persistentErrorToastId);
    persistentErrorToastId = undefined;
  }
  if (persistentForesterToastId) {
    dismiss(persistentForesterToastId);
  }

  const { loading } = useAppStore.getState();

  const { id } = toast({
    variant: "destructive",
    title: t("common.foresterUnavailable"),
    description: (
      <div className="space-y-2">
        <p>{message}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto gap-1 border-destructive-foreground/40 bg-transparent px-2 py-1 text-xs text-destructive-foreground hover:bg-destructive-foreground/10 hover:text-destructive-foreground"
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
            className="h-auto gap-1 border-destructive-foreground/40 bg-transparent px-2 py-1 text-xs text-destructive-foreground hover:bg-destructive-foreground/10 hover:text-destructive-foreground"
            disabled={loading}
            onClick={() => void retryForesterConnection()}
          >
            <RotateCcw className="h-3 w-3" />
            {t("common.retry")}
          </Button>
        </div>
      </div>
    ),
    duration: PERSISTENT_DURATION_MS,
    onOpenChange: (open) => {
      if (!open) {
        persistentForesterToastId = undefined;
        useAppStore.setState({ foresterError: null });
      }
    },
  });
  persistentForesterToastId = id;
}
