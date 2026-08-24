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
import { useAppStore, type StatusSnapshot } from "@/store/app-store";

export default function App() {
  const shell = useAppStore((s) => s.shell);
  const locale = useAppStore((s) => s.locale);
  const toast = useAppStore((s) => s.toast);
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
        if (info.shell === "app") {
          await refreshRepoMeta();
        }
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
      if (info.shell === "app") {
        void refreshRepoMeta();
      }
    });
    const offSettings = onWailsEvent("menu:settings", () => {
      // Settings dialog is phase 13.
    });
    return () => {
      offSession();
      offSettings();
    };
  }, [applySession]);

  async function refreshRepoMeta() {
    try {
      const [status, entries, log] = await Promise.all([
        foresterCall("status.get") as Promise<StatusSnapshot>,
        foresterCall("workdir.entries", { path: "", offset: 0, limit: 1 }) as Promise<{ total?: number }>,
        foresterCall("log.get", { max_count: 1 }) as Promise<{ commits?: unknown[] }>,
      ]);
      setRepoMeta({
        status,
        folderEmpty: !entries.total,
        hasCommits: (log.commits?.length ?? 0) > 0,
      });
    } catch {
      setRepoMeta({ status: null, folderEmpty: true, hasCommits: false });
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
      if (info.shell === "app") {
        await refreshRepoMeta();
      }
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
      if (info.shell === "app") {
        await refreshRepoMeta();
      }
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
        <AppShell onSettings={() => undefined} />
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
