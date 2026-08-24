import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import squareTerminal from "@/assets/icons/square-terminal.svg";
import chevronsUpDown from "@/assets/icons/chevrons-up-down.svg";

type HeaderSelectBranchProps = {
  locale: Locale;
  branchName?: string;
};

export function HeaderSelectBranch({ locale, branchName }: HeaderSelectBranchProps) {
  const copy = t(locale);
  return (
    <div className="flex w-[309px] shrink-0 flex-col items-start p-3">
      <div className="flex w-full items-center gap-1 rounded-sm border border-border bg-background px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FigmaIcon src={squareTerminal} size={20} />
          <p className="min-w-0 truncate text-[16px] leading-6 text-foreground-secondary">{branchName || copy.branchName}</p>
        </div>
        <FigmaIcon src={chevronsUpDown} size={20} />
      </div>
    </div>
  );
}
