import { Ellipsis } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { CreateCommitCard, type CreateCommitFields } from "@/components/atoms/CreateCommitCard";
import { HeaderRightSide } from "@/components/items/HeaderRightSide";
import { FileInfoPreviewMulti } from "@/components/items/FileInfoPreviewMulti";
import { FilePreviewItemMenu, type FileWorkdirAction } from "@/components/items/FilePreviewItemMenu";
import { SidebarCardDirectory } from "@/components/items/SidebarCardDirectory";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";
import { formatSize } from "@/lib/format";
import { typeLabel } from "@/lib/file-kind";
import type { DirEntry, FileLock } from "@/store/app-store";

type SelectMoreFilesPanelProps = {
  locale: Locale;
  paths: string[];
  entries: DirEntry[];
  locks: FileLock[];
  disableUnstage?: boolean;
  composerOpen?: boolean;
  busy?: boolean;
  onCollapse: () => void;
  onCreateCommit: (paths: string[]) => void;
  onCancelComposer: () => void;
  onComposerCreate: (fields: CreateCommitFields) => void;
  onFileAction: (action: FileWorkdirAction) => void;
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center text-[14px] leading-5 text-foreground">
      <p className="w-[120px] shrink-0">{label}</p>
      <p className="min-w-0 flex-1 truncate">{value}</p>
    </div>
  );
}

export function SelectMoreFilesPanel({
  locale,
  paths,
  entries,
  locks,
  disableUnstage,
  composerOpen,
  busy,
  onCollapse,
  onCreateCommit,
  onCancelComposer,
  onComposerCreate,
  onFileAction,
}: SelectMoreFilesPanelProps) {
  const copy = t(locale);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = entries.filter((entry) => paths.includes(entry.path));
  const sum = selected.reduce((total, entry) => total + (entry.size ?? 0), 0);
  const types = [...new Set(selected.map((entry) => typeLabel(entry.name)).filter(Boolean))];
  const locked = paths.length > 0 && paths.every((path) => locks.some((item) => item.file_path === path));
  const ignored = paths.length > 0 && paths.every((path) => selected.some((entry) => entry.path === path && entry.ignored));

  useLayoutEffect(() => {
    if (!composerOpen) {
      return;
    }
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [composerOpen]);

  return (
    <aside className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden">
      <HeaderRightSide locale={locale} onCollapse={onCollapse} />
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <FileInfoPreviewMulti />
          <div className="flex min-h-0 flex-col gap-3">
            <p className="text-[14px] font-semibold leading-5 text-foreground">{copy.metadata}</p>
            <div className="flex flex-col gap-1">
              <MetaRow label={copy.sumSizes} value={formatSize(sum)} />
              <MetaRow label={copy.type} value={types.join(", ")} />
            </div>
          </div>
        </div>
        {composerOpen ? (
          <div className="w-full shrink-0">
            <SidebarCardDirectory state="selected">
              <CreateCommitCard locale={locale} busy={busy} onCancel={onCancelComposer} onCreate={onComposerCreate} />
            </SidebarCardDirectory>
          </div>
        ) : (
          <div className="flex w-full shrink-0 items-center gap-1">
            <Button type="button" variant="primary" className="min-w-0 flex-1" onClick={() => onCreateCommit(paths)}>
              {copy.createCommit}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label={copy.more}>
                  <Icon icon={Ellipsis} size={16} />
                </Button>
              </DropdownMenuTrigger>
              <FilePreviewItemMenu
                locale={locale}
                locked={locked}
                ignored={ignored}
                disableRename={paths.length > 1}
                disableUnstage={disableUnstage}
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
