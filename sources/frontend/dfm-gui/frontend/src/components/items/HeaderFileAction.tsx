import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import chevronRight from "@/assets/icons/chevron-right.svg";
import chevronsUpDown from "@/assets/icons/chevrons-up-down.svg";
import panelRightOpen from "@/assets/icons/panel-right-open.svg";

type HeaderFileActionProps = {
  locale: Locale;
  fileName: string;
  collapsed?: boolean;
  onBack: () => void;
  onApply: () => void;
  onExpandInfo?: () => void;
};

export function HeaderFileAction({ locale, fileName, collapsed, onBack, onApply, onExpandInfo }: HeaderFileActionProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center justify-between pb-2 pt-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button type="button" variant="outline" size="icon" aria-label="Back" onClick={onBack}>
          <FigmaIcon src={chevronRight} size={16} className="-scale-x-100" />
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
              <span className="min-w-0 flex-1 text-[14px] font-medium leading-5 text-foreground">{copy.addInCommit}</span>
              <FigmaIcon src={chevronsUpDown} size={20} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem>{copy.addInCommit}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" onClick={onApply}>
          {copy.apply}
        </Button>
        {collapsed ? (
          <>
            <div className="h-5 w-px bg-border" />
            <Button type="button" variant="secondary" size="icon" aria-label="Expand" onClick={onExpandInfo}>
              <FigmaIcon src={panelRightOpen} size={16} />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
