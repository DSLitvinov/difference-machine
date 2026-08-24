import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
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

function actionLabel(copy: ReturnType<typeof t>, action: FileWorkdirAction, locked?: boolean): string {
  switch (action.kind) {
    case "addInCommit":
      return copy.addInCommit;
    case "rename":
      return copy.rename;
    case "openInFolder":
      return copy.openInFolder;
    case "editIn":
      return copy.editIn;
    case "toggleLock":
      return locked ? copy.unlock : copy.lock;
    case "deleteInProject":
      return copy.deleteInProject;
  }
}

export function HeaderFileAction({ locale, fileName, collapsed, locked, onBack, onApply, onExpandInfo }: HeaderFileActionProps) {
  const copy = t(locale);
  const [action, setAction] = useState<FileWorkdirAction>({ kind: "addInCommit" });
  return (
    <div className="flex w-full items-center justify-between pb-2 pt-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button type="button" variant="outline" size="icon" aria-label={copy.back} onClick={onBack}>
          <FigmaIcon src="icons/chevron-right.svg" size={16} className="-scale-x-100" />
        </Button>
        <p className="min-w-0 flex-1 truncate text-center text-[14px] font-medium leading-5 text-foreground">{fileName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-[200px] items-center gap-2 rounded-[6px] border border-border bg-background px-4 py-2.5 text-left shadow-sm"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-foreground">
                {actionLabel(copy, action, locked)}
              </span>
              <FigmaIcon src="icons/chevrons-up-down.svg" size={20} />
            </button>
          </DropdownMenuTrigger>
          <FilePreviewItemMenu
            locale={locale}
            locked={locked}
            align="end"
            onAddInCommit={() => setAction({ kind: "addInCommit" })}
            onRename={() => setAction({ kind: "rename" })}
            onOpenInFolder={() => setAction({ kind: "openInFolder" })}
            onEditIn={(editor) => setAction({ kind: "editIn", editor })}
            onToggleLock={() => setAction({ kind: "toggleLock" })}
            onDeleteInProject={() => setAction({ kind: "deleteInProject" })}
          />
        </DropdownMenu>
        <Button type="button" onClick={() => onApply(action)}>
          {copy.apply}
        </Button>
        {collapsed ? (
          <>
            <div className="h-5 w-px bg-border" />
            <Button type="button" variant="secondary" size="icon" aria-label={copy.expand} onClick={onExpandInfo}>
              <FigmaIcon src="icons/panel-right-open.svg" size={16} />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
