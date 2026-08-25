import { PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";

type HeaderRightSideProps = {
  locale: Locale;
  onCollapse: () => void;
};

export function HeaderRightSide({ locale, onCollapse }: HeaderRightSideProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center justify-end pb-2 pr-3 pt-3">
      <Button type="button" variant="secondary" size="icon" aria-label={copy.collapse} onClick={onCollapse}>
        <Icon icon={PanelRightClose} size={16} />
      </Button>
    </div>
  );
}
