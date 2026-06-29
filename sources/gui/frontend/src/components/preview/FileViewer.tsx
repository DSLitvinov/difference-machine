import { ChevronLeft } from "lucide-react";

import { InfoFilePreviewSingle } from "@/components/info/InfoFilePreviewSingle";
import { Button } from "@/components/ui/button";
import { classifyInfoPreview } from "@/lib/fileKinds";
import { useT } from "@/lib/i18n";
import { useProjectStore } from "@/stores/projectStore";
import { vcsFileStatus } from "@/wails/forester";

interface FileViewerProps {
  filePath: string;
  onBack: () => void;
}

export function FileViewer({ filePath, onBack }: FileViewerProps) {
  const t = useT();
  const status = useProjectStore((s) => s.status);
  const lockedByPath = useProjectStore((s) => s.lockedByPath);

  const vcsStatus = vcsFileStatus(filePath, status);
  const kind = classifyInfoPreview(filePath);
  const lockUser = lockedByPath[filePath] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          title={t("fileViewer.back")}
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        <InfoFilePreviewSingle
          path={filePath}
          vcsStatus={vcsStatus}
          lockUser={lockUser}
          kind={kind}
          variant="expanded"
        />
      </div>
    </div>
  );
}
