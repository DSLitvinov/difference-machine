import { t, type Locale } from "@/lib/i18n";
import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { useAppStore } from "@/store/app-store";

export function MissingFilePlaceholder({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const theme = useAppStore((s) => s.theme);
  return (
    <div className="flex w-[269px] flex-col items-center justify-center gap-2">
      <ThemeImg src={asset("placeholders/file-missing.svg", theme)} alt="" width={128} height={128} className="size-32 object-contain" />
      <div className="flex w-full flex-col items-center gap-2 text-center">
        <p className="w-full text-[20px] font-semibold leading-7 tracking-[-0.1px] text-foreground-secondary">{copy.fileMissing}</p>
        <p className="w-full text-[14px] leading-5 text-foreground-muted">{copy.fileMissingBody}</p>
      </div>
    </div>
  );
}
