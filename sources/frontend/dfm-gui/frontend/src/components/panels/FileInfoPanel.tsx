import { ChevronDown, Ellipsis } from "lucide-react";
import { useEffect, useState } from "react";
import { HeaderRightSide } from "@/components/items/HeaderRightSide";
import { FileInfoPreview } from "@/components/items/FileInfoPreview";
import { FilePreviewItemMenu, type FileWorkdirAction } from "@/components/items/FilePreviewItemMenu";
import { NoFileSelectedPlaceholder } from "@/components/placeholders/NoFileSelectedPlaceholder";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";
import { formatDateTime, formatSize } from "@/lib/format";
import { letterStatus } from "@/lib/status";
import { typeLabel } from "@/lib/file-kind";
import { foresterCall } from "@/lib/bridge";
import { loadExternalEditors, type ExternalEditor } from "@/lib/editors";
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
  onFileAction: (action: FileWorkdirAction) => void;
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

export function FileInfoPanel({ locale, path, status, locks, onCollapse, onFileAction }: FileInfoPanelProps) {
  const copy = t(locale);
  const repoPath = useAppStore((s) => s.repoPath);
  const [meta, setMeta] = useState<FileMetadata | null>(null);
  const [editors, setEditors] = useState<ExternalEditor[]>([]);
  useThumbEpoch();

  useEffect(() => {
    void loadExternalEditors().then(setEditors);
  }, []);

  useEffect(() => {
    if (!path) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = (await foresterCall("workdir.metadata", { path })) as FileMetadata;
        if (!cancelled) {
          setMeta(result);
        }
      } catch {
        if (!cancelled) {
          setMeta(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

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
      <div className="flex min-h-0 flex-1 flex-col justify-between px-3 pb-3">
        <div className="flex min-h-0 flex-col gap-4">
          <FileInfoPreview
            name={name}
            src={thumb?.kind === "image" ? thumb.blobUrl : undefined}
            text={thumb?.kind === "text" ? thumb.text : undefined}
            letter={letterStatus(path, status)}
            locked={Boolean(lock)}
          />
          <div className="flex min-h-0 flex-col gap-3">
            <p className="text-[14px] font-semibold leading-5 text-foreground">{copy.metadata}</p>
            <div className="flex flex-col gap-1 overflow-y-auto">
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
        <div className="flex w-full items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="min-w-0 flex-1">
                {copy.fileEdit}
                <Icon icon={ChevronDown} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[264px]">
              {editors.map((editor) => (
                <DropdownMenuItem key={editor.path} onSelect={() => onFileAction({ kind: "editIn", editor: editor.path })}>
                  {editor.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label={copy.more}>
                <Icon icon={Ellipsis} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <FilePreviewItemMenu
              locale={locale}
              locked={Boolean(lock)}
              align="end"
              onAddInCommit={() => onFileAction({ kind: "addInCommit" })}
              onRename={() => onFileAction({ kind: "rename" })}
              onOpenInFolder={() => onFileAction({ kind: "openInFolder" })}
              onEditIn={(editor) => onFileAction({ kind: "editIn", editor })}
              onToggleLock={() => onFileAction({ kind: "toggleLock" })}
              onDeleteInProject={() => onFileAction({ kind: "deleteInProject" })}
            />
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
