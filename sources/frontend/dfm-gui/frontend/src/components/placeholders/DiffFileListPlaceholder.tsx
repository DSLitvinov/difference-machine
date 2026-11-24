import { t, type Locale } from "@/lib/i18n";
import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { useAppStore } from "@/store/app-store";

export function DiffFileListPlaceholder({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const theme = useAppStore((s) => s.theme);
  return (
    <div className="flex w-[269px] flex-col items-center justify-center gap-2">
      <ThemeImg src={asset("placeholders/folder-null.svg", theme)} alt="" width={256} height={256} className="size-64" />
      <div className="flex w-full flex-col items-center gap-0 text-center">
        <p className="w-full text-[20px] font-semibold leading-7 tracking-[-0.1px] text-[#18181b] dark:text-foreground">{copy.nothingToShow}</p>
        <p className="w-full text-[14px] leading-5 text-foreground-muted">{copy.noFilesChangedInCommit}</p>
      </div>
    </div>
  );
}
