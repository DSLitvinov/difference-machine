import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/chrome/Icon";
import { SortMenu } from "@/components/items/SortMenu";
import { FiltersMenu } from "@/components/items/FiltersMenu";
import type { GridFilter, GridSort } from "@/lib/folder-query";
import { t, type Locale } from "@/lib/i18n";

type FolderActionBarProps = {
  locale: Locale;
  searchOpen: boolean;
  query: string;
  sort: GridSort;
  filter: GridFilter;
  extensions: string[];
  changedOnly: boolean;
  viewIgnored: boolean;
  dirty: boolean;
  onSearchOpen: () => void;
  onQuery: (value: string) => void;
  onSearchEscape: () => void;
  onSort: (value: GridSort) => void;
  onFilter: (value: GridFilter) => void;
  onChangedOnly: (value: boolean) => void;
  onViewIgnored: (value: boolean) => void;
};

export function FolderActionBar({
  locale,
  searchOpen,
  query,
  sort,
  filter,
  extensions,
  changedOnly,
  viewIgnored,
  dirty,
  onSearchOpen,
  onQuery,
  onSearchEscape,
  onSort,
  onFilter,
  onChangedOnly,
  onViewIgnored,
}: FolderActionBarProps) {
  const copy = t(locale);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <div className="flex items-center gap-1">
      {searchOpen ? (
        <div className="relative w-[300px]">
          <Icon icon={Search} size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
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
          <Icon icon={Search} size={16} />
        </Button>
      )}
      <SortMenu locale={locale} value={sort} onChange={onSort} />
      <FiltersMenu
        locale={locale}
        value={filter}
        extensions={extensions}
        changedOnly={changedOnly}
        viewIgnored={viewIgnored}
        dirty={dirty}
        onChange={onFilter}
        onChangedOnly={onChangedOnly}
        onViewIgnored={onViewIgnored}
      />
    </div>
  );
}
