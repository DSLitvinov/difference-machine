import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useProjectStore } from "@/stores/projectStore";

interface InfoHistorySectionProps {
  filePath: string;
  commitCount: number | null;
  historyLoading: boolean;
}

export function InfoHistorySection({
  filePath,
  commitCount,
  historyLoading,
}: InfoHistorySectionProps) {
  const t = useT();
  const openFileHistory = useProjectStore((s) => s.openFileHistory);
  const projectPreviewMode = useProjectStore((s) => s.projectPreviewMode);
  const fileHistoryPath = useProjectStore((s) => s.fileHistoryPath);
  const [collapsed, setCollapsed] = useState(false);

  const isViewingThisFile =
    projectPreviewMode === "fileHistory" && fileHistoryPath === filePath;
  const hasHistory = commitCount !== null && commitCount > 0;
  const showNoHistoryAlert = commitCount === 0 && !historyLoading;

  const handleView = () => {
    if (isViewingThisFile) return;
    openFileHistory(filePath);
  };

  return (
    <section className="border-t border-border pt-3">
      <Button
        type="button"
        variant="ghost"
        className="mb-2 h-auto w-full justify-between px-0 py-0 text-sm font-semibold hover:bg-transparent"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>{t("history.title")}</span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </Button>

      {!collapsed ? (
        <div className="flex flex-col gap-2">
          {hasHistory ? (
            <Button type="button" className="w-full" onClick={handleView}>
              {t("fileHistory.view")}
            </Button>
          ) : null}
          {showNoHistoryAlert ? (
            <Alert>
              <Info className="h-5 w-5" />
              <AlertTitle className="text-base font-medium leading-6">
                {t("fileHistory.noHistoryTitle")}
              </AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {t("fileHistory.noHistoryDescription")}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
