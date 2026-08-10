/** Default branch names that cannot be deleted from the GUI. */
export const PROTECTED_BRANCH_NAMES = new Set(["main"]);

export interface BranchDeleteContext {
  branch: string;
  branches: string[];
  currentBranch: string;
  isDetached: boolean;
  mergeInProgress?: boolean;
  mergeBranch?: string | null;
}

export function branchDeleteBlockReason({
  branch,
  branches,
  currentBranch,
  isDetached,
  mergeInProgress,
  mergeBranch,
}: BranchDeleteContext): string | null {
  if (branches.length <= 1) {
    return "Cannot delete the only branch";
  }
  if (PROTECTED_BRANCH_NAMES.has(branch)) {
    return "This branch is protected";
  }
  if (!isDetached && branch === currentBranch) {
    return "Switch to another branch before deleting this one";
  }
  if (mergeInProgress) {
    if (branch === currentBranch) {
      return "Cannot delete the current branch during a merge";
    }
    if (mergeBranch && branch === mergeBranch) {
      return "Cannot delete a branch involved in an active merge";
    }
  }
  return null;
}
