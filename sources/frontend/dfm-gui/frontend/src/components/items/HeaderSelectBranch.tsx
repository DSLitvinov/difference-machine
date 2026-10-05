import { ChevronRight, ChevronsUpDown, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";
import type { BranchSummary } from "@/store/app-store";

type HeaderSelectBranchProps = {
  locale: Locale;
  branchName?: string;
  branches: BranchSummary[];
  switchLocked?: boolean;
  onSwitch: (name: string) => void;
  onCreate: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMerge: () => void;
};

export function HeaderSelectBranch({
  locale,
  branchName,
  branches,
  switchLocked,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onMerge,
}: HeaderSelectBranchProps) {
  const copy = t(locale);
  const current = branchName || "";
  const others = branches.filter((branch) => branch.name !== current);
  return (
    <div className="flex w-[309px] shrink-0 flex-col items-start px-3 pb-2 pt-3">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-h-[22px] w-full items-center gap-1 rounded-md border border-[#d4d4d8] bg-background py-1 pl-2 pr-1.5 shadow-sm dark:border-border"
          >
            <span className="min-w-0 flex-1 truncate text-left text-[12px] font-normal leading-4 text-foreground">
              {current || copy.branchName}
            </span>
            <Icon icon={ChevronsUpDown} size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] shadow-md"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {branches.length > 0 ? (
            <DropdownMenuRadioGroup
              value={current}
              onValueChange={(name) => {
                window.setTimeout(() => onSwitch(name), 0);
              }}
            >
              {branches.map((branch) => (
                <DropdownMenuRadioItem key={branch.name} value={branch.name} disabled={switchLocked}>
                  {branch.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          ) : null}
          {branches.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <span className="min-w-0 flex-1">{copy.manageBranches}</span>
              <Icon icon={ChevronRight} size={16} />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-[200px] shadow-md">
              <DropdownMenuItem onSelect={() => window.setTimeout(onCreate, 0)}>{copy.createNew}</DropdownMenuItem>
              <DropdownMenuItem
                disabled={others.length === 0}
                onSelect={() => window.setTimeout(onMerge, 0)}
              >
                {copy.mergeBranches}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!current} onSelect={() => window.setTimeout(onRename, 0)}>
                {copy.rename}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={others.length === 0}
                className="gap-2 text-[#ef4444] focus:text-[#ef4444]"
                onSelect={() => window.setTimeout(onDelete, 0)}
              >
                <Icon icon={Trash2} size={16} className="text-[#ef4444]" />
                {copy.deleteBranch}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
