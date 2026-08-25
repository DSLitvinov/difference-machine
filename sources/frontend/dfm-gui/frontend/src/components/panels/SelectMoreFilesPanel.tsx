import { HeaderRightSide } from "@/components/items/HeaderRightSide";
import { FileInfoPreviewMulti } from "@/components/items/FileInfoPreviewMulti";
import { FilePreviewItemMenu, type FileWorkdirAction } from "@/components/items/FilePreviewItemMenu";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import { formatSize } from "@/lib/format";
import { typeLabel } from "@/lib/file-kind";
import type { DirEntry, FileLock } from "@/store/app-store";

type SelectMoreFilesPanelProps = {
  locale: Locale;
  paths: string[];
  entries: DirEntry[];
  locks: FileLock[];
  onCollapse: () => void;
  onCreateCommit: (paths: string[]) => void;
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
  onCollapse,
  onCreateCommit,
  onFileAction,
}: SelectMoreFilesPanelProps) {
  const copy = t(locale);
  const selected = entries.filter((entry) => paths.includes(entry.path));
  const sum = selected.reduce((total, entry) => total + (entry.size ?? 0), 0);
  const types = [...new Set(selected.map((entry) => typeLabel(entry.name)).filter(Boolean))];
  const locked = paths.length > 0 && paths.every((path) => locks.some((item) => item.file_path === path));
  return (
    <aside className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden">
      <HeaderRightSide locale={locale} onCollapse={onCollapse} />
      <div className="flex min-h-0 flex-1 flex-col justify-between px-3 pb-3">
        <div className="flex min-h-0 flex-col gap-4">
          <FileInfoPreviewMulti />
          <div className="flex min-h-0 flex-col gap-3">
            <p className="text-[14px] font-semibold leading-5 text-foreground">{copy.metadata}</p>
            <div className="flex flex-col gap-1">
              <MetaRow label={copy.sumSizes} value={formatSize(sum)} />
              <MetaRow label={copy.type} value={types.join(", ")} />
            </div>
          </div>
        </div>
        <div className="flex w-full items-center gap-1">
          <Button type="button" variant="primary" className="min-w-0 flex-1" onClick={() => onCreateCommit(paths)}>
            {copy.createCommit}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label={copy.more}>
                <FigmaIcon src="icons/ellipsis.svg" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <FilePreviewItemMenu
              locale={locale}
              locked={locked}
              disableRename={paths.length > 1}
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
