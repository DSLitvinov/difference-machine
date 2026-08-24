import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { cn } from "@/lib/utils";

export function FileInfoPreviewMulti({ className }: { className?: string }) {
  return (
    <ThemeImg
      src={asset("illustrations/file-info-more-files.svg")}
      alt=""
      width={308}
      height={308}
      className={cn("size-[308px] shrink-0 object-contain", className)}
    />
  );
}
