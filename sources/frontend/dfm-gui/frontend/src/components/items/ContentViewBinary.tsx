import { DiffBinaryPlaceholder } from "@/components/placeholders/DiffBinaryPlaceholder";
import type { Locale } from "@/lib/i18n";

type ContentViewBinaryProps = {
  locale: Locale;
  onOpen?: () => void;
};

export function ContentViewBinary({ locale, onOpen }: ContentViewBinaryProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center">
      <DiffBinaryPlaceholder locale={locale} onOpen={onOpen} />
    </div>
  );
}
