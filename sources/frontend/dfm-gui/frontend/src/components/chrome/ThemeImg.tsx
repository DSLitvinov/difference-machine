import type { CSSProperties, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ThemeImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};

export function ThemeImg({ src, className, alt = "", width, height, style, ...props }: ThemeImgProps) {
  const boxStyle: CSSProperties = { ...style };
  if (width != null) {
    boxStyle.width = width;
  }
  if (height != null) {
    boxStyle.height = height;
  }
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-clip", className)} style={boxStyle}>
      <img {...props} src={src} alt={alt} width={width} height={height} className="size-full object-contain" />
    </span>
  );
}
