import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { basenameRel } from "@/lib/folder-query";
import { t, type Locale } from "@/lib/i18n";

type FileInCommitMenuProps = {
  locale: Locale;
  path: string;
  status: string;
  onOpen: () => void;
  onRevert: () => void;
};

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

export function FileInCommitMenu({ locale, path, status, onOpen, onRevert }: FileInCommitMenuProps) {
  const copy = t(locale);
  return (
    <DropdownMenuContent align="start" className="w-[217px] shadow-md">
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onOpen, 0)}>
        <FigmaIcon src="icons/external-link.svg" size={16} />
        {copy.openFileFromCommit}
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onRevert, 0)}>
        <FigmaIcon src="icons/replace.svg" size={16} />
        {copy.revertFileFromCommit}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
          <FigmaIcon src="icons/copy.svg" size={16} />
          <span className="min-w-0 flex-1">{copy.copyPath}</span>
          <FigmaIcon src="icons/chevron-right.svg" size={16} />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-[200px] shadow-md">
          <DropdownMenuItem onSelect={() => copyText(path.replace(/^\/+/, ""))}>{copy.pathOfFile}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyText(basenameRel(path))}>{copy.fileName}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyText(status)}>{copy.statusFile}</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  );
}
