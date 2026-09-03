import { ChevronDown, Ellipsis } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CreateCommitCard, type CreateCommitFields } from "@/components/atoms/CreateCommitCard";
import { HeaderRightSide } from "@/components/items/HeaderRightSide";
import { FileInfoPreview } from "@/components/items/FileInfoPreview";
import { FilePreviewItemMenu, type FileWorkdirAction } from "@/components/items/FilePreviewItemMenu";
import { SidebarCardDirectory } from "@/components/items/SidebarCardDirectory";
import { NoFileSelectedPlaceholder } from "@/components/placeholders/NoFileSelectedPlaceholder";
import { MissingFilePlaceholder } from "@/components/placeholders/MissingFilePlaceholder";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";
import { formatDateTime, formatSize } from "@/lib/format";
import { letterStatus, isMissingPath, isStagedPath } from "@/lib/status";
import { typeLabel } from "@/lib/file-kind";
import { foresterCall } from "@/lib/bridge";
import { useExternalEditors } from "@/lib/editors";
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
  composerOpen?: boolean;
  busy?: boolean;
  onCollapse: () => void;
  onFileAction: (action: FileWorkdirAction) => void;
  onCancelComposer: () => void;
  onCreateCommit: (fields: CreateCommitFields) => void;
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

export function FileInfoPanel({
  locale,
  path,
  status,
  locks,
  composerOpen,
  busy,
  onCollapse,
  onFileAction,
  onCancelComposer,
  onCreateCommit,
}: FileInfoPanelProps) {
  const copy = t(locale);
  const repoPath = useAppStore((s) => s.repoPath);
  const ignored = useAppStore((s) => Boolean(path && s.entries.some((entry) => entry.path === path && entry.ignored)));
  const [meta, setMeta] = useState<FileMetadata | null>(null);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const editors = useExternalEditors();
  const scrollRef = useRef<HTMLDivElement>(null);
  useThumbEpoch();
  const knownMissing = Boolean(path && isMissingPath(path, status));
  const gone = Boolean(path && failedPath === path);

  useLayoutEffect(() => {
    if (!composerOpen) {
      return;
    }
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [composerOpen]);

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
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <MissingFilePlaceholder locale={locale} />
          </div>
          {composerOpen ? (
            <div className="w-full shrink-0">
              <SidebarCardDirectory state="selected">
                <CreateCommitCard locale={locale} busy={busy} onCancel={onCancelComposer} onCreate={onCreateCommit} />
              </SidebarCardDirectory>
            </div>
          ) : null}
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
        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
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
        {composerOpen ? (
          <div className="w-full shrink-0">
            <SidebarCardDirectory state="selected">
              <CreateCommitCard locale={locale} busy={busy} onCancel={onCancelComposer} onCreate={onCreateCommit} />
            </SidebarCardDirectory>
          </div>
        ) : (
          <div className="flex w-full shrink-0 items-center gap-1">
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
                ignored={ignored}
                disableUnstage={!isStagedPath(path, status)}
                align="end"
                onCreateCommit={() => onFileAction({ kind: "createCommit" })}
                onAddInCommit={() => onFileAction({ kind: "addInCommit" })}
                onUnstage={() => onFileAction({ kind: "unstage" })}
                onIgnore={() => onFileAction({ kind: "ignore" })}
                onUnignore={() => onFileAction({ kind: "unignore" })}
                onRename={() => onFileAction({ kind: "rename" })}
                onOpenInFolder={() => onFileAction({ kind: "openInFolder" })}
                onEditIn={(editor) => onFileAction({ kind: "editIn", editor })}
                onToggleLock={() => onFileAction({ kind: "toggleLock" })}
                onDeleteInProject={() => onFileAction({ kind: "deleteInProject" })}
              />
            </DropdownMenu>
          </div>
        )}
      </div>
    </aside>
  );
}
