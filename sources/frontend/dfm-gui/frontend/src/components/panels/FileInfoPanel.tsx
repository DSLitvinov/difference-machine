import { useEffect, useState } from "react";
import { HeaderRightSide } from "@/components/items/HeaderRightSide";
import { FileInfoPreview } from "@/components/items/FileInfoPreview";
import { NoFileSelectedPlaceholder } from "@/components/placeholders/NoFileSelectedPlaceholder";
import { MissingFilePlaceholder } from "@/components/placeholders/MissingFilePlaceholder";
import { t, type Locale } from "@/lib/i18n";
import { formatDateTime, formatSize } from "@/lib/format";
import { letterStatus, isMissingPath } from "@/lib/status";
import { typeLabel } from "@/lib/file-kind";
import { foresterCall } from "@/lib/bridge";
import { peekThumb, releaseThumb, requestThumb, useThumbEpoch, type ThumbRequest } from "@/lib/thumb-cache";
import { useAppStore, type FileLock, type StatusSnapshot } from "@/store/app-store";

type FileMetadata = {
  path: string;
  size?: number;
  modified?: number;
  created?: number;
  mime?: string;
  width?: number;
  height?: number;
};

type FileInfoPanelProps = {
  locale: Locale;
  path: string | null;
  status: StatusSnapshot | null;
  locks: FileLock[];
  onCollapse: () => void;
};

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center text-[14px] leading-5 text-foreground">
      <p className="w-[120px] shrink-0">{label}</p>
      <p className="min-w-0 flex-1 truncate">{value}</p>
    </div>
  );
}

export function FileInfoPanel({ locale, path, status, locks, onCollapse }: FileInfoPanelProps) {
  const copy = t(locale);
  const repoPath = useAppStore((s) => s.repoPath);
  const ignored = useAppStore((s) => Boolean(path && s.entries.some((entry) => entry.path === path && entry.ignored)));
  const [meta, setMeta] = useState<FileMetadata | null>(null);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  useThumbEpoch();
  const knownMissing = Boolean(path && isMissingPath(path, status));
  const gone = Boolean(path && failedPath === path);

  useEffect(() => {
    if (!path || knownMissing) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = (await foresterCall("workdir.metadata", { path })) as FileMetadata;
        if (!cancelled) {
          setMeta(result);
          setFailedPath(null);
        }
      } catch {
        if (!cancelled) {
          setMeta(null);
          setFailedPath(path);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, knownMissing]);

  useEffect(() => {
    if (!path || !meta) {
      return;
    }
    const file: ThumbRequest = { path, name: basename(path), size: meta.size ?? 0, mtime: meta.modified ?? 0 };
    requestThumb(repoPath, file);
    return () => {
      releaseThumb(repoPath, file);
    };
  }, [path, meta, repoPath]);

  if (!path) {
    return (
      <aside className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden">
        <HeaderRightSide locale={locale} onCollapse={onCollapse} />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-3">
          <NoFileSelectedPlaceholder locale={locale} />
        </div>
      </aside>
    );
  }

  if (knownMissing || gone) {
    return (
      <aside className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden">
        <HeaderRightSide locale={locale} onCollapse={onCollapse} />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-3">
          <MissingFilePlaceholder locale={locale} />
        </div>
      </aside>
    );
  }

  const name = basename(path);
  const lock = locks.find((item) => item.file_path === path);
  const dimensions = meta?.width && meta?.height ? `${meta.width}x${meta.height}` : "";
  const thumb =
    meta && path
      ? peekThumb(repoPath, { path, name, size: meta.size ?? 0, mtime: meta.modified ?? 0 })
      : undefined;

  return (
    <aside className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden">
      <HeaderRightSide locale={locale} onCollapse={onCollapse} />
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <FileInfoPreview
            name={name}
            src={thumb?.kind === "image" ? thumb.blobUrl : undefined}
            text={thumb?.kind === "text" ? thumb.text : undefined}
            letter={letterStatus(path, status)}
            ignored={ignored}
            locked={Boolean(lock)}
          />
          <div className="flex min-h-0 flex-col gap-3">
            <p className="text-[14px] font-semibold leading-5 text-foreground">{copy.metadata}</p>
            <div className="flex flex-col gap-1">
              <MetaRow label={copy.name} value={name} />
              <MetaRow label={copy.dimensions} value={dimensions} />
              <MetaRow label={copy.size} value={meta?.size != null ? formatSize(meta.size) : ""} />
              <MetaRow label={copy.type} value={typeLabel(name)} />
              <MetaRow label={copy.locked} value={lock?.user ?? ""} />
              <MetaRow label={copy.editor} value="" />
              <MetaRow label={copy.creator} value="" />
              <MetaRow label={copy.created} value={meta?.created ? formatDateTime(meta.created) : ""} />
              <MetaRow label={copy.modifiedAt} value={meta?.modified ? formatDateTime(meta.modified) : ""} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
