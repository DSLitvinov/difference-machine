import { cn } from "@/lib/utils";

interface LayoutToggleProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function LayoutToggle<T extends string>({ value, options, onChange }: LayoutToggleProps<T>) {
  return (
    <div className="flex shrink-0 rounded-md border border-border p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
