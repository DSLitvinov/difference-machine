import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BreadcrumbSegment } from "@/components/preview/PreviewToolbar";

interface PreviewBreadcrumbsProps {
  segments: BreadcrumbSegment[];
  onSelect: (path: string) => void;
}

export function PreviewBreadcrumbs({ segments, onSelect }: PreviewBreadcrumbsProps) {
  if (segments.length === 0) return null;

  return (
    <div className="shrink-0 px-2 py-1.5">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center rounded-md border border-border bg-sidebar p-2"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-lg leading-7 text-foreground">
          {segments.map((segment, index) => (
            <span key={segment.path || "root"} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="h-auto max-w-full truncate px-1 py-0 text-lg font-normal leading-7 text-foreground hover:text-foreground"
                title={segment.label}
                onClick={() => onSelect(segment.path)}
              >
                {segment.label}
              </Button>
            </span>
          ))}
        </div>
      </nav>
    </div>
  );
}
