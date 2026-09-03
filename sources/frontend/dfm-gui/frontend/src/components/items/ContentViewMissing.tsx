import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function ContentViewMissing({ locale }: { locale: Locale }) {
  const copy = t(locale);
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center" role="img" aria-label={copy.fileMissing}>
      <p className="text-[96px] font-semibold leading-none text-[#274754]" aria-hidden>
        ?
      </p>
    </div>
  );
}
