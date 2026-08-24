import { useEffect, useState } from "react";
import { FirstStartView } from "@/components/views/FirstStartView";
import { AppShell } from "@/components/views/AppShell";
import {
  foresterCall,
  getSession,
  initRepository,
  openRepository,
  selectDirectory,
  setLocale as persistLocale,
  onWailsEvent,
} from "@/lib/bridge";
import type { Locale } from "@/lib/i18n";
import { useAppStore, type CommitSummary, type DirEntry, type StatusSnapshot } from "@/store/app-store";

type EntriesResult = {
  entries?: DirEntry[];
  total?: number;
};

type LogResult = {
  commits?: CommitSummary[];
};

export default function App() {
  const shell = useAppStore((s) => s.shell);
  const locale = useAppStore((s) => s.locale);
  const toast = useAppStore((s) => s.toast);
  const repoPath = useAppStore((s) => s.repoPath);
  const folderPath = useAppStore((s) => s.folderPath);
  const applySession = useAppStore((s) => s.applySession);
  const setLocale = useAppStore((s) => s.setLocale);
  const setToast = useAppStore((s) => s.setToast);
  const setRepoMeta = useAppStore((s) => s.setRepoMeta);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast, setToast]);

  useEffect(() => {
    void (async () => {
      try {
        const info = await getSession();
        applySession(info);
      } catch {
        // Bindings missing in a plain Vite preview; stay on First Start.
      }
    })();
  }, [applySession]);

  useEffect(() => {
    const offSession = onWailsEvent("session:changed", (...args: unknown[]) => {
      const info = args[0] as SessionInfo | undefined;
      if (!info || typeof info !== "object") {
        return;
      }
      applySession(info);
    });
    const offSettings = onWailsEvent("menu:settings", () => {
      // Settings dialog is phase 13.
    });
    return () => {
      offSession();
      offSettings();
    };
  }, [applySession]);

  useEffect(() => {
    if (shell !== "app") {
      return;
    }
    void refreshRepoMeta();
  }, [shell, repoPath, folderPath]);

  async function refreshRepoMeta() {
    const path = useAppStore.getState().folderPath;
    try {
      const [status, entriesResult, log] = await Promise.all([
        foresterCall("status.get") as Promise<StatusSnapshot>,
        foresterCall("workdir.entries", { path, offset: 0, limit: 200 }) as Promise<EntriesResult>,
        foresterCall("log.get") as Promise<LogResult>,
      ]);
      const entries = entriesResult.entries ?? [];
      const commits = log.commits ?? [];
      setRepoMeta({
        status,
        entries,
        commits,
        folderEmpty: !(entriesResult.total ?? entries.length),
        hasCommits: commits.length > 0,
      });
    } catch {
      setRepoMeta({ status: null, folderEmpty: true, hasCommits: false, entries: [], commits: [] });
    }
  }

  async function pickFolder(): Promise<string | null> {
    try {
      const path = await selectDirectory();
      return path || null;
    } catch {
      return null;
    }
  }

  async function onCreate() {
    const path = await pickFolder();
    if (!path) {
      return;
    }
    setBusy(true);
    try {
      const info = await initRepository(path);
      applySession(info);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateRepository() {
    if (!repoPath) {
      return;
    }
    setBusy(true);
    try {
      const info = await initRepository(repoPath);
      if (info.error) {
        setToast(info.error);
        return;
      }
      applySession(info);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onOpen() {
    const path = await pickFolder();
    if (!path) {
      return;
    }
    setBusy(true);
    try {
      const info = await openRepository(path);
      applySession(info);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onLocale(next: Locale) {
    setLocale(next);
    try {
      await persistLocale(next);
    } catch {
      // Local toggle still applies if cfg write fails.
    }
  }

  return (
    <>
      {shell === "app" ? (
        <AppShell busy={busy} onSettings={() => undefined} onCreateRepository={() => void onCreateRepository()} />
      ) : (
        <FirstStartView locale={locale} busy={busy} onCreate={() => void onCreate()} onOpen={() => void onOpen()} onLocale={onLocale} />
      )}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-border bg-background px-3 py-2 text-[14px] leading-5 text-foreground shadow-sm"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
