import { ArrowUpAZ } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";
import type { GridSort } from "@/lib/folder-query";

type SortMenuProps = {
  locale: Locale;
  value: GridSort;
  onChange: (value: GridSort) => void;
};

export function SortMenu({ locale, value, onChange }: SortMenuProps) {
  const copy = t(locale);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" size="icon" aria-label={copy.sort}>
          <Icon icon={ArrowUpAZ} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] shadow-md">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as GridSort)}>
          <DropdownMenuRadioItem value="az">A-Z</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ru">А-Я</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as GridSort)}>
          <DropdownMenuRadioItem value="modified">{copy.dateModified}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="created">{copy.dateCreated}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
