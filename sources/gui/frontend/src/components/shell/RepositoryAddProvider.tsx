import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import { registerRepositoryAddActions } from "@/lib/repositoryAddActions";
import { useAppStore } from "@/stores/appStore";
import {
  NOT_FORESTER_REPOSITORY_ERROR,
  checkIsForesterRepository,
  initRepository,
  pickRepositoryFolder,
} from "@/wails/bridge";

type RepositoryPathHandler = (path: string) => void | Promise<void>;

interface RepositoryAddContextValue {
  ensureRepositoryPath: (path: string, onReady: RepositoryPathHandler) => Promise<void>;
  pickRepositoryPath: (onReady: RepositoryPathHandler) => Promise<void>;
}

const RepositoryAddContext = createContext<RepositoryAddContextValue | null>(null);

export function RepositoryAddProvider({ children }: { children: ReactNode }) {
  const setError = useAppStore((s) => s.setError);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const onReadyRef = useRef<RepositoryPathHandler | null>(null);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setPendingPath(null);
    onReadyRef.current = null;
  }, []);

  const ensureRepositoryPath = useCallback(
    async (path: string, onReady: RepositoryPathHandler) => {
      const isRepo = await checkIsForesterRepository(path);
      if (isRepo) {
        await onReady(path);
        return;
      }
      onReadyRef.current = onReady;
      setPendingPath(path);
      setOpen(true);
    },
    [],
  );

  const pickRepositoryPath = useCallback(
    async (onReady: RepositoryPathHandler) => {
      const picked = await pickRepositoryFolder();
      if (!picked) return;
      await ensureRepositoryPath(picked, onReady);
    },
    [ensureRepositoryPath],
  );

  useEffect(() => {
    registerRepositoryAddActions({ ensureRepositoryPath, pickRepositoryPath });
    return () => registerRepositoryAddActions(null);
  }, [ensureRepositoryPath, pickRepositoryPath]);

  const handleCancel = useCallback(() => {
    setError(NOT_FORESTER_REPOSITORY_ERROR);
    closeDialog();
  }, [closeDialog, setError]);

  const handleCreate = useCallback(async () => {
    const path = pendingPath;
    const onReady = onReadyRef.current;
    if (!path || typeof onReady !== "function") return;

    setLoading(true);
    try {
      await initRepository(path);
      await onReady(path);
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [closeDialog, pendingPath, setError]);

  return (
    <RepositoryAddContext.Provider value={{ ensureRepositoryPath, pickRepositoryPath }}>
      {children}
      <ConfirmAlertDialog
        open={open}
        title="This folder is not a repository"
        description="Do you want to make this folder a repository?"
        cancelLabel="Cancel"
        confirmLabel="Create"
        loading={loading}
        onCancel={handleCancel}
        onConfirm={() => void handleCreate()}
      />
    </RepositoryAddContext.Provider>
  );
}

export function useRepositoryAdd(): RepositoryAddContextValue {
  const context = useContext(RepositoryAddContext);
  if (!context) {
    throw new Error("useRepositoryAdd must be used within RepositoryAddProvider");
  }
  return context;
}
