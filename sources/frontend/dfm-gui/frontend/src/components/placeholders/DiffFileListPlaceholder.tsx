import { t, type Locale } from "@/lib/i18n";
import folderNull from "@/assets/illustrations/folder-null.svg";

export function DiffFileListPlaceholder({ locale }: { locale: Locale }) {
  const copy = t(locale);
  return (
    <div className="flex w-[269px] flex-col items-center justify-center gap-2">
      <img src={folderNull} alt="" width={128} height={128} className="theme-asset size-32 object-contain" />
      <div className="flex w-full flex-col items-center gap-2 text-center">
        <p className="w-full text-[20px] font-semibold leading-7 tracking-[-0.1px] text-foreground-secondary">{copy.nothingToShow}</p>
        <p className="w-full text-[14px] leading-5 text-foreground-secondary">{copy.noFilesChangedInCommit}</p>
      </div>
    </div>
  );
}
