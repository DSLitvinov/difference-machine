import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";

type DiffBinaryPlaceholderProps = {
  locale: Locale;
  onOpen?: () => void;
};

export function DiffBinaryPlaceholder({ locale, onOpen }: DiffBinaryPlaceholderProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full max-w-[374px] flex-col items-center justify-center gap-2 p-4">
      <FigmaIcon src="icons/file.svg" size={24} />
      <p className="w-full text-center text-[16px] font-medium leading-6 text-foreground-muted">{copy.binaryCannotDisplay}</p>
      <Button type="button" onClick={onOpen}>
        {copy.openInExternalApplication}
      </Button>
    </div>
  );
}
