import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { fileKind } from "@/lib/file-kind";
import { t, type Locale } from "@/lib/i18n";
import type { GridFilter } from "@/lib/folder-query";

const kindIcon = {
  image: "icons/image.svg",
  text: "icons/file-text.svg",
  blend: "icons/binary.svg",
  binary: "icons/binary.svg",
} as const;

type FiltersMenuProps = {
  locale: Locale;
  value: GridFilter;
  extensions: string[];
  changedOnly: boolean;
  dirty: boolean;
  onChange: (value: GridFilter) => void;
  onChangedOnly: (value: boolean) => void;
};

export function FiltersMenu({
  locale,
  value,
  extensions,
  changedOnly,
  dirty,
  onChange,
  onChangedOnly,
}: FiltersMenuProps) {
  const copy = t(locale);
  function toggle(ext: string, checked: boolean) {
    if (checked) {
      onChange(value.includes(ext) ? value : [...value, ext]);
      return;
    }
    onChange(value.filter((item) => item !== ext));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" size="icon" aria-label={copy.filter}>
          <FigmaIcon src="icons/filter.svg" size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] shadow-md">
        <DropdownMenuCheckboxItem
          checked={changedOnly}
          disabled={!dirty}
          onCheckedChange={(checked) => onChangedOnly(checked === true)}
        >
          {copy.onlyChanged}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{copy.filterByType}</DropdownMenuLabel>
        <div className="max-h-72 overflow-y-auto">
          {extensions.map((ext) => (
            <DropdownMenuCheckboxItem
              key={ext}
              className="gap-2"
              checked={value.includes(ext)}
              onCheckedChange={(checked) => toggle(ext, checked === true)}
            >
              <FigmaIcon src={kindIcon[fileKind(`file.${ext}`)]} size={16} />
              .{ext}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-[#ef4444] focus:text-[#ef4444]"
          onSelect={() => {
            onChange([]);
            onChangedOnly(false);
          }}
        >
          <FigmaIcon src="icons/trash-2.svg" size={16} />
          {copy.cleanFilters}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
