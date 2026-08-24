import { cn } from "@/lib/utils";

type FilePreviewProps = {
  src?: string;
  size?: "S" | "M" | "L";
  themed?: boolean;
  className?: string;
};

const sizeClass = {
  S: "size-12 rounded-sm",
  M: "size-32 rounded-sm",
  L: "size-[312px] rounded-lg",
};

export function FilePreview({ src, size = "M", themed, className }: FilePreviewProps) {
  return (
    <div className={cn("overflow-hidden border border-border bg-background", sizeClass[size], className)}>
      {src ? <img src={src} alt="" className={cn("size-full object-cover", themed && "theme-asset")} /> : null}
    </div>
  );
}
