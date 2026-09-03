import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function FileInfoPreviewMulti({ className }: { className?: string }) {
  const theme = useAppStore((s) => s.theme);
  return (
    <ThemeImg
      src={asset("previews/more-files.svg", theme)}
      alt=""
      width={308}
      height={308}
      className={cn("size-[308px] shrink-0 object-contain", className)}
    />
  );
}
