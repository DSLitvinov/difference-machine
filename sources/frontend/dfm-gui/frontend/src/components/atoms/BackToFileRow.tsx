import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import fileCheck2 from "@/assets/icons/file-check-2.svg";

export function BackToFileRow({ locale }: { locale: Locale }) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center gap-2">
      <FigmaIcon src={fileCheck2} size={20} />
      <p className="min-w-0 flex-1 text-[14px] font-semibold leading-5 text-foreground">{copy.currentPreview}</p>
    </div>
  );
}
