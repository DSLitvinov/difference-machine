import { ChevronRight, ExternalLink, EyeOff, Lock, PencilLine, Plus, Settings, Trash2 } from "lucide-react";
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
import { Icon } from "@/components/chrome/Icon";
import { loadExternalEditors, type ExternalEditor } from "@/lib/editors";
import { t, type Locale } from "@/lib/i18n";

export type FileWorkdirAction =
  | { kind: "addInCommit" }
  | { kind: "rename" }
  | { kind: "openInFolder" }
  | { kind: "editIn"; editor: string }
  | { kind: "toggleLock" }
  | { kind: "deleteInProject" };

type FilePreviewItemMenuProps = {
  locale: Locale;
  locked?: boolean;
  disableRename?: boolean;
  align?: "start" | "end";
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
  disableRename,
  align = "start",
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
    <DropdownMenuContent align={align} className="w-[200px] shadow-md">
      <DropdownMenuLabel>{copy.commitSection}</DropdownMenuLabel>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onAddInCommit, 0)}>
        <Icon icon={Plus} size={16} />
        {copy.addInCommit}
      </DropdownMenuItem>
      <DropdownMenuItem disabled className="gap-2">
        <Icon icon={EyeOff} size={16} />
        {copy.ignored}
      </DropdownMenuItem>
      <DropdownMenuItem disabled={disableRename} className="gap-2" onSelect={() => window.setTimeout(onRename, 0)}>
        <Icon icon={PencilLine} size={16} />
        {copy.rename}
      </DropdownMenuItem>
      <DropdownMenuItem disabled className="gap-2">
        <Icon icon={Trash2} size={16} />
        {copy.deleteInHistory}
      </DropdownMenuItem>
      <DropdownMenuLabel>{copy.action}</DropdownMenuLabel>
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(onOpenInFolder, 0)}>
        <Icon icon={ExternalLink} size={16} />
        {copy.openInFolder}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
          <Icon icon={Settings} size={16} />
          <span className="min-w-0 flex-1">{copy.editIn}</span>
          <Icon icon={ChevronRight} size={16} />
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
        <Icon icon={Lock} size={16} />
        {locked ? copy.unlock : copy.lock}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="gap-2 text-[#ef4444] focus:text-[#ef4444]"
        onSelect={() => window.setTimeout(onDeleteInProject, 0)}
      >
        <Icon icon={Trash2} size={16} />
        {copy.deleteInProject}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
