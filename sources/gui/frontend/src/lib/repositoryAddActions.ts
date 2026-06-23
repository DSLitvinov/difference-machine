type RepositoryPathHandler = (path: string) => void | Promise<void>;

export interface RepositoryAddActions {
  ensureRepositoryPath: (path: string, onReady: RepositoryPathHandler) => Promise<void>;
  pickRepositoryPath: (onReady: RepositoryPathHandler) => Promise<void>;
}

let repositoryAddActions: RepositoryAddActions | null = null;

export function registerRepositoryAddActions(actions: RepositoryAddActions | null): void {
  repositoryAddActions = actions;
}

export function getRepositoryAddActions(): RepositoryAddActions | null {
  return repositoryAddActions;
}
