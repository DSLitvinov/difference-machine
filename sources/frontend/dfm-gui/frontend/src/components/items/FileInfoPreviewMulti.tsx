import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function FileInfoPreviewMulti({ count, className }: { count: number; className?: string }) {
  const theme = useAppStore((s) => s.theme);
  return (
    <div className={cn("relative size-[308px] shrink-0", className)}>
      <ThemeImg src={asset("previews/more-files.svg", theme)} alt="" width={308} height={308} className="size-[308px] object-contain" />
      <span className="pointer-events-none absolute left-[130px] top-[219px] flex size-12 items-center justify-center text-[16px] font-semibold leading-6 text-white">
        {count}
      </span>
    </div>
  );
}
