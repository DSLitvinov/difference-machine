import { useEffect } from "react";
import { HeaderFileAction } from "@/components/items/HeaderFileAction";
import { ContentViewImg } from "@/components/items/ContentViewImg";
import { ContentViewText } from "@/components/items/ContentViewText";
import { ContentViewBinary } from "@/components/items/ContentViewBinary";
import { fileKind } from "@/lib/file-kind";
import { peekThumb, releaseThumb, requestThumb, useThumbEpoch, type ThumbRequest } from "@/lib/thumb-cache";
import type { Locale } from "@/lib/i18n";
import type { DirEntry } from "@/store/app-store";

type ContentFilePanelProps = {
  locale: Locale;
  repoPath: string;
  path: string;
  entries: DirEntry[];
  collapsed?: boolean;
  onBack: () => void;
  onApply: () => void;
  onExpandInfo?: () => void;
  onOpenExternal: () => void;
};

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function viewKind(name: string, thumb: ReturnType<typeof peekThumb>): "image" | "text" | "binary" {
  if (thumb?.kind === "image") {
    return "image";
  }
  if (thumb?.kind === "text") {
    return "text";
  }
  const expected = fileKind(name);
  if (expected === "text") {
    return "text";
  }
  if (expected === "image" || expected === "blend") {
    return "image";
  }
  return "binary";
}

function asThumbRequest(path: string, entries: DirEntry[]): ThumbRequest {
  const entry = entries.find((item) => item.path === path);
  return {
    path,
    name: basename(path),
    size: entry?.size ?? 0,
    mtime: entry?.modified ?? 0,
  };
}

export function ContentFilePanel({
  locale,
  repoPath,
  path,
  entries,
  collapsed,
  onBack,
  onApply,
  onExpandInfo,
  onOpenExternal,
}: ContentFilePanelProps) {
  const file = asThumbRequest(path, entries);
  useThumbEpoch();

  useEffect(() => {
    requestThumb(repoPath, file);
    return () => {
      releaseThumb(repoPath, file);
    };
  }, [repoPath, file.path, file.size, file.mtime]);

  const thumb = peekThumb(repoPath, file);
  const kind = viewKind(file.name, thumb);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pb-3 pl-2 pr-3">
      <HeaderFileAction
        locale={locale}
        fileName={file.name}
        collapsed={collapsed}
        onBack={onBack}
        onApply={onApply}
        onExpandInfo={onExpandInfo}
      />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background p-4 shadow-sm">
        {kind === "image" ? (
          <ContentViewImg src={thumb?.kind === "image" ? thumb.blobUrl : undefined} />
        ) : kind === "text" ? (
          <ContentViewText text={thumb?.kind === "text" ? thumb.text : ""} />
        ) : (
          <ContentViewBinary locale={locale} onOpen={onOpenExternal} />
        )}
      </div>
    </section>
  );
}
