export type Shell = "first-start" | "app";
export type SidebarTab = "history" | "stages";
export type ContentContext = "folder" | "file" | "file-revision" | "commit";
export type CommitComposer = "closed" | "selection" | "all";

export type DerivedView =
  | "first-start"
  | "empty-dfm-project"
  | "empty-dfm-folder"
  | "root-folder"
  | "root-folder-collapse"
  | "subfolder"
  | "file-info"
  | "file-more-info"
  | "stages"
  | "stashes-null"
  | "create-commit"
  | "create-commit-single-file"
  | "create-commit-all-files"
  | "file-view"
  | "file-history"
  | "view-commit"
  | "dfm-damaged";

export type ViewInput = {
  shell: Shell;
  folderPath: string;
  folderEmpty: boolean;
  hasCommits: boolean;
  /** True when the open folder has `.DFM/` (Forester repo). */
  isRepository: boolean;
  /** True when HEAD commit or its tree cannot be read from the object store. */
  repoDamaged: boolean;
  selectionCount: number;
  /** Files in selection (folder tiles do not open File Info). */
  fileSelectionCount: number;
  contentContext: ContentContext;
  infoCollapsed: boolean;
  sidebarTab: SidebarTab;
  commitComposer: CommitComposer;
  stashEmpty: boolean;
};

export function deriveView(input: ViewInput): DerivedView {
  if (input.shell === "first-start") {
    return "first-start";
  }
  if (input.repoDamaged && input.isRepository) {
    return "dfm-damaged";
  }
  if (input.contentContext === "file") {
    return "file-view";
  }
  if (input.contentContext === "file-revision") {
    return "file-history";
  }
  if (input.contentContext === "commit") {
    return "view-commit";
  }
  if (input.commitComposer === "all") {
    return "create-commit-all-files";
  }
  if (input.commitComposer === "selection") {
    return input.fileSelectionCount === 1 && input.selectionCount === 1 ? "create-commit-single-file" : "create-commit";
  }
  if (input.sidebarTab === "stages") {
    return input.stashEmpty ? "stashes-null" : "stages";
  }
  // Workdir open without .DFM — Create repository in History (Empty DFM Folder).
  if (!input.isRepository && !input.folderEmpty) {
    return "empty-dfm-folder";
  }
  if (input.folderEmpty && !input.hasCommits && input.selectionCount === 0) {
    return "empty-dfm-project";
  }
  if (input.fileSelectionCount > 1 || (input.selectionCount > 1 && input.fileSelectionCount > 0)) {
    return "file-more-info";
  }
  if (input.fileSelectionCount === 1 && input.selectionCount === 1) {
    return input.folderPath ? "subfolder" : "file-info";
  }
  // Initialized repo with no commits still uses Root Folder chrome; History shows No History.
  if (input.infoCollapsed) {
    return "root-folder-collapse";
  }
  if (input.folderPath) {
    return "subfolder";
  }
  return "root-folder";
}

export function showRightColumn(view: DerivedView): boolean {
  return (
    view === "empty-dfm-folder" ||
    view === "root-folder" ||
    view === "subfolder" ||
    view === "file-info" ||
    view === "file-more-info" ||
    view === "stages" ||
    view === "stashes-null" ||
    view === "create-commit" ||
    view === "create-commit-single-file" ||
    view === "create-commit-all-files" ||
    view === "file-view"
  );
}
