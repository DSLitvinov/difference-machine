import { MissingFilePlaceholder } from "@/components/placeholders/MissingFilePlaceholder";
import type { Locale } from "@/lib/i18n";

export function ContentViewMissing({ locale }: { locale: Locale }) {
  return (
    <div className="flex min-h-0 w-full flex-1 justify-center">
      <MissingFilePlaceholder locale={locale} />
    </div>
  );
}
