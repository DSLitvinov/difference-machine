import { useEffect, useState } from "react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { loadExternalEditors, type ExternalEditor } from "@/lib/editors";
import { t, type Locale } from "@/lib/i18n";
import plusIcon from "@/assets/icons/plus.svg";
import eyeOffIcon from "@/assets/icons/eye-off.svg";
import pencilIcon from "@/assets/icons/pencil-line.svg";
import trashIcon from "@/assets/icons/trash-2.svg";
import externalLinkIcon from "@/assets/icons/external-link.svg";
import settingsIcon from "@/assets/icons/settings.svg";
import chevronRight from "@/assets/icons/chevron-right.svg";
import lockIcon from "@/assets/icons/lock.svg";

type FilePreviewItemMenuProps = {
  locale: Locale;
  locked?: boolean;
  onAddInCommit: () => void;
  onRename: () => void;
  onOpenInFolder: () => void;
  onEditIn: (editor: string) => void;
  onToggleLock: () => void;
  onDeleteInProject: () => void;
};

export function FilePreviewItemMenu({
  locale,
  locked,
  onAddInCommit,
  onRename,
  onOpenInFolder,
  onEditIn,
  onToggleLock,
  onDeleteInProject,
}: FilePreviewItemMenuProps) {
  const copy = t(locale);
  const [editors, setEditors] = useState<ExternalEditor[]>([]);

  useEffect(() => {
    void loadExternalEditors().then(setEditors);
  }, []);

  return (
    <DropdownMenuContent align="start" className="w-[200px] shadow-md">
      <DropdownMenuLabel>Commit</DropdownMenuLabel>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onAddInCommit, 0)}>
        <FigmaIcon src={plusIcon} size={16} />
        {copy.addInCommit}
      </DropdownMenuItem>
      <DropdownMenuItem disabled className="gap-2">
        <FigmaIcon src={eyeOffIcon} size={16} />
        Ignored
      </DropdownMenuItem>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onRename, 0)}>
        <FigmaIcon src={pencilIcon} size={16} />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem disabled className="gap-2">
        <FigmaIcon src={trashIcon} size={16} />
        Delete in history
      </DropdownMenuItem>
      <DropdownMenuLabel>Action </DropdownMenuLabel>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onOpenInFolder, 0)}>
        <FigmaIcon src={externalLinkIcon} size={16} />
        Open in folder
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
          <FigmaIcon src={settingsIcon} size={16} />
          <span className="min-w-0 flex-1">{copy.editIn}</span>
          <FigmaIcon src={chevronRight} size={16} />
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-[200px] shadow-md">
          {editors.map((editor) => (
            <DropdownMenuItem key={editor.path} onSelect={() => window.setTimeout(() => onEditIn(editor.path), 0)}>
              {editor.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onToggleLock, 0)}>
        <FigmaIcon src={lockIcon} size={16} />
        {locked ? "Unlock" : "Lock"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="gap-2 text-[#ef4444] focus:text-[#ef4444]"
        onSelect={() => window.setTimeout(onDeleteInProject, 0)}
      >
        <FigmaIcon src={trashIcon} size={16} />
        Delete in project
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
