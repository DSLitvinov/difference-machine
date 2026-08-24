import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import type { GridSort } from "@/lib/folder-query";
import sortIcon from "@/assets/icons/arrow-up-a-z.svg";

type SortMenuProps = {
  value: GridSort;
  onChange: (value: GridSort) => void;
};

export function SortMenu({ value, onChange }: SortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" size="icon" aria-label="Sort">
          <FigmaIcon src={sortIcon} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] shadow-md">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as GridSort)}>
          <DropdownMenuRadioItem value="az">A-Z</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ru">А-Я</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as GridSort)}>
          <DropdownMenuRadioItem value="modified">Date modified</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="created">Date created</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
