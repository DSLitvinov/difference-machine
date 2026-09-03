import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconProps = {
  icon: LucideIcon;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

/** Chrome icons from lucide-react. Color is currentColor from the parent (UI kit Button). Not for themed SVG art. */
export function Icon({ icon: Comp, size = 16, className, strokeWidth = 2 }: IconProps) {
  return (
    <Comp
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
