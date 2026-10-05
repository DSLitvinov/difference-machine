import { Check } from "lucide-react";
import { Icon } from "@/components/chrome/Icon";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

/** Nova checkbox: 16×16 hit target, empty box 14×14, checked fill 16×16 with a 14px tick. */
export function Checkbox({ checked, disabled, onChange, className }: CheckboxProps) {
  return (
    <span className={cn("relative inline-flex size-4 shrink-0 items-center justify-center", disabled && "opacity-50", className)}>
      <input
        type="checkbox"
        className="absolute inset-0 size-4 cursor-pointer appearance-none disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none rounded border bg-white dark:bg-background",
          checked
            ? "size-4 border-[#18181b] bg-[#18181b] dark:border-foreground dark:bg-foreground"
            : "size-3.5 border-[#d4d4d8] dark:border-border",
        )}
      />
      {checked ? (
        <Icon icon={Check} size={14} className="pointer-events-none absolute text-white dark:text-background" />
      ) : null}
    </span>
  );
}
