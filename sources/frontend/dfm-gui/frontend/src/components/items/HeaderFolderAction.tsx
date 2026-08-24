import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { FolderActionBar } from "@/components/items/FolderActionBar";
import { t, type Locale } from "@/lib/i18n";
import type { GridFilter, GridSort } from "@/lib/folder-query";
import chevronRight from "@/assets/icons/chevron-right.svg";
import panelRightOpen from "@/assets/icons/panel-right-open.svg";

type HeaderFolderActionProps = {
  locale: Locale;
  folderPath: string;
  collapsed?: boolean;
  searchOpen: boolean;
  query: string;
  sort: GridSort;
  filter: GridFilter;
  extensions: string[];
  onNavigate: (path: string) => void;
  onExpandInfo?: () => void;
  onSearchOpen: () => void;
  onQuery: (value: string) => void;
  onSearchEscape: () => void;
  onSort: (value: GridSort) => void;
  onFilter: (value: GridFilter) => void;
};

export function HeaderFolderAction({
  locale,
  folderPath,
  collapsed,
  searchOpen,
  query,
  sort,
  filter,
  extensions,
  onNavigate,
  onExpandInfo,
  onSearchOpen,
  onQuery,
  onSearchEscape,
  onSort,
  onFilter,
}: HeaderFolderActionProps) {
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
        <FolderActionBar
          collapsed={collapsed}
          searchOpen={searchOpen}
          query={query}
          sort={sort}
          filter={filter}
          extensions={extensions}
          onSearchOpen={onSearchOpen}
          onQuery={onQuery}
          onSearchEscape={onSearchEscape}
          onSort={onSort}
          onFilter={onFilter}
        />
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
