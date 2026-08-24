import type { CSSProperties, ImgHTMLAttributes } from "react";
import type { ThemedSrc } from "@/assets/themed";
import { cn } from "@/lib/utils";

type ThemeImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: ThemedSrc;
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
      <img {...props} src={src.light} alt={alt} width={width} height={height} className="asset-light size-full object-contain" />
      <img {...props} src={src.dark} alt="" aria-hidden width={width} height={height} className="asset-dark size-full object-contain" />
    </span>
  );
}
