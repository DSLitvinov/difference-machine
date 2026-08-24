import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { SortMenu } from "@/components/items/SortMenu";
import { FiltersMenu } from "@/components/items/FiltersMenu";
import type { GridFilter, GridSort } from "@/lib/folder-query";
import searchIcon from "@/assets/icons/search.svg";

type FolderActionBarProps = {
  collapsed?: boolean;
  searchOpen: boolean;
  query: string;
  sort: GridSort;
  filter: GridFilter;
  extensions: string[];
  onSearchOpen: () => void;
  onQuery: (value: string) => void;
  onSearchEscape: () => void;
  onSort: (value: GridSort) => void;
  onFilter: (value: GridFilter) => void;
};

export function FolderActionBar({
  collapsed,
  searchOpen,
  query,
  sort,
  filter,
  extensions,
  onSearchOpen,
  onQuery,
  onSearchEscape,
  onSort,
  onFilter,
}: FolderActionBarProps) {
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
          <FigmaIcon src={searchIcon} size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            ref={inputRef}
            value={query}
            placeholder="Search "
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
        <Button type="button" variant="secondary" size="icon" aria-label="Search" onClick={onSearchOpen}>
          <FigmaIcon src={searchIcon} size={16} />
        </Button>
      )}
      <SortMenu value={sort} onChange={onSort} />
      <FiltersMenu value={filter} extensions={extensions} onChange={onFilter} />
    </div>
  );
}
