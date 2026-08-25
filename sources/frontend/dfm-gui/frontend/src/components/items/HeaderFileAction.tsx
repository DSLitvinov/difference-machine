import { ChevronRight, Ellipsis, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { FilePreviewItemMenu, type FileWorkdirAction } from "@/components/items/FilePreviewItemMenu";
import { t, type Locale } from "@/lib/i18n";

export type { FileWorkdirAction };

type HeaderFileActionProps = {
  locale: Locale;
  fileName: string;
  collapsed?: boolean;
  locked?: boolean;
  onBack: () => void;
  onApply: (action: FileWorkdirAction) => void;
  onExpandInfo?: () => void;
};

export function HeaderFileAction({ locale, fileName, collapsed, locked, onBack, onApply, onExpandInfo }: HeaderFileActionProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center justify-between pb-2 pt-3">
      <Button type="button" variant="outline" size="icon" aria-label={copy.back} onClick={onBack}>
        <Icon icon={ChevronRight} size={16} className="-scale-x-100" />
      </Button>
      <p className="min-w-0 flex-1 truncate text-center text-[14px] font-medium leading-5 text-foreground">{fileName}</p>
      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label={copy.more}>
              <Icon icon={Ellipsis} size={16} />
            </Button>
          </DropdownMenuTrigger>
          <FilePreviewItemMenu
            locale={locale}
            locked={locked}
            align="end"
            onAddInCommit={() => onApply({ kind: "addInCommit" })}
            onRename={() => onApply({ kind: "rename" })}
            onOpenInFolder={() => onApply({ kind: "openInFolder" })}
            onEditIn={(editor) => onApply({ kind: "editIn", editor })}
            onToggleLock={() => onApply({ kind: "toggleLock" })}
            onDeleteInProject={() => onApply({ kind: "deleteInProject" })}
          />
        </DropdownMenu>
        {collapsed ? (
          <>
            <div className="h-5 w-px bg-border" />
            <Button type="button" variant="secondary" size="icon" aria-label={copy.expand} onClick={onExpandInfo}>
              <Icon icon={PanelRightOpen} size={16} />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
