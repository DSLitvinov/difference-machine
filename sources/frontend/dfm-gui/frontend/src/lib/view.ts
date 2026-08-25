export type Shell = "first-start" | "app";
export type SidebarTab = "history" | "stages";
export type ContentContext = "folder" | "file" | "file-revision" | "commit";

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
  | "file-view"
  | "file-history"
  | "view-commit";

export type ViewInput = {
  shell: Shell;
  folderPath: string;
  folderEmpty: boolean;
  hasCommits: boolean;
  /** True when the open folder has `.DFM/` (Forester repo). */
  isRepository: boolean;
  selectionCount: number;
  contentContext: ContentContext;
  infoCollapsed: boolean;
  sidebarTab: SidebarTab;
  commitComposer: "closed" | "open";
  stashEmpty: boolean;
};

export function deriveView(input: ViewInput): DerivedView {
  if (input.shell === "first-start") {
    return "first-start";
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
  if (input.commitComposer === "open") {
    return input.selectionCount === 1 ? "create-commit-single-file" : "create-commit";
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
  if (input.selectionCount > 1) {
    return "file-more-info";
  }
  if (input.selectionCount === 1) {
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
    view === "file-view"
  );
}
