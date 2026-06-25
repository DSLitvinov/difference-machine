import { FileArchive, FileCode, FileImage, Loader2 } from "lucide-react";

import { useWorkdirPreview } from "@/hooks/useWorkdirPreview";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { vcsStatusBadgeClass } from "@/lib/vcsBadge";
import type { InfoPreviewKind } from "@/lib/fileKinds";
import type { VcsFileStatus } from "@/wails/forester";
import { vcsBadgeLabel } from "@/wails/forester";

interface InfoFilePreviewSingleProps {
  path: string;
  vcsStatus: VcsFileStatus | null;
  lockUser: string | null;
  kind: InfoPreviewKind;
  loading?: boolean;
}

function PreviewStub({ kind }: { kind: InfoPreviewKind }) {
  if (kind === "image") {
    return <FileImage className="h-12 w-12 text-muted-foreground" />;
  }
  if (kind === "text") {
    return <FileCode className="h-12 w-12 text-muted-foreground" />;
  }
  if (kind === "blend") {
    return <FileArchive className="h-12 w-12 text-muted-foreground" />;
  }
  return <FileArchive className="h-12 w-12 text-muted-foreground" />;
}

export function InfoFilePreviewSingle({
  path,
  vcsStatus,
  lockUser,
  kind,
  loading: metadataLoading,
}: InfoFilePreviewSingleProps) {
  const t = useT();
  const statusLabel = vcsStatus ? vcsBadgeLabel(vcsStatus) : null;
  const dimmed = vcsStatus === "deleted" || vcsStatus === "staged-deleted";
  const { previewUrl, textPreview } = useWorkdirPreview(dimmed ? null : path, kind);

  return (
    <div className="relative mx-auto flex h-[200px] w-full max-w-[312px] items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className={cn(
            "h-full w-full",
            kind === "blend" ? "object-contain" : "object-cover",
            dimmed && "opacity-50",
          )}
          draggable={false}
        />
      ) : metadataLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : textPreview && kind === "text" ? (
        <pre className="max-h-full w-full overflow-auto p-3 text-left font-mono text-[11px] leading-relaxed text-foreground">
          {textPreview}
        </pre>
      ) : (
        <PreviewStub kind={kind} />
      )}
      {statusLabel && vcsStatus ? (
        <span
          className={cn(
            "absolute bottom-2 left-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
            vcsStatusBadgeClass(vcsStatus),
          )}
          title={vcsStatus}
        >
          {statusLabel}
        </span>
      ) : null}
      {lockUser ? (
        <span
          className="absolute bottom-2 right-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          title={t("info.lockedBy", { user: lockUser })}
        >
          {t("info.lock")}
        </span>
      ) : null}
    </div>
  );
}
