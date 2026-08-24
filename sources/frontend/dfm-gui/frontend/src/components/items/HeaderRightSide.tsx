import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import panelRightClose from "@/assets/icons/panel-right-close.svg";

type HeaderRightSideProps = {
  onCollapse: () => void;
};

export function HeaderRightSide({ onCollapse }: HeaderRightSideProps) {
  return (
    <div className="flex w-full items-center justify-end pb-2 pr-3 pt-3">
      <Button type="button" variant="secondary" size="icon" aria-label="Collapse" onClick={onCollapse}>
        <FigmaIcon src={panelRightClose} size={16} />
      </Button>
    </div>
  );
}
