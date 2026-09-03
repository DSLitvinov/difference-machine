import { Button } from "@/components/ui/button";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { asset } from "@/assets/themed";
import { t, type Locale } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

type FirstStartViewProps = {
  locale: Locale;
  busy: boolean;
  onCreate: () => void;
  onOpen: () => void;
  onLocale: (locale: Locale) => void;
};

export function FirstStartView({ locale, busy, onCreate, onOpen, onLocale }: FirstStartViewProps) {
  const copy = t(locale);
  const theme = useAppStore((s) => s.theme);
  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden bg-background-light">
      <div className="flex w-full flex-col items-center gap-6 p-8">
        <div className="flex flex-col items-center gap-3">
          <ThemeImg src={asset("brand/app-icon.svg", theme)} alt="" width={128} height={128} className="size-32 shrink-0 object-contain" />
          <div className="flex w-full flex-col items-center gap-1">
            <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.225px] text-foreground">{copy.appName}</h1>
            <p className="text-center text-[14px] leading-5 text-foreground-muted">{copy.prototype}</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 overflow-hidden rounded-lg border border-border bg-background p-6">
          <div className="flex w-full items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-[18px] font-semibold leading-7 text-foreground">{copy.createRepo}</p>
              <p className="text-[14px] leading-5 text-foreground-muted">{copy.createRepoHint}</p>
            </div>
            <Button type="button" disabled={busy} onClick={onCreate}>
              {copy.create}
            </Button>
          </div>
          <div className="h-px w-full bg-border" />
          <div className="flex w-full items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-[18px] font-semibold leading-7 text-foreground">{copy.openRepo}</p>
              <p className="text-[14px] leading-5 text-foreground-muted">{copy.openRepoHint}</p>
            </div>
            <Button type="button" disabled={busy} onClick={onOpen}>
              {copy.open}
            </Button>
          </div>
          <div className="h-px w-full bg-border" />
          <div className="flex w-full flex-col gap-2">
            <p className="text-[14px] font-medium leading-5 text-foreground">{copy.language}</p>
            <div className="flex gap-2">
              <Button type="button" variant={locale === "en" ? "primary" : "outline"} onClick={() => onLocale("en")}>
                English
              </Button>
              <Button type="button" variant={locale === "ru" ? "primary" : "outline"} onClick={() => onLocale("ru")}>
                Русский
              </Button>
            </div>
            <p className="text-[14px] leading-5 text-foreground-muted">{copy.languageHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
