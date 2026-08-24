import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { cn } from "@/lib/utils";

type FigmaIconProps = {
  src: string;
  size?: number;
  className?: string;
  alt?: string;
};

export function FigmaIcon({ src, size = 16, className, alt = "" }: FigmaIconProps) {
  return <ThemeImg src={asset(src)} alt={alt} width={size} height={size} className={cn("overflow-clip", className)} />;
}
