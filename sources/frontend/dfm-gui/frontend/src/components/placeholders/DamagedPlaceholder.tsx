import { Button } from "@/components/ui/button";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { asset } from "@/assets/themed";
import { t, type Locale } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

type DamagedPlaceholderProps = {
  locale: Locale;
  busy?: boolean;
  onVerify: () => void;
};

export function DamagedPlaceholder({ locale, busy, onVerify }: DamagedPlaceholderProps) {
  const copy = t(locale);
  const theme = useAppStore((s) => s.theme);
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 p-3">
      <ThemeImg src={asset("placeholders/file-missing.svg", theme)} alt="" width={128} height={128} className="size-32 object-contain" />
      <div className="flex w-full flex-col items-center gap-2 text-center">
        <p className="w-full text-[20px] font-semibold leading-7 tracking-[-0.1px] text-foreground-secondary">{copy.repositoryDamaged}</p>
        <p className="w-full text-[14px] leading-5 text-foreground-muted">{copy.repositoryDamagedBody}</p>
      </div>
      <Button type="button" disabled={busy} onClick={onVerify}>
        {copy.verifyRepository}
      </Button>
    </div>
  );
}
