import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { basenameRel } from "@/lib/folder-query";
import externalLinkIcon from "@/assets/icons/external-link.svg";
import replaceIcon from "@/assets/icons/replace.svg";
import copyIcon from "@/assets/icons/copy.svg";
import chevronRight from "@/assets/icons/chevron-right.svg";

type FileInCommitMenuProps = {
  path: string;
  status: string;
  onOpen: () => void;
  onRevert: () => void;
};

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

export function FileInCommitMenu({ path, status, onOpen, onRevert }: FileInCommitMenuProps) {
  return (
    <DropdownMenuContent align="start" className="w-[217px] shadow-md">
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onOpen, 0)}>
        <FigmaIcon src={externalLinkIcon} size={16} />
        Open file from commit
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onRevert, 0)}>
        <FigmaIcon src={replaceIcon} size={16} />
        Revert file from commit
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
          <FigmaIcon src={copyIcon} size={16} />
          <span className="min-w-0 flex-1">Copy path</span>
          <FigmaIcon src={chevronRight} size={16} />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-[200px] shadow-md">
          <DropdownMenuItem onSelect={() => copyText(path.replace(/^\/+/, ""))}>Path of file</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyText(basenameRel(path))}>File name</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyText(status)}>Status file</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  );
}
