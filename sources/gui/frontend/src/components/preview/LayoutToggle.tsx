import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface LayoutToggleProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function LayoutToggle<T extends string>({ value, options, onChange }: LayoutToggleProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className="shrink-0 rounded-md border border-border p-0.5"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          size="sm"
          className="h-auto rounded px-2 py-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
