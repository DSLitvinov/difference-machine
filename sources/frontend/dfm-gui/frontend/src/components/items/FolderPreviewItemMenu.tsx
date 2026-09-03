import { Eye, EyeOff } from "lucide-react";
import { DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";

type FolderPreviewItemMenuProps = {
  locale: Locale;
  ignored?: boolean;
  align?: "start" | "end";
  onIgnore: () => void;
  onUnignore: () => void;
};

export function FolderPreviewItemMenu({ locale, ignored, align = "start", onIgnore, onUnignore }: FolderPreviewItemMenuProps) {
  const copy = t(locale);
  return (
    <DropdownMenuContent align={align} className="w-[200px] shadow-md">
      <DropdownMenuItem className="gap-2" onSelect={() => window.setTimeout(ignored ? onUnignore : onIgnore, 0)}>
        <Icon icon={ignored ? Eye : EyeOff} size={16} />
        {ignored ? copy.unignore : copy.ignored}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
