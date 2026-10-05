import { Check } from "lucide-react";
import { Icon } from "@/components/chrome/Icon";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

/** 16×16 Nova checkbox: empty #d4d4d8 square, checked fill #18181b with a 14px tick. */
export function Checkbox({ checked, disabled, onChange, className }: CheckboxProps) {
  return (
    <span className={cn("relative flex size-4 shrink-0 items-center justify-center", className)}>
      <input
        type="checkbox"
        className="size-4 appearance-none rounded border border-[#d4d4d8] bg-white checked:border-[#18181b] checked:bg-[#18181b] disabled:opacity-50 dark:bg-background"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {checked ? <Icon icon={Check} size={14} className="pointer-events-none absolute text-white" /> : null}
    </span>
  );
}
