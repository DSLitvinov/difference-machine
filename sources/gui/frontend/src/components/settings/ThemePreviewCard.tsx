import { cn } from "@/lib/utils";
import type { GuiTheme } from "@/lib/applyAppearance";

interface ThemePreviewCardProps {
  theme: GuiTheme;
  selected: boolean;
  onSelect: () => void;
}

export function ThemePreviewCard({ theme, selected, onSelect }: ThemePreviewCardProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="flex flex-col items-center gap-2 text-left"
      onClick={onSelect}
    >
      <div
        className={cn(
          "h-[88px] w-[148px] overflow-hidden rounded-lg border-2 p-2 transition-colors",
          selected ? "border-ring" : "border-border",
        )}
      >
        <div
          className={cn(
            "flex h-full flex-col gap-1.5 rounded-md p-2",
            isDark ? "bg-[#09090b]" : "bg-[#e4e4e7]",
          )}
        >
          <div className={cn("h-2 w-10 rounded-full", isDark ? "bg-[#27272a]" : "bg-white")} />
          <div className={cn("h-2 w-full rounded-full", isDark ? "bg-[#52525b]" : "bg-white")} />
          <div className={cn("h-2 w-[80%] rounded-full", isDark ? "bg-[#52525b]" : "bg-white")} />
        </div>
      </div>
      <span className="text-sm text-muted-foreground">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
