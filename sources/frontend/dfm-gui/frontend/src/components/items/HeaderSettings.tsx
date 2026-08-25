import { CircleHelp, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/chrome/Icon";
import { authorInitials } from "@/lib/initials";
import { t, type Locale } from "@/lib/i18n";

type HeaderSettingsProps = {
  locale: Locale;
  userName: string;
  onSettings: () => void;
};

export function HeaderSettings({ locale, userName, onSettings }: HeaderSettingsProps) {
  const copy = t(locale);
  const initials = authorInitials(userName);
  return (
    <div className="flex w-full shrink-0 items-center justify-between px-3 pb-3 pt-2">
      <div className="flex items-center p-2">
        <div className="theme-contrast flex size-6 items-center justify-center overflow-clip rounded-full bg-background-primary text-[10px] font-medium text-foreground-primary">
          {initials ? initials : <Icon icon={User} size={16} />}
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <Button type="button" variant="ghost" size="icon" aria-label={copy.help}>
          <Icon icon={CircleHelp} size={16} />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label={copy.settings} onClick={onSettings}>
          <Icon icon={Settings} size={16} />
        </Button>
      </div>
    </div>
  );
}
