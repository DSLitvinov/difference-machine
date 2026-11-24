import { Button } from "@/components/ui/button";
import { ThemeImg } from "@/components/chrome/ThemeImg";
import { asset } from "@/assets/themed";
import { t, type Locale } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

type DiffBinaryPlaceholderProps = {
  locale: Locale;
  onOpen?: () => void;
};

export function DiffBinaryPlaceholder({ locale, onOpen }: DiffBinaryPlaceholderProps) {
  const copy = t(locale);
  const theme = useAppStore((s) => s.theme);
  return (
    <div className="flex w-full max-w-[374px] flex-col items-center justify-center gap-2 p-4">
      <ThemeImg src={asset("file-types/binary.svg", theme)} alt="" width={256} height={256} className="size-64" />
      <p className="w-full text-center text-[14px] leading-5 text-foreground-muted">{copy.binaryCannotDisplay}</p>
      <Button type="button" onClick={onOpen}>
        {copy.openInExternalApplication}
      </Button>
    </div>
  );
}
