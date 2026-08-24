import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import chevronRight from "@/assets/icons/chevron-right.svg";
import searchIcon from "@/assets/icons/search.svg";
import sortIcon from "@/assets/icons/arrow-up-a-z.svg";
import filterIcon from "@/assets/icons/filter.svg";
import panelRightOpen from "@/assets/icons/panel-right-open.svg";

type HeaderFolderActionProps = {
  locale: Locale;
  folderPath: string;
  collapsed?: boolean;
  onNavigate: (path: string) => void;
  onExpandInfo?: () => void;
};

export function HeaderFolderAction({ locale, folderPath, collapsed, onNavigate, onExpandInfo }: HeaderFolderActionProps) {
  const copy = t(locale);
  const parts = folderPath.split("/").filter(Boolean);
  return (
    <div className="flex w-full items-center justify-between pb-2 pt-3">
      <div className="flex min-w-0 items-center gap-3">
        {parts.length === 0 ? (
          <p className="text-[18px] leading-7 text-foreground">{copy.home}</p>
        ) : (
          <button type="button" className="text-[18px] leading-7 text-foreground" onClick={() => onNavigate("")}>
            {copy.home}
          </button>
        )}
        <FigmaIcon src={chevronRight} size={24} />
        {parts.map((part, index) => {
          const path = parts.slice(0, index + 1).join("/");
          const last = index === parts.length - 1;
          return (
            <div key={path} className="flex min-w-0 items-center gap-3">
              {last ? (
                <p className="truncate text-[18px] leading-7 text-foreground">{part}</p>
              ) : (
                <button type="button" className="truncate text-[18px] leading-7 text-foreground" onClick={() => onNavigate(path)}>
                  {part}
                </button>
              )}
              {last ? null : <FigmaIcon src={chevronRight} size={24} />}
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="secondary" size="icon" aria-label="Search">
            <FigmaIcon src={searchIcon} size={16} />
          </Button>
          <Button type="button" variant="secondary" size="icon" aria-label="Sort">
            <FigmaIcon src={sortIcon} size={16} />
          </Button>
          <Button type="button" variant="secondary" size="icon" aria-label="Filter">
            <FigmaIcon src={filterIcon} size={16} />
          </Button>
        </div>
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
