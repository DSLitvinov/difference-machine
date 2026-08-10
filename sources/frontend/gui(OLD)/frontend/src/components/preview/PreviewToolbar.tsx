import { useState } from "react";
import { ArrowUpAZ, Check, Search } from "lucide-react";

import { PreviewFilterMenu } from "@/components/preview/PreviewFilterMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  sliderIndexFromThumbScale,
  THUMB_SCALE_STEPS,
  type ThumbScalePx,
  thumbScaleFromSliderValue,
} from "@/lib/previewScale";
import { fileExtension } from "@/lib/fileKinds";
import { useT } from "@/lib/i18n";
import type { PreviewSortMode, SortLocale } from "@/lib/storage";
import { cn } from "@/lib/utils";

export interface BreadcrumbSegment {
  label: string;
  path: string;
}

interface PreviewToolbarProps {
  showChangedOnly: boolean;
  searchQuery: string;
  searchLoading?: boolean;
  sortMode: PreviewSortMode;
  thumbScale: ThumbScalePx;
  availableExtensions: string[];
  hiddenExtensions: Set<string>;
  onShowChangedOnlyChange: (value: boolean) => void;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
  onSortModeChange: (mode: PreviewSortMode) => void;
  onToggleExtensionFilter: (ext: string, checked: boolean) => void;
  onClearExtensionFilters: () => void;
  onThumbScaleChange: (px: ThumbScalePx) => void;
}

const SORT_OPTIONS: { mode: PreviewSortMode; labelKey: "preview.sortNameEn" | "preview.sortNameRu" }[] = [
  { mode: "name-en", labelKey: "preview.sortNameEn" },
  { mode: "name-ru", labelKey: "preview.sortNameRu" },
];

const DATE_SORT_OPTIONS: {
  mode: PreviewSortMode;
  labelKey: "preview.sortModified" | "preview.sortCreated";
}[] = [
  { mode: "modified-desc", labelKey: "preview.sortModified" },
  { mode: "created-desc", labelKey: "preview.sortCreated" },
];

function sortModeLabel(mode: PreviewSortMode, t: ReturnType<typeof useT>): string {
  switch (mode) {
    case "name-ru":
      return t("preview.sortNameRu");
    case "modified-desc":
      return t("preview.sortModified");
    case "created-desc":
      return t("preview.sortCreated");
    default:
      return t("preview.sortNameEn");
  }
}

function SortMenuItem({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto w-full justify-start gap-2 px-3 py-2 font-normal"
      onClick={onSelect}
    >
      {active ? <Check className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0" />}
      {label}
    </Button>
  );
}

export function PreviewToolbar({
  showChangedOnly,
  searchQuery,
  searchLoading,
  sortMode,
  thumbScale,
  availableExtensions,
  hiddenExtensions,
  onShowChangedOnlyChange,
  onSearchChange,
  onSearchClear,
  onSortModeChange,
  onToggleExtensionFilter,
  onClearExtensionFilters,
  onThumbScaleChange,
}: PreviewToolbarProps) {
  const t = useT();
  const [sortOpen, setSortOpen] = useState(false);
  const sliderIndex = sliderIndexFromThumbScale(thumbScale);
  const sortLabel = sortModeLabel(sortMode, t);

  const handleSortSelect = (mode: PreviewSortMode) => {
    onSortModeChange(mode);
    setSortOpen(false);
  };

  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <div className="flex shrink-0 items-center gap-2">
        <Label htmlFor="preview-changed-only" className="text-sm font-medium text-foreground">
          {t("common.changed")}
        </Label>
        <Switch
          id="preview-changed-only"
          checked={showChangedOnly}
          onCheckedChange={onShowChangedOnlyChange}
        />
      </div>

      <Separator orientation="vertical" className="mx-1 h-6 shrink-0" />

      <div className="flex min-w-0 flex-1 items-center justify-center px-2">
        <Slider
          min={0}
          max={THUMB_SCALE_STEPS.length - 1}
          step={1}
          value={[sliderIndex]}
          className="w-[120px]"
          title={t("preview.thumbnailSize")}
          onValueChange={([index]) => onThumbScaleChange(thumbScaleFromSliderValue(index))}
        />
      </div>

      <div className="relative w-[250px] shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          placeholder={t("common.search")}
          className={cn("h-9 pl-9", searchLoading && "pr-9")}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onSearchClear();
            }
          }}
        />
      </div>

      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            title={t("preview.sortTitle", { label: sortLabel })}
          >
            <ArrowUpAZ className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={4}
          className="z-50 w-44 p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {SORT_OPTIONS.map((option) => (
            <SortMenuItem
              key={option.mode}
              active={sortMode === option.mode}
              label={t(option.labelKey)}
              onSelect={() => handleSortSelect(option.mode)}
            />
          ))}
          <Separator className="my-1" />
          {DATE_SORT_OPTIONS.map((option) => (
            <SortMenuItem
              key={option.mode}
              active={sortMode === option.mode}
              label={t(option.labelKey)}
              onSelect={() => handleSortSelect(option.mode)}
            />
          ))}
        </PopoverContent>
      </Popover>

      <PreviewFilterMenu
        availableExtensions={availableExtensions}
        hiddenExtensions={hiddenExtensions}
        onToggleExtensionFilter={onToggleExtensionFilter}
        onClearExtensionFilters={onClearExtensionFilters}
      />
    </div>
  );
}

export function nameLocaleFromSortMode(mode: PreviewSortMode): SortLocale {
  return mode === "name-ru" ? "ru" : "en-US";
}

function sortByName<T extends { name: string }>(items: T[], locale: SortLocale): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return [...items].sort((a, b) => collator.compare(a.name, b.name));
}

function sortByPath<T extends { path: string }>(items: T[], locale: SortLocale): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return [...items].sort((a, b) => collator.compare(a.path, b.path));
}

export function sortDirEntries<T extends { name: string; path: string; modified?: number; created?: number }>(
  items: T[],
  mode: PreviewSortMode,
  options?: { byPath?: boolean },
): T[] {
  if (mode === "modified-desc") {
    return [...items].sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
  }
  if (mode === "created-desc") {
    return [...items].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  }
  const locale = nameLocaleFromSortMode(mode);
  return options?.byPath ? sortByPath(items, locale) : sortByName(items, locale);
}

export function extensionKeyFromPath(path: string): string {
  return fileExtension(path) || "(none)";
}

export { sortByName };
