import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { SortMenu } from "@/components/items/SortMenu";
import { FiltersMenu } from "@/components/items/FiltersMenu";
import type { GridFilter, GridSort } from "@/lib/folder-query";
import { t, type Locale } from "@/lib/i18n";

type FolderActionBarProps = {
  locale: Locale;
  collapsed?: boolean;
  searchOpen: boolean;
  query: string;
  sort: GridSort;
  filter: GridFilter;
  extensions: string[];
  changedOnly: boolean;
  dirty: boolean;
  onSearchOpen: () => void;
  onQuery: (value: string) => void;
  onSearchEscape: () => void;
  onSort: (value: GridSort) => void;
  onFilter: (value: GridFilter) => void;
  onChangedOnly: (value: boolean) => void;
};

export function FolderActionBar({
  locale,
  collapsed,
  searchOpen,
  query,
  sort,
  filter,
  extensions,
  changedOnly,
  dirty,
  onSearchOpen,
  onQuery,
  onSearchEscape,
  onSort,
  onFilter,
  onChangedOnly,
}: FolderActionBarProps) {
  const copy = t(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const showSearch = searchOpen && !collapsed;

  useEffect(() => {
    if (showSearch) {
      inputRef.current?.focus();
    }
  }, [showSearch]);

  return (
    <div className="flex items-center gap-1">
      {showSearch ? (
        <div className="relative w-[300px]">
          <FigmaIcon src="icons/search.svg" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            ref={inputRef}
            value={query}
            placeholder={copy.searchPlaceholder}
            className="pl-10"
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onSearchEscape();
              }
            }}
          />
        </div>
      ) : (
        <Button type="button" variant="secondary" size="icon" aria-label={copy.search} onClick={onSearchOpen}>
          <FigmaIcon src="icons/search.svg" size={16} />
        </Button>
      )}
      <SortMenu locale={locale} value={sort} onChange={onSort} />
      <FiltersMenu
        locale={locale}
        value={filter}
        extensions={extensions}
        changedOnly={changedOnly}
        dirty={dirty}
        onChange={onFilter}
        onChangedOnly={onChangedOnly}
      />
    </div>
  );
}
