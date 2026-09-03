import { ChevronRight, Copy, ExternalLink, Replace, Trash2 } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { basenameRel } from "@/lib/folder-query";
import { t, type Locale } from "@/lib/i18n";

type FileInCommitMenuProps = {
  locale: Locale;
  path: string;
  status: string;
  onOpen: () => void;
  onRevert: () => void;
  onDeleteInHistory: () => void;
};

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

export function FileInCommitMenu({ locale, path, status, onOpen, onRevert, onDeleteInHistory }: FileInCommitMenuProps) {
  const copy = t(locale);
  const deleteDisabled = status.toUpperCase() === "D";
  return (
    <DropdownMenuContent align="start" className="w-[217px] shadow-md">
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onOpen, 0)}>
        <Icon icon={ExternalLink} size={16} />
        {copy.openFileFromCommit}
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onRevert, 0)}>
        <Icon icon={Replace} size={16} />
        {copy.revertFileFromCommit}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
          <Icon icon={Copy} size={16} />
          <span className="min-w-0 flex-1">{copy.copyPath}</span>
          <Icon icon={ChevronRight} size={16} />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-[200px] shadow-md">
          <DropdownMenuItem onSelect={() => copyText(path.replace(/^\/+/, ""))}>{copy.pathOfFile}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyText(basenameRel(path))}>{copy.fileName}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyText(status)}>{copy.statusFile}</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        disabled={deleteDisabled}
        className="gap-2 text-[#ef4444] focus:text-[#ef4444]"
        onSelect={() => window.setTimeout(onDeleteInHistory, 0)}
      >
        <Icon icon={Trash2} size={16} />
        {copy.deleteInHistory}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
