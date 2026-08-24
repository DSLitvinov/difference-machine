import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { cn } from "@/lib/utils";
import type { LetterStatus } from "@/lib/status";
import lockIcon from "@/assets/icons/lock.svg";

type FileStatusBadgeProps = {
  type: LetterStatus | "lock";
  className?: string;
};

const letter = {
  appended: { glyph: "A", className: "bg-[#16a34a] text-foreground-primary", label: "Added" },
  modified: { glyph: "M", className: "bg-[#f97316] text-foreground-primary", label: "Modified" },
  new: { glyph: "N", className: "bg-[#2563eb] text-foreground-primary", label: "New" },
  delete: { glyph: "D", className: "bg-[#dc2626] text-foreground-primary", label: "Deleted" },
} as const;

export function FileStatusBadge({ type, className }: FileStatusBadgeProps) {
  if (type === "lock") {
    return (
      <span
        aria-label="Locked"
        className={cn("inline-flex size-5 items-center justify-center rounded-sm border border-border bg-background", className)}
      >
        <FigmaIcon src={lockIcon} size={16} />
      </span>
    );
  }
  const spec = letter[type];
  return (
    <span
      aria-label={spec.label}
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-sm border border-black/[0.08] pb-px pt-[3px] text-[12px] font-semibold leading-4",
        spec.className,
        className,
      )}
    >
      {spec.glyph}
    </span>
  );
}
