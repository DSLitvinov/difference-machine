import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import chevronRight from "@/assets/icons/chevron-right.svg";
import searchIcon from "@/assets/icons/search.svg";
import sortIcon from "@/assets/icons/arrow-up-a-z.svg";
import filterIcon from "@/assets/icons/filter.svg";

type HeaderFolderActionProps = {
  locale: Locale;
};

export function HeaderFolderAction({ locale }: HeaderFolderActionProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full items-center justify-between pb-2 pt-3">
      <div className="flex items-center gap-3">
        <p className="text-[18px] leading-7 text-foreground">{copy.home}</p>
        <FigmaIcon src={chevronRight} size={24} />
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="secondary" size="icon" aria-label="Search">
          <FigmaIcon src={searchIcon} size={16} />
        </Button>
        <Button type="button" variant="secondary" size="icon" aria-label="Sort">
          <FigmaIcon src={sortIcon} size={16} />
        </Button>
        <Button type="button" variant="secondary" size="icon" aria-label="Filter">
          <FigmaIcon src={filterIcon} size={16} />
        </Button>
      </div>
    </div>
  );
}
