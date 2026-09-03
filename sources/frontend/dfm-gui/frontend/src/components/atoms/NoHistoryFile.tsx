import { t, type Locale } from "@/lib/i18n";

export function NoHistoryFile({ locale }: { locale: Locale }) {
  const copy = t(locale);
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="w-full text-[16px] font-medium leading-6 text-foreground">{copy.noHistoryOfChanges}</p>
      <p className="w-full text-[14px] leading-5 text-foreground-muted">{copy.noHistoryFileBody}</p>
    </div>
  );
}
