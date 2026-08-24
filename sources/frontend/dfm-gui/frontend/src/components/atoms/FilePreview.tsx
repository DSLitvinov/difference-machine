import { cn } from "@/lib/utils";

type FilePreviewProps = {
  src?: string;
  size?: "S" | "M" | "L";
  className?: string;
};

const sizeClass = {
  S: "size-12 rounded-sm",
  M: "size-32 rounded-sm",
  L: "size-[312px] rounded-lg",
};

export function FilePreview({ src, size = "M", className }: FilePreviewProps) {
  return (
    <div className={cn("overflow-hidden border border-border bg-background", sizeClass[size], className)}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : null}
    </div>
  );
}
