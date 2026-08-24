import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LetterStatus } from "@/lib/status";
import { useAppStore } from "@/store/app-store";
import lockIcon from "@/assets/icons/lock.svg";

type FileStatusBadgeProps = {
  type: LetterStatus | "lock";
  className?: string;
};

const letter = {
  appended: { glyph: "A", className: "bg-[#16a34a] text-foreground-primary" },
  modified: { glyph: "M", className: "bg-[#f97316] text-foreground-primary" },
  new: { glyph: "N", className: "bg-[#2563eb] text-foreground-primary" },
  delete: { glyph: "D", className: "bg-[#dc2626] text-foreground-primary" },
} as const;

export function FileStatusBadge({ type, className }: FileStatusBadgeProps) {
  const locale = useAppStore((s) => s.locale);
  const copy = t(locale);
  if (type === "lock") {
    return (
      <span
        aria-label={copy.locked}
        className={cn("inline-flex size-5 items-center justify-center rounded-sm border border-border bg-background", className)}
      >
        <FigmaIcon src={lockIcon} size={16} />
      </span>
    );
  }
  const spec = letter[type];
  const labels = {
    appended: copy.statusAdded,
    modified: copy.modified,
    new: copy.statusNew,
    delete: copy.deleted,
  } as const;
  return (
    <span
      aria-label={labels[type]}
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
