import { AlertCircle, RotateCcw } from "lucide-react";

import { retryForesterConnection } from "@/hooks/useProjectStatusPolling";
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
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium hover:bg-destructive/10 disabled:opacity-50"
        disabled={loading}
        onClick={() => void retryForesterConnection()}
      >
        <RotateCcw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}
