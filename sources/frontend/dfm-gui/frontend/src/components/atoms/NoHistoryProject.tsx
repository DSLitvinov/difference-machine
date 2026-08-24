import { t, type Locale } from "@/lib/i18n";

export function NoHistoryProject({ locale }: { locale: Locale }) {
  const copy = t(locale);
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2">
      <p className="w-full text-[16px] font-medium leading-6 text-foreground">{copy.noHistoryProject}</p>
      <p className="w-full text-[14px] leading-5 text-foreground-muted">{copy.noHistoryProjectBody}</p>
    </div>
  );
}
