import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import type { BranchSummary } from "@/store/app-store";
import squareTerminal from "@/assets/icons/square-terminal.svg";
import chevronsUpDown from "@/assets/icons/chevrons-up-down.svg";

type HeaderSelectBranchProps = {
  locale: Locale;
  branchName?: string;
  branches: BranchSummary[];
  onSwitch: (name: string) => void;
  onCreate: () => void;
  onRename: () => void;
  onDelete: (name: string) => void;
};

export function HeaderSelectBranch({
  locale,
  branchName,
  branches,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: HeaderSelectBranchProps) {
  const copy = t(locale);
  const current = branchName || "";
  const others = branches.filter((branch) => branch.name !== current);
  return (
    <div className="flex w-[309px] shrink-0 flex-col items-start p-3">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex w-full items-center gap-1 rounded-sm border border-border bg-background px-3 py-2 shadow-sm">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <FigmaIcon src={squareTerminal} size={20} />
              <span className="min-w-0 truncate text-left text-[16px] font-normal leading-6 text-foreground-secondary">
                {current || copy.branchName}
              </span>
            </span>
            <FigmaIcon src={chevronsUpDown} size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[285px]"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {branches.map((branch) => (
            <DropdownMenuItem
              key={branch.name}
              disabled={branch.name === current}
              onSelect={() => {
                window.setTimeout(() => onSwitch(branch.name), 0);
              }}
            >
              {branch.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => window.setTimeout(onCreate, 0)}>Create</DropdownMenuItem>
          <DropdownMenuItem disabled={!current} onSelect={() => window.setTimeout(onRename, 0)}>
            Rename
          </DropdownMenuItem>
          {others.length === 0 ? (
            <DropdownMenuItem disabled>Delete</DropdownMenuItem>
          ) : others.length === 1 ? (
            <DropdownMenuItem
              onSelect={() => {
                const name = others[0]?.name;
                if (name) {
                  window.setTimeout(() => onDelete(name), 0);
                }
              }}
            >
              Delete
            </DropdownMenuItem>
          ) : (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Delete</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[220px]">
                {others.map((branch) => (
                  <DropdownMenuItem key={branch.name} onSelect={() => window.setTimeout(() => onDelete(branch.name), 0)}>
                    {branch.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
