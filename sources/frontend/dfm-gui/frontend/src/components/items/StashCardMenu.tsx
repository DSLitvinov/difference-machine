import { EllipsisVertical, Reply, Trash2 } from "lucide-react";
import type { SyntheticEvent } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";

export type StashCardAction = "apply" | "drop";

type StashCardMoreButtonProps = {
  locale: Locale;
  onAction: (action: StashCardAction) => void;
};

function stopCardClick(event: SyntheticEvent) {
  event.stopPropagation();
}

export function StashCardMoreButton({ locale, onAction }: StashCardMoreButtonProps) {
  const copy = t(locale);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="size-4 shrink-0" aria-label={copy.more} onClick={stopCardClick} onPointerDown={stopCardClick}>
          <Icon icon={EllipsisVertical} size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[227px] shadow-md" onClick={stopCardClick}>
        <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(() => onAction("apply"), 0)}>
          <Icon icon={Reply} size={16} />
          {copy.restoreState}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(() => onAction("drop"), 0)}>
          <Icon icon={Trash2} size={16} />
          {copy.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
