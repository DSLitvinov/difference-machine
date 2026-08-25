import type { SyntheticEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";

export type CommitCardAction = "compare" | "cleanup-tmp" | "restore-version" | "revert-commit" | "reset";

type CommitCardMenuProps = {
  locale: Locale;
  hash: string;
  message: string;
  onAction: (action: CommitCardAction) => void;
};

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

function stopCardClick(event: SyntheticEvent) {
  event.stopPropagation();
}

export function CommitCardMenu({ locale, hash, message, onAction }: CommitCardMenuProps) {
  const copy = t(locale);
  return (
    <DropdownMenuContent align="end" className="w-[227px] shadow-md" onClick={stopCardClick}>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(() => onAction("compare"), 0)}>
        <FigmaIcon src="icons/external-link.svg" size={16} />
        {copy.compareWithWorkingTree}
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(() => onAction("cleanup-tmp"), 0)}>
        <FigmaIcon src="icons/trash-2.svg" size={16} />
        {copy.cleanTemporaryFolder}
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(() => onAction("restore-version"), 0)}>
        <FigmaIcon src="icons/reply.svg" size={16} />
        {copy.restoreThisVersion}
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(() => onAction("revert-commit"), 0)}>
        <FigmaIcon src="icons/replace.svg" size={16} />
        {copy.revertCommit}
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(() => onAction("reset"), 0)}>
        <FigmaIcon src="icons/refresh-cw.svg" size={16} />
        {copy.resetBranchToCommit}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="gap-2" onSelect={() => copyText(hash)}>
        <FigmaIcon src="icons/copy.svg" size={16} />
        {copy.copyHash}
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => copyText(message)}>
        <FigmaIcon src="icons/copy.svg" size={16} />
        {copy.copyMessage}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

type CommitCardMoreButtonProps = {
  locale: Locale;
  hash: string;
  message: string;
  onAction: (action: CommitCardAction) => void;
};

export function CommitCardMoreButton({ locale, hash, message, onAction }: CommitCardMoreButtonProps) {
  const copy = t(locale);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="size-4 shrink-0" aria-label={copy.more} onClick={stopCardClick} onPointerDown={stopCardClick}>
          <FigmaIcon src="icons/ellipsis-vertical.svg" size={16} />
        </button>
      </DropdownMenuTrigger>
      <CommitCardMenu locale={locale} hash={hash} message={message} onAction={onAction} />
    </DropdownMenu>
  );
}
