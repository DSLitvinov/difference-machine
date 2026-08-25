import { useEffect, useState } from "react";
import { HeaderFileAction, type FileWorkdirAction } from "@/components/items/HeaderFileAction";
import { ContentViewImg } from "@/components/items/ContentViewImg";
import { ContentViewText } from "@/components/items/ContentViewText";
import { ContentViewBinary } from "@/components/items/ContentViewBinary";
import { fileKind, isRasterWorkdirImage } from "@/lib/file-kind";
import { foresterCall } from "@/lib/bridge";
import { peekThumb, releaseThumb, requestThumb, useThumbEpoch, type ThumbRequest } from "@/lib/thumb-cache";
import type { Locale } from "@/lib/i18n";
import type { DirEntry } from "@/store/app-store";

type ContentFilePanelProps = {
  locale: Locale;
  repoPath: string;
  path: string;
  entries: DirEntry[];
  collapsed?: boolean;
  locked?: boolean;
  onBack: () => void;
  onApply: (action: FileWorkdirAction) => void;
  onExpandInfo?: () => void;
  onOpenExternal: () => void;
};

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function viewKind(name: string, thumb: ReturnType<typeof peekThumb>): "image" | "text" | "binary" {
  if (isRasterWorkdirImage(name)) {
    return "image";
  }
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

function blobUrlFromBase64(b64: string, mime: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime || "application/octet-stream" }));
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
  locked,
  onBack,
  onApply,
  onExpandInfo,
  onOpenExternal,
}: ContentFilePanelProps) {
  const file = asThumbRequest(path, entries);
  const fullImage = isRasterWorkdirImage(file.name);
  useThumbEpoch();
  const [imageSrc, setImageSrc] = useState<string>();

  useEffect(() => {
    if (fullImage) {
      return;
    }
    requestThumb(repoPath, file);
    return () => {
      releaseThumb(repoPath, file);
    };
  }, [repoPath, file.path, file.size, file.mtime, fullImage]);

  useEffect(() => {
    if (!fullImage) {
      setImageSrc(undefined);
      return;
    }
    let cancelled = false;
    let url = "";
    void (async () => {
      try {
        const result = (await foresterCall("workdir.file", { path })) as { content_base64?: string; mime?: string };
        if (cancelled || !result.content_base64) {
          return;
        }
        const created = blobUrlFromBase64(result.content_base64, result.mime || "application/octet-stream");
        if (cancelled) {
          URL.revokeObjectURL(created);
          return;
        }
        url = created;
        setImageSrc(created);
      } catch {
        if (!cancelled) {
          setImageSrc(undefined);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
      setImageSrc(undefined);
    };
  }, [fullImage, path, repoPath]);

  const thumb = peekThumb(repoPath, file);
  const kind = viewKind(file.name, thumb);
  const imgSrc = fullImage ? imageSrc : thumb?.kind === "image" ? thumb.blobUrl : undefined;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pb-3 pl-2 pr-3">
      <HeaderFileAction
        key={path}
        locale={locale}
        fileName={file.name}
        collapsed={collapsed}
        locked={locked}
        onBack={onBack}
        onApply={onApply}
        onExpandInfo={onExpandInfo}
      />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background p-4 shadow-sm">
        {kind === "image" ? (
          <ContentViewImg src={imgSrc} />
        ) : kind === "text" ? (
          <ContentViewText fileName={file.name} text={thumb?.kind === "text" ? thumb.text : ""} />
        ) : (
          <ContentViewBinary locale={locale} onOpen={onOpenExternal} />
        )}
      </div>
    </section>
  );
}
