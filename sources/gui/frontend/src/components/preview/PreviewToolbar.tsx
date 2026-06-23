import { ArrowUpDown } from "lucide-react";

import type { SortLocale } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface PreviewToolbarProps {
  sortLocale: SortLocale;
  onSortLocaleChange: (locale: SortLocale) => void;
}

export function PreviewToolbar({ sortLocale, onSortLocaleChange }: PreviewToolbarProps) {
  const nextLocale: SortLocale = sortLocale === "en-US" ? "ru" : "en-US";
  const label = sortLocale === "en-US" ? "A–Z" : "А–Я";

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        title={`Sort: ${label}. Click to switch.`}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        onClick={() => onSortLocaleChange(nextLocale)}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {label}
      </button>
    </div>
  );
}

function sortByName<T extends { name: string }>(items: T[], locale: SortLocale): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  return [...items].sort((a, b) => collator.compare(a.name, b.name));
}

export { sortByName };
