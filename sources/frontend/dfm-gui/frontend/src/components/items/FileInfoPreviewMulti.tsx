import fileInfoMoreFiles from "@/assets/illustrations/file-info-more-files.svg";
import { cn } from "@/lib/utils";

export function FileInfoPreviewMulti({ className }: { className?: string }) {
  return (
    <img
      src={fileInfoMoreFiles}
      alt=""
      width={308}
      height={308}
      className={cn("size-[308px] shrink-0", className)}
    />
  );
}
