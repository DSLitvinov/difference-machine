import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import panelRightClose from "@/assets/icons/panel-right-close.svg";

export function HeaderRightSide() {
  return (
    <div className="flex w-full items-center justify-end pb-2 pr-3 pt-3">
      <Button type="button" variant="secondary" size="icon" aria-label="Collapse">
        <FigmaIcon src={panelRightClose} size={16} />
      </Button>
    </div>
  );
}
