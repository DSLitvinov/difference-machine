import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";

export function BackToFileRow({ locale }: { locale: Locale }) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center gap-2">
      <FigmaIcon src="icons/file-check-2.svg" size={20} />
      <p className="min-w-0 flex-1 text-[14px] font-semibold leading-5 text-foreground">{copy.currentPreview}</p>
    </div>
  );
}
