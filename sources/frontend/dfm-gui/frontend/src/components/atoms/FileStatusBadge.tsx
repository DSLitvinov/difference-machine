import { EyeOff, FilePlus, Lock, Pencil, Plus, Replace, Trash2, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/chrome/Icon";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LetterStatus } from "@/lib/status";
import { useAppStore } from "@/store/app-store";

type FileStatusBadgeProps = {
  type: LetterStatus | "lock" | "ignored";
  /** Grid tiles use the icon circle. File Info uses the labeled pill. */
  iconOnly?: boolean;
  className?: string;
};

const spec: Record<LetterStatus | "ignored", { icon: LucideIcon; className: string }> = {
  appended: { icon: Plus, className: "bg-[#86efac] text-[#166534]" },
  modified: { icon: Pencil, className: "bg-[#fdba74] text-[#7c2d12]" },
  new: { icon: FilePlus, className: "bg-[#60a5fa] text-[#1e3a8a]" },
  delete: { icon: Trash2, className: "bg-[#fca5a5] text-[#dc2626]" },
  move: { icon: Replace, className: "bg-[#67e8f9] text-[#164e63]" },
  rename: { icon: Replace, className: "bg-[#c084fc] text-[#581c87]" },
  ignored: { icon: EyeOff, className: "bg-[#cbd5e1] text-[#334155]" },
};

export function FileStatusBadge({ type, iconOnly, className }: FileStatusBadgeProps) {
  const locale = useAppStore((s) => s.locale);
  const copy = t(locale);
  const labels = {
    appended: copy.statusAppended,
    modified: copy.statusModified,
    new: copy.statusNew,
    delete: copy.statusDeleted,
    move: copy.statusMoved,
    rename: copy.statusRenamed,
    ignored: copy.ignored,
    lock: copy.locked,
  } as const;
  if (type === "lock") {
    return (
      <span
        aria-label={labels.lock}
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-full border border-[#d4d4d8] bg-background text-[12px] font-semibold leading-4 text-[#18181b] dark:text-foreground",
          iconOnly ? "p-1" : "px-2 py-0.5",
          className,
        )}
      >
        <Icon icon={Lock} size={12} />
        {iconOnly ? null : labels.lock}
      </span>
    );
  }
  const item = spec[type];
  return (
    <span
      aria-label={labels[type]}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full text-[12px] font-semibold leading-4",
        iconOnly ? "p-1" : "px-2 py-0.5",
        item.className,
        className,
      )}
    >
      <Icon icon={item.icon} size={12} />
      {iconOnly ? null : labels[type]}
    </span>
  );
}
