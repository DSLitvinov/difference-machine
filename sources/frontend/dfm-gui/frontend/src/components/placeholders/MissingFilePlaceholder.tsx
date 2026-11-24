import { t, type Locale } from "@/lib/i18n";
import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { useAppStore } from "@/store/app-store";

export function MissingFilePlaceholder({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const theme = useAppStore((s) => s.theme);
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <ThemeImg src={asset("placeholders/file-missing.svg", theme)} alt="" width={256} height={256} className="size-64" />
      <div className="flex flex-col items-center gap-0 text-center">
        <p className="text-[20px] font-semibold leading-7 tracking-[-0.1px] text-[#18181b] dark:text-foreground">{copy.fileMissing}</p>
        <p className="text-[14px] leading-5 text-foreground-muted">{copy.fileMissingBody}</p>
      </div>
    </div>
  );
}
