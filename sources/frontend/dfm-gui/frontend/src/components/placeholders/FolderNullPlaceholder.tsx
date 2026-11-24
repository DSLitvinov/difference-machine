import { t, type Locale } from "@/lib/i18n";
import { asset } from "@/assets/themed";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { useAppStore } from "@/store/app-store";

export function FolderNullPlaceholder({ locale, body }: { locale: Locale; body?: string | null }) {
  const copy = t(locale);
  const theme = useAppStore((s) => s.theme);
  const subtitle = body === null ? null : (body ?? copy.noFilesYetBody);
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-0 p-3">
      <ThemeImg src={asset("placeholders/folder-null.svg", theme)} alt="" width={256} height={256} className="size-64" />
      <div className="flex w-full flex-col items-center gap-0 text-center">
        <p className="text-[20px] font-semibold leading-7 tracking-[-0.1px] text-[#18181b] dark:text-foreground">{copy.noFilesYet}</p>
        {subtitle ? <p className="text-[14px] leading-5 text-foreground-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}
