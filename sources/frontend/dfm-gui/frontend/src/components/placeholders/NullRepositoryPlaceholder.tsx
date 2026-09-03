import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";

type NullRepositoryPlaceholderProps = {
  locale: Locale;
  busy?: boolean;
  onCreate: () => void;
};

export function NullRepositoryPlaceholder({ locale, busy, onCreate }: NullRepositoryPlaceholderProps) {
  const copy = t(locale);
  return (
    <div className="flex w-[269px] flex-col items-center justify-center gap-2">
      <div className="flex w-full flex-col items-center gap-2 text-center text-foreground-secondary">
        <p className="w-full text-[20px] font-semibold leading-7 tracking-[-0.1px]">{copy.createRepo}</p>
        <p className="w-full text-[14px] leading-5">{copy.createRepoHistoryHint}</p>
      </div>
      <Button type="button" disabled={busy} onClick={onCreate}>
        <Icon icon={Plus} size={16} />
        {copy.createRepository}
      </Button>
    </div>
  );
}
