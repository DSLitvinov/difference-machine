import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
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
        <FigmaIcon src="icons/panel-right-close.svg" size={16} />
      </Button>
    </div>
  );
}
