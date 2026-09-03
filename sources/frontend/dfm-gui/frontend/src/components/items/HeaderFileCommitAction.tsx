import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";

type HeaderFileCommitActionProps = {
  locale: Locale;
  fileName: string;
  onBack: () => void;
};

export function HeaderFileCommitAction({ locale, fileName, onBack }: HeaderFileCommitActionProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center pb-2 pt-3">
      <Button type="button" variant="outline" size="icon" aria-label={copy.back} onClick={onBack}>
        <Icon icon={ChevronRight} size={16} className="-scale-x-100" />
      </Button>
      <p className="min-w-0 flex-1 truncate text-center text-[14px] font-medium leading-5 text-foreground">{fileName}</p>
    </div>
  );
}
