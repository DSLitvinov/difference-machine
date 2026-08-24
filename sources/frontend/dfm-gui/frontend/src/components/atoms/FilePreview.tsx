import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type FilePreviewProps = {
  src?: string;
  text?: string;
  size?: "S" | "M" | "L";
  className?: string;
  style?: CSSProperties;
};

const sizeClass = {
  S: "size-12 rounded-sm",
  M: "size-32 rounded-sm",
  L: "size-[312px] rounded-lg",
};

function boxPx(size: "S" | "M" | "L", style?: CSSProperties): number {
  if (typeof style?.width === "number") {
    return style.width;
  }
  if (size === "L") {
    return 312;
  }
  if (size === "M") {
    return 128;
  }
  return 48;
}

export function FilePreview({ src, text, size = "M", className, style }: FilePreviewProps) {
  const box = boxPx(size, style);
  const fontSize = Math.min(11, Math.max(5, Math.round(box / 8)));
  return (
    <div className={cn("overflow-hidden border border-border bg-background", sizeClass[size], className)} style={style}>
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : text ? (
        <pre
          className="pointer-events-none size-full overflow-hidden whitespace-pre-wrap break-all font-mono text-foreground"
          style={{ fontSize, lineHeight: 1.25, padding: box >= 128 ? 8 : 4 }}
        >
          {text}
        </pre>
      ) : null}
    </div>
  );
}
