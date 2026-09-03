import { type LucideIcon, Binary, Eye, FileText, Filter, Image, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { fileKind } from "@/lib/file-kind";
import { t, type Locale } from "@/lib/i18n";
import type { GridFilter } from "@/lib/folder-query";

const kindIcon = {
  image: Image,
  text: FileText,
  blend: Binary,
  binary: Binary,
} as const satisfies Record<string, LucideIcon>;

type FiltersMenuProps = {
  locale: Locale;
  value: GridFilter;
  extensions: string[];
  changedOnly: boolean;
  viewIgnored: boolean;
  dirty: boolean;
  onChange: (value: GridFilter) => void;
  onChangedOnly: (value: boolean) => void;
  onViewIgnored: (value: boolean) => void;
};

export function FiltersMenu({
  locale,
  value,
  extensions,
  changedOnly,
  viewIgnored,
  dirty,
  onChange,
  onChangedOnly,
  onViewIgnored,
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
          <Icon icon={Filter} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] shadow-md">
        <DropdownMenuCheckboxItem
          className="gap-2"
          checked={changedOnly}
          disabled={!dirty}
          onCheckedChange={(checked) => onChangedOnly(checked === true)}
        >
          <Icon icon={Pencil} size={16} />
          {copy.onlyChanged}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          className="gap-2"
          checked={viewIgnored}
          onCheckedChange={(checked) => onViewIgnored(checked === true)}
        >
          <Icon icon={Eye} size={16} />
          {copy.viewIgnored}
        </DropdownMenuCheckboxItem>
        {extensions.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto">
              {extensions.map((ext) => (
                <DropdownMenuCheckboxItem
                  key={ext}
                  className="gap-2"
                  checked={value.includes(ext)}
                  onCheckedChange={(checked) => toggle(ext, checked === true)}
                >
                  <Icon icon={kindIcon[fileKind(`file.${ext}`)]} size={16} />
                  .{ext}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-[#ef4444] focus:text-[#ef4444]"
          onSelect={() => {
            onChange([]);
            onChangedOnly(false);
            onViewIgnored(false);
          }}
        >
          <Icon icon={Trash2} size={16} />
          {copy.cleanFilters}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
