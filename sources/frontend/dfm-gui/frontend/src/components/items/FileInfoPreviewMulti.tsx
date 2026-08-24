import fileImg from "@icons/256/File-IMG.svg";
import fileText from "@icons/256/File-TEXT.svg";
import { cn } from "@/lib/utils";

export function FileInfoPreviewMulti({ className }: { className?: string }) {
  return (
    <div className={cn("relative size-[308px] overflow-hidden rounded-lg border border-border bg-background", className)}>
      <img src={fileText} alt="" className="absolute left-[-8px] top-12 size-[172px] -rotate-[13deg] object-contain" />
      <img src={fileText} alt="" className="absolute left-[100px] top-12 size-[172px] rotate-[13deg] object-contain" />
      <img src={fileImg} alt="" className="absolute left-[52px] top-[52px] size-[204px] object-contain" />
    </div>
  );
}
