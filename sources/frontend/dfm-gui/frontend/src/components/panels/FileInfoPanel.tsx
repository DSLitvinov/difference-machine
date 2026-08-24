import { HeaderRightSide } from "@/components/items/HeaderRightSide";
import { NoFileSelectedPlaceholder } from "@/components/placeholders/NoFileSelectedPlaceholder";
import type { Locale } from "@/lib/i18n";

export function FileInfoPanel({ locale }: { locale: Locale }) {
  return (
    <aside className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden">
      <HeaderRightSide />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-3">
        <NoFileSelectedPlaceholder locale={locale} />
      </div>
    </aside>
  );
}
