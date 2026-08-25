import { FileCheck2 } from "lucide-react";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";

export function BackToFileRow({ locale }: { locale: Locale }) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center gap-2">
      <Icon icon={FileCheck2} size={20} />
      <p className="min-w-0 flex-1 text-[14px] font-semibold leading-5 text-foreground">{copy.currentPreview}</p>
    </div>
  );
}
