import { AlertCircle, FolderOpen, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  reopenRepositoryFromPicker,
  retryForesterConnection,
} from "@/hooks/useProjectStatusPolling";
import { useAppStore } from "@/stores/appStore";

export function ForesterErrorBanner() {
  const foresterError = useAppStore((s) => s.foresterError);
  const loading = useAppStore((s) => s.loading);

  if (!foresterError) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
      role="alert"
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="truncate">
          <span className="font-medium">Forester unavailable.</span> {foresterError}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto gap-1 border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={loading}
          onClick={() => void reopenRepositoryFromPicker()}
        >
          <FolderOpen className="h-3 w-3" />
          Re-open
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
          Retry
        </Button>
      </div>
    </div>
  );
}
