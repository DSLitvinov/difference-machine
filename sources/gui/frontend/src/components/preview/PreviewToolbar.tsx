import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  sliderIndexFromThumbScale,
  THUMB_SCALE_STEPS,
  type ThumbScalePx,
  thumbScaleFromSliderValue,
} from "@/lib/previewScale";
import type { SortLocale } from "@/lib/storage";
import { cn } from "@/lib/utils";

export interface BreadcrumbSegment {
  label: string;
  path: string;
}

interface PreviewToolbarProps {
  breadcrumbs: BreadcrumbSegment[];
  canGoBack: boolean;
  canGoForward: boolean;
  showChangedOnly: boolean;
  searchQuery: string;
  searchLoading?: boolean;
  sortLocale: SortLocale;
  thumbScale: ThumbScalePx;
  onBack: () => void;
  onForward: () => void;
  onBreadcrumbSelect: (path: string) => void;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
  onSortLocaleChange: (locale: SortLocale) => void;
  onThumbScaleChange: (px: ThumbScalePx) => void;
}

export function PreviewToolbar({
  breadcrumbs,
  canGoBack,
  canGoForward,
  showChangedOnly,
  searchQuery,
  searchLoading,
  sortLocale,
  thumbScale,
  onBack,
  onForward,
  onBreadcrumbSelect,
  onSearchChange,
  onSearchClear,
  onSortLocaleChange,
  onThumbScaleChange,
}: PreviewToolbarProps) {
  const nextLocale: SortLocale = sortLocale === "en-US" ? "ru" : "en-US";
  const sortLabel = sortLocale === "en-US" ? "A–Z" : "А–Я";
  const sliderIndex = sliderIndexFromThumbScale(thumbScale);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled={!canGoBack}
        title="Back"
        onClick={onBack}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled={!canGoForward}
        title="Forward"
        onClick={onForward}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-lg">
        {breadcrumbs.map((segment, index) => (
          <span key={segment.path || "root"} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
            <Button
              type="button"
              variant="ghost"
              className="h-auto max-w-[12rem] truncate px-1 py-0 text-lg font-normal text-foreground hover:text-foreground"
              title={segment.label}
              onClick={() => onBreadcrumbSelect(segment.path)}
            >
              {segment.label}
            </Button>
          </span>
        ))}
        {showChangedOnly ? (
          <span className="text-xs text-muted-foreground">· changed only</span>
        ) : null}
      </nav>

      <div className="flex w-[120px] shrink-0 items-center gap-2 px-1">
        <Slider
          min={0}
          max={THUMB_SCALE_STEPS.length - 1}
          step={1}
          value={[sliderIndex]}
          className="flex-1"
          title="Thumbnail size"
          onValueChange={([index]) => onThumbScaleChange(thumbScaleFromSliderValue(index))}
        />
      </div>

      <div className="relative w-[200px] shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          placeholder="Search"
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

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        title={`Sort: ${sortLabel}. Click to switch.`}
        onClick={() => onSortLocaleChange(nextLocale)}
      >
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

function sortByName<T extends { name: string }>(items: T[], locale: SortLocale): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return [...items].sort((a, b) => collator.compare(a.name, b.name));
}

export { sortByName };
