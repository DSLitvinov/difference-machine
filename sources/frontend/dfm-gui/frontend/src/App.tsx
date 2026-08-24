import { useEffect, useRef, useState } from "react";
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
import { dirtyPaths, isDirty } from "@/lib/status";
import { useAppStore, type CommitSummary, type DirEntry, type FileLock, type StatusSnapshot } from "@/store/app-store";
import type { CreateCommitFields } from "@/components/atoms/CreateCommitCard";

type EntriesResult = {
  entries?: DirEntry[];
  total?: number;
  has_more?: boolean;
};

type LogResult = {
  commits?: CommitSummary[];
};

type LocksResult = {
  locks?: FileLock[];
};

function commitMessage(title: string, description: string): string {
  const head = title.trim();
  const body = description.trim();
  if (!head) {
    return "";
  }
  if (!body) {
    return head;
  }
  return `${head}\n\n${body}`;
}

function firstTag(raw: string): string {
  return raw.split(",")[0]?.trim() ?? "";
}

export default function App() {
  const shell = useAppStore((s) => s.shell);
  const locale = useAppStore((s) => s.locale);
  const toast = useAppStore((s) => s.toast);
  const repoPath = useAppStore((s) => s.repoPath);
  const folderPath = useAppStore((s) => s.folderPath);
  const changedOnly = useAppStore((s) => s.changedOnly);
  const applySession = useAppStore((s) => s.applySession);
  const setLocale = useAppStore((s) => s.setLocale);
  const setToast = useAppStore((s) => s.setToast);
  const setRepoMeta = useAppStore((s) => s.setRepoMeta);
  const [busy, setBusy] = useState(false);
  const loadingMore = useRef(false);

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
  }, [shell, repoPath, folderPath, changedOnly]);

  async function refreshRepoMeta() {
    try {
      const [status, log, locksResult] = await Promise.all([
        foresterCall("status.get") as Promise<StatusSnapshot>,
        foresterCall("log.get") as Promise<LogResult>,
        foresterCall("lock.list") as Promise<LocksResult>,
      ]);
      const commits = log.commits ?? [];
      let showChanged = useAppStore.getState().changedOnly;
      if (showChanged && !isDirty(status)) {
        useAppStore.getState().setChangedOnly(false);
        showChanged = false;
      }
      let entries: DirEntry[] = [];
      let entriesHasMore = false;
      let folderEmpty = useAppStore.getState().folderEmpty;
      if (showChanged) {
        const paths = dirtyPaths(status);
        if (paths.length > 0) {
          const byPaths = (await foresterCall("workdir.entries_by_paths", { paths })) as { entries?: DirEntry[] };
          entries = byPaths.entries ?? [];
        }
      } else {
        const path = useAppStore.getState().folderPath;
        const entriesResult = (await foresterCall("workdir.entries", { path, offset: 0, limit: 200 })) as EntriesResult;
        entries = entriesResult.entries ?? [];
        entriesHasMore = Boolean(entriesResult.has_more);
        folderEmpty = !(entriesResult.total ?? entries.length);
      }
      setRepoMeta({
        status,
        entries,
        entriesHasMore,
        commits,
        locks: locksResult.locks ?? [],
        folderEmpty,
        hasCommits: commits.length > 0,
      });
    } catch {
      setRepoMeta({
        status: null,
        folderEmpty: true,
        hasCommits: false,
        entries: [],
        entriesHasMore: false,
        commits: [],
        locks: [],
      });
    }
  }

  async function loadMoreEntries() {
    const state = useAppStore.getState();
    if (loadingMore.current || state.changedOnly || !state.entriesHasMore) {
      return;
    }
    loadingMore.current = true;
    const folder = state.folderPath;
    const offset = state.entries.length;
    try {
      const result = (await foresterCall("workdir.entries", { path: folder, offset, limit: 200 })) as EntriesResult;
      const latest = useAppStore.getState();
      if (latest.folderPath !== folder || latest.changedOnly) {
        return;
      }
      useAppStore.getState().appendEntries(result.entries ?? [], Boolean(result.has_more));
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      loadingMore.current = false;
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

  async function onApplySelection(paths: string[]) {
    if (paths.length === 0) {
      return;
    }
    try {
      await foresterCall("index.add", { files: paths });
      await refreshRepoMeta();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function onCommitAll() {
    const paths = dirtyPaths(useAppStore.getState().status);
    if (paths.length === 0) {
      return;
    }
    setBusy(true);
    try {
      await foresterCall("index.add", { files: paths });
      await refreshRepoMeta();
      useAppStore.getState().openCommitComposer();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateCommit(fields: CreateCommitFields) {
    const message = commitMessage(fields.message, fields.description);
    if (!message) {
      return;
    }
    const tag = firstTag(fields.tag);
    const author = useAppStore.getState().userName.trim();
    setBusy(true);
    try {
      const paths = dirtyPaths(useAppStore.getState().status);
      if (paths.length > 0) {
        await foresterCall("index.add", { files: paths });
      }
      const args: Record<string, unknown> = { message };
      if (author) {
        args.author = author;
      }
      if (tag) {
        args.tag = tag;
      }
      await foresterCall("commit.create", args);
      useAppStore.getState().closeCommitComposer();
      await refreshRepoMeta();
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
        <AppShell
          busy={busy}
          onSettings={() => undefined}
          onCreateRepository={() => void onCreateRepository()}
          onApplySelection={(paths) => void onApplySelection(paths)}
          onNeedMore={() => void loadMoreEntries()}
          onCommitAll={() => void onCommitAll()}
          onCancelComposer={() => useAppStore.getState().closeCommitComposer()}
          onCreateCommit={(fields) => void onCreateCommit(fields)}
        />
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
