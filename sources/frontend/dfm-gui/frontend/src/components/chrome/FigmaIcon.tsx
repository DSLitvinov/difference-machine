import { cn } from "@/lib/utils";

type FigmaIconProps = {
  src: string;
  size?: number;
  className?: string;
  alt?: string;
};

export function FigmaIcon({ src, size = 16, className, alt = "" }: FigmaIconProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-clip", className)} style={{ width: size, height: size }}>
      <img src={src} alt={alt} width={size} height={size} className="theme-asset size-full object-contain" />
    </span>
  );
}
