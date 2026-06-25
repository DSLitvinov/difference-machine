import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  title?: string;
}

interface DropdownSelectorProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  icon?: ReactNode;
  onChange: (value: string) => void;
}

export function DropdownSelector({
  label,
  value,
  options,
  placeholder,
  disabled,
  icon,
  onChange,
}: DropdownSelectorProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const resolvedPlaceholder = placeholder ?? t("common.selectPlaceholder");

  return (
    <div>
      {label ? (
        <Label className="mb-1 block text-xs font-normal text-muted-foreground">{label}</Label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between gap-2 bg-background font-medium"
            title={selected?.title ?? selected?.label}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
              <span className="truncate">{selected?.label ?? resolvedPlaceholder}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="max-h-56 w-[var(--radix-popover-trigger-width)] overflow-auto p-1"
          align="start"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{resolvedPlaceholder}</p>
          ) : (
            options.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start gap-2 px-3 py-2 font-normal",
                  value === option.value && "bg-accent",
                )}
                title={option.title ?? option.label}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {value === option.value ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{option.label}</span>
              </Button>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
