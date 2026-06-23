import { GitBranch } from "lucide-react";

import { DropdownSelector } from "@/components/ui/dropdown-selector";

interface BranchSelectorProps {
  branches: string[];
  currentBranch: string;
  disabled?: boolean;
  onSelect: (branch: string) => void;
}

export function BranchSelector({ branches, currentBranch, disabled, onSelect }: BranchSelectorProps) {
  const options = branches.map((name) => ({
    value: name,
    label: name,
    title: name,
  }));

  return (
    <DropdownSelector
      value={currentBranch}
      options={options}
      placeholder="No branches"
      disabled={disabled || branches.length === 0}
      icon={<GitBranch className="h-4 w-4" />}
      onChange={onSelect}
    />
  );
}
