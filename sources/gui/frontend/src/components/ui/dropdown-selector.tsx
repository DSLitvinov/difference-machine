import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

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
  placeholder = "Select…",
  disabled,
  icon,
  onChange,
}: DropdownSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label ? (
        <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
        )}
        title={selected?.title ?? selected?.label}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
        <span className="min-w-0 flex-1 truncate">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-background py-1 shadow-md">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{placeholder}</p>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
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
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
