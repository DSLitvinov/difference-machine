import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useProjectStore } from "@/stores/projectStore";

interface InfoHistorySectionProps {
  filePath: string;
}

export function InfoHistorySection({ filePath }: InfoHistorySectionProps) {
  const t = useT();
  const openFileHistory = useProjectStore((s) => s.openFileHistory);
  const projectPreviewMode = useProjectStore((s) => s.projectPreviewMode);
  const fileHistoryPath = useProjectStore((s) => s.fileHistoryPath);
  const [collapsed, setCollapsed] = useState(false);

  const isViewingThisFile =
    projectPreviewMode === "fileHistory" && fileHistoryPath === filePath;

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
        <Button type="button" className="w-full" onClick={handleView}>
          {t("fileHistory.view")}
        </Button>
      ) : null}
    </section>
  );
}
