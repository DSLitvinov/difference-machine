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
import filterIcon from "@/assets/icons/filter.svg";
import imageIcon from "@/assets/icons/image.svg";
import fileTextIcon from "@/assets/icons/file-text.svg";
import blendIcon from "@/assets/icons/binary.svg";
import trashIcon from "@/assets/icons/trash-2.svg";

const kindIcon = {
  image: imageIcon,
  text: fileTextIcon,
  blend: blendIcon,
  binary: blendIcon,
} as const;

type FiltersMenuProps = {
  locale: Locale;
  value: GridFilter;
  extensions: string[];
  onChange: (value: GridFilter) => void;
};

export function FiltersMenu({ locale, value, extensions, onChange }: FiltersMenuProps) {
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
          <FigmaIcon src={filterIcon} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] shadow-md">
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
        <DropdownMenuItem className="gap-2 text-[#ef4444] focus:text-[#ef4444]" onSelect={() => onChange([])}>
          <FigmaIcon src={trashIcon} size={16} />
          {copy.cleanFilters}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
