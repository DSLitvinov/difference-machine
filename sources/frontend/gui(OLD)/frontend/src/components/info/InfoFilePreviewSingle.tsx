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
  /** `expanded` — File Viewer center panel (no badges, fills area). */
  variant?: "compact" | "expanded";
}

function PreviewStub({ kind, large }: { kind: InfoPreviewKind; large?: boolean }) {
  const iconClass = large ? "h-16 w-16" : "h-12 w-12";
  if (kind === "image") {
    return <FileImage className={cn(iconClass, "text-muted-foreground")} />;
  }
  if (kind === "text") {
    return <FileCode className={cn(iconClass, "text-muted-foreground")} />;
  }
  if (kind === "blend") {
    return <FileArchive className={cn(iconClass, "text-muted-foreground")} />;
  }
  return <FileArchive className={cn(iconClass, "text-muted-foreground")} />;
}

export function InfoFilePreviewSingle({
  path,
  vcsStatus,
  lockUser,
  kind,
  loading: metadataLoading,
  variant = "compact",
}: InfoFilePreviewSingleProps) {
  const t = useT();
  const expanded = variant === "expanded";
  const statusLabel = vcsStatus ? vcsBadgeLabel(vcsStatus) : null;
  const dimmed = vcsStatus === "deleted" || vcsStatus === "staged-deleted";
  const { previewUrl, textPreview } = useWorkdirPreview(dimmed ? null : path, kind);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30",
        expanded
          ? "h-full min-h-[200px] w-full max-h-full"
          : "mx-auto h-[200px] w-full max-w-[312px]",
      )}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className={cn(
            "h-full w-full",
            kind === "blend" ? "object-contain" : expanded ? "object-contain" : "object-cover",
            dimmed && "opacity-50",
          )}
          draggable={false}
        />
      ) : metadataLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : textPreview && kind === "text" ? (
        <pre
          className={cn(
            "max-h-full w-full overflow-auto p-3 text-left font-mono leading-relaxed text-foreground",
            expanded ? "text-sm" : "text-[11px]",
          )}
        >
          {textPreview}
        </pre>
      ) : (
        <PreviewStub kind={kind} large={expanded} />
      )}
      {!expanded && statusLabel && vcsStatus ? (
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
      {!expanded && lockUser ? (
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
