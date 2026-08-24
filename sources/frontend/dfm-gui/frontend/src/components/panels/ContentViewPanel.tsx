import { HeaderFolderAction } from "@/components/items/HeaderFolderAction";
import { FolderNullPlaceholder } from "@/components/placeholders/FolderNullPlaceholder";
import type { Locale } from "@/lib/i18n";

type ContentViewPanelProps = {
  locale: Locale;
};

export function ContentViewPanel({ locale }: ContentViewPanelProps) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pb-3 pl-2 pr-3">
      <HeaderFolderAction locale={locale} />
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden rounded-lg border border-border bg-background p-4 shadow-sm">
          <FolderNullPlaceholder locale={locale} />
        </div>
      </div>
    </section>
  );
}
