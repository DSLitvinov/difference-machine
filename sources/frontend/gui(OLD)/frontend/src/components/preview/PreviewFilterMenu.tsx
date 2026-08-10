import { Filter } from "lucide-react";

import { FileExtensionIcon } from "@/components/preview/FileExtensionIcon";
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
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function extensionLabel(ext: string, t: ReturnType<typeof useT>): string {
  if (ext === "(none)") return t("merge.extensionNone");
  return `.${ext}`;
}

interface PreviewFilterMenuProps {
  availableExtensions: string[];
  hiddenExtensions: Set<string>;
  onToggleExtensionFilter: (ext: string, checked: boolean) => void;
  onClearExtensionFilters: () => void;
}

export function PreviewFilterMenu({
  availableExtensions,
  hiddenExtensions,
  onToggleExtensionFilter,
  onClearExtensionFilters,
}: PreviewFilterMenuProps) {
  const t = useT();
  const typeFilterActive = hiddenExtensions.size > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10 shrink-0", typeFilterActive && "border border-ring bg-accent")}
          title={t("preview.filterTypesLabel")}
          disabled={availableExtensions.length === 0}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[246px] p-0">
        <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold">
          {t("preview.filterTypesLabel")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0" />
        <div className="max-h-[240px] overflow-y-auto p-1">
          {availableExtensions.map((ext) => (
            <DropdownMenuCheckboxItem
              key={ext}
              checked={!hiddenExtensions.has(ext)}
              className="gap-2 pl-8 pr-2"
              onCheckedChange={(checked) => onToggleExtensionFilter(ext, checked === true)}
              onSelect={(event) => event.preventDefault()}
            >
              <FileExtensionIcon extension={ext} />
              <span>{extensionLabel(ext, t)}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        <DropdownMenuSeparator className="mx-0" />
        <div className="p-1">
          <DropdownMenuItem
            className="justify-center text-sm font-medium"
            disabled={!typeFilterActive}
            onSelect={() => onClearExtensionFilters()}
          >
            {t("preview.cleanFilters")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
