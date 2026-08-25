import { t, type Locale } from "@/lib/i18n";
import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { useAppStore } from "@/store/app-store";

export function FolderNullPlaceholder({ locale, body }: { locale: Locale; body?: string }) {
  const copy = t(locale);
  const theme = useAppStore((s) => s.theme);
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 p-3">
      <ThemeImg src={asset("illustrations/folder-null.svg", theme)} alt="" width={128} height={128} className="size-32 object-contain" />
      <div className="flex w-full flex-col items-center gap-2 text-center text-foreground-secondary">
        <p className="text-[20px] font-semibold leading-7 tracking-[-0.1px]">{copy.noFilesYet}</p>
        <p className="text-[14px] leading-5">{body ?? copy.noFilesYetBody}</p>
      </div>
    </div>
  );
}
