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
    <nav className="flex min-w-0 flex-wrap items-center gap-1 px-2 text-lg leading-7">
      {segments.map((segment, index) => (
        <span key={segment.path || "root"} className="flex min-w-0 items-center gap-1">
          {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
          <Button
            type="button"
            variant="ghost"
            className="h-auto max-w-full truncate px-1 py-0 text-lg font-normal text-foreground hover:text-foreground"
            title={segment.label}
            onClick={() => onSelect(segment.path)}
          >
            {segment.label}
          </Button>
        </span>
      ))}
    </nav>
  );
}
