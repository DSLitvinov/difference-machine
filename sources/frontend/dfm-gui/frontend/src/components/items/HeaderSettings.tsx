import { Button } from "@/components/ui/button";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { authorInitials } from "@/lib/initials";
import userIcon from "@/assets/icons/user.svg";
import circleHelp from "@/assets/icons/circle-help.svg";
import settingsIcon from "@/assets/icons/settings.svg";

type HeaderSettingsProps = {
  userName: string;
  onSettings: () => void;
};

export function HeaderSettings({ userName, onSettings }: HeaderSettingsProps) {
  const initials = authorInitials(userName);
  return (
    <div className="flex w-full shrink-0 items-center justify-between px-3 pb-3 pt-2">
      <div className="flex items-center p-2">
        <div className="flex size-6 items-center justify-center overflow-clip rounded-full bg-background-primary text-[10px] font-medium text-foreground-primary">
          {initials ? initials : <FigmaIcon src={userIcon} size={16} />}
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <Button type="button" variant="ghost" size="icon" aria-label="Help">
          <FigmaIcon src={circleHelp} size={16} />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Settings" onClick={onSettings}>
          <FigmaIcon src={settingsIcon} size={16} />
        </Button>
      </div>
    </div>
  );
}
