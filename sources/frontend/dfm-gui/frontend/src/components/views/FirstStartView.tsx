import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { Icon } from "@/components/chrome/Icon";
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
    <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-background">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3">
          <ThemeImg
            src={asset("brand/app-icon.svg", theme)}
            alt=""
            width={128}
            height={128}
            className="size-32 shrink-0 rounded-[28px] border-[0.5px] border-[#e4e4e7] bg-white object-contain"
          />
          <div className="flex w-full flex-col items-center gap-1">
            <h1 className="text-[26px] font-medium leading-[26px] tracking-[-1px] text-[#18181b] dark:text-foreground">{copy.appName}</h1>
            <p className="text-center text-sm font-normal leading-5 text-[#71717a]">{copy.prototype}</p>
          </div>
        </div>
        <div className="flex w-full max-w-[680px] flex-col gap-5 overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#fafafa] py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background-light">
          <div className="flex items-center gap-4 px-5">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[18px] font-normal leading-7 text-[#18181b] dark:text-foreground">{copy.createRepo}</p>
              <p className="text-sm font-normal leading-5 text-[#71717a]">{copy.createRepoHint}</p>
            </div>
            <Button type="button" className="shrink-0" disabled={busy} onClick={onCreate}>
              {copy.create}
            </Button>
          </div>
          <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
          <div className="flex items-center gap-4 px-5">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[18px] font-normal leading-7 text-[#18181b] dark:text-foreground">{copy.openRepo}</p>
              <p className="text-sm font-normal leading-5 text-[#71717a]">{copy.openRepoHint}</p>
            </div>
            <Button type="button" variant="outline" className="shrink-0" disabled={busy} onClick={onOpen}>
              {copy.open}
            </Button>
          </div>
          <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
          <div className="flex flex-col gap-3 px-5">
            <p className="text-[18px] font-normal leading-7 text-[#18181b] dark:text-foreground">{copy.language}</p>
            <div className="relative w-full">
              <select
                className="flex h-8 w-full appearance-none rounded-[10px] border border-[#d4d4d8] bg-white pl-2.5 pr-8 text-sm font-normal leading-5 text-[#18181b] shadow-[0_1px_1px_rgba(0,0,0,0.05)] focus-visible:border-[#60a5fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0c9fc] dark:border-border dark:bg-background dark:text-foreground"
                value={locale}
                onChange={(event) => onLocale(event.target.value === "ru" ? "ru" : "en")}
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
              <Icon icon={ChevronsUpDown} size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm font-normal leading-5 text-[#71717a]">{copy.languageHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
