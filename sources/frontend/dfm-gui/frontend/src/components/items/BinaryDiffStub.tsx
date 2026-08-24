import { DiffBinaryPlaceholder } from "@/components/placeholders/DiffBinaryPlaceholder";
import type { Locale } from "@/lib/i18n";

export function BinaryDiffStub({ locale, onOpen }: { locale: Locale; onOpen?: () => void }) {
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center">
      <DiffBinaryPlaceholder locale={locale} onOpen={onOpen} />
    </div>
  );
}
