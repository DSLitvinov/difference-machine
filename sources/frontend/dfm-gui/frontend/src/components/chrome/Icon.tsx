import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconProps = {
  icon: LucideIcon;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

/** Chrome icons from lucide-react. Default fill is Content/content-secondary. Pass `text-current` when the parent color is the mockup color. Not for themed SVG art. */
export function Icon({ icon: Comp, size = 16, className, strokeWidth = 2 }: IconProps) {
  return (
    <Comp
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0 text-foreground-muted", className)}
      aria-hidden
    />
  );
}
