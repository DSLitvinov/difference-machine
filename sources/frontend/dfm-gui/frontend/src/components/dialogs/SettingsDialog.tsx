import { ChevronsUpDown, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";
import type { UiTheme } from "@/assets/themed";
import {
  getSettings,
  saveEditors,
  saveForester,
  saveGC,
  saveProfile,
  saveRepos,
  selectDirectory,
  selectFile,
  selectApplication,
  runGarbageCollection,
  foresterCall,
  type SettingsInfo,
} from "@/lib/bridge";
import { rememberEditorsFromSettings } from "@/lib/editors";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "repositories" | "editors" | "forester" | "gc" | "ignored";

type SettingsDialogProps = {
  locale: Locale;
  theme: UiTheme;
  onClose: () => void;
  onLocale: (locale: Locale) => void;
  onProfileSaved: (name: string, email: string, locale: Locale) => void;
  onIgnoreSaved?: () => void;
  onError: (message: string) => void;
};

function emptySettings(theme: UiTheme = "light"): SettingsInfo {
  return {
    userName: "",
    userEmail: "",
    locale: "en",
    theme,
    repos: [],
    apiPath: "",
    foresterPath: "",
    blenderPath: "",
    addonPath: "",
    editors: [],
    platform: "",
    hasRepository: false,
    gcEnabled: false,
    gcReflogExpireDays: 90,
    gcScheduleEnabled: false,
    gcIntervalDays: 7,
    gcScheduleHour: 7,
    gcScheduleMinute: 0,
  };
}

export function SettingsDialog({ locale, theme, onClose, onLocale, onProfileSaved, onIgnoreSaved, onError }: SettingsDialogProps) {
  const copy = t(locale);
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "profile", label: copy.tabProfile },
    { id: "repositories", label: copy.tabRepositories },
    { id: "editors", label: copy.tabEditors },
    { id: "forester", label: copy.tabForester },
    { id: "gc", label: copy.tabGC },
    { id: "ignored", label: copy.tabIgnored },
  ];
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<SettingsInfo>(() => emptySettings(theme));
  const [ignoreText, setIgnoreText] = useState("");
  const [ignoreReady, setIgnoreReady] = useState(false);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const info = await getSettings();
        if (cancelled) {
          return;
        }
        setDraft({
          ...info,
          theme: info.theme === "dark" ? "dark" : "light",
          repos: info.repos,
          editors: info.editors,
        });
        if (info.hasRepository) {
          try {
            const result = (await foresterCall("workdir.dfmignore.get")) as { content?: string };
            if (!cancelled) {
              setIgnoreText(typeof result.content === "string" ? result.content : "");
            }
          } catch (err) {
            if (!cancelled) {
              onErrorRef.current(err instanceof Error ? err.message : "request failed");
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          onErrorRef.current(err instanceof Error ? err.message : "request failed");
        }
      } finally {
        if (!cancelled) {
          setIgnoreReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      onError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function pickDirectory(apply: (path: string) => void) {
    try {
      const path = await selectDirectory();
      if (path) {
        apply(path);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "request failed");
    }
  }

  async function pickFile(apply: (path: string) => void) {
    try {
      const path = await selectFile();
      if (path) {
        apply(path);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "request failed");
    }
  }

  async function pickApplication(apply: (path: string) => void) {
    try {
      const path = await selectApplication();
      if (path) {
        apply(path);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "request failed");
    }
  }

  const heading =
    tab === "repositories"
        ? { title: copy.repositoriesTitle, body: copy.repositoriesBody }
        : tab === "editors"
          ? { title: copy.editorsTitle, body: copy.editorsBody }
          : tab === "forester"
            ? { title: copy.foresterTitle, body: copy.foresterBody }
            : tab === "gc"
              ? { title: copy.gcTitle, body: copy.gcBody }
              : tab === "ignored"
                ? { title: copy.ignoredTitle, body: copy.ignoredBody }
                : { title: copy.profileTitle, body: copy.profileBody };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="presentation" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative flex h-[720px] w-[min(1113px,calc(100vw-24px))] flex-col gap-6 overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:border-border dark:bg-background"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="absolute right-[13px] top-[11px] flex size-6 items-center justify-center p-0.5 text-[#18181b] dark:text-foreground" aria-label={copy.close} onClick={onClose}>
          <Icon icon={X} size={16} />
        </button>
        <div className="flex w-full shrink-0 flex-col gap-6 pl-4">
          <div className="flex flex-col gap-1">
            <p id="settings-title" className="text-[24px] font-semibold leading-8 tracking-[-0.144px] text-[#18181b] dark:text-foreground">
              {copy.settings}
            </p>
            <p className="text-base font-normal leading-6 text-[#71717a]">{copy.settingsManage}</p>
          </div>
          <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
        </div>
        <div className="flex min-h-0 w-full flex-1 gap-[18px]">
          <nav className="flex w-[190px] shrink-0 flex-col gap-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex w-full items-center rounded-[10px] px-2.5 py-2 text-left text-sm font-medium leading-5 text-[#18181b] dark:text-foreground",
                  tab === item.id && "bg-[#e4e4e7] dark:bg-background-muted",
                )}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
            <div className={cn("flex min-h-0 flex-1 flex-col gap-2", tab === "ignored" ? "overflow-hidden" : "overflow-y-auto")}>
              <div className="flex w-full shrink-0 flex-col gap-2">
                <p className="text-[18px] font-medium leading-7 text-[#18181b] dark:text-foreground">{heading.title}</p>
                <p className="text-sm font-normal leading-5 text-[#71717a]">{heading.body}</p>
                <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
              </div>
              {tab === "profile" ? (
                <ProfileFields locale={locale} draft={draft} busy={busy} onChange={setDraft} onLocale={onLocale} />
              ) : null}
              {tab === "repositories" ? (
                <RepositoryFields
                  locale={locale}
                  repos={draft.repos}
                  busy={busy}
                  onChange={(repos) => setDraft({ ...draft, repos })}
                  onPick={(index) =>
                    void pickDirectory((path) =>
                      setDraft((current) => {
                        const rows = current.repos.length > 0 ? current.repos : [""];
                        return { ...current, repos: rows.map((item, i) => (i === index ? path : item)) };
                      }),
                    )
                  }
                />
              ) : null}
              {tab === "editors" ? (
                <EditorFields
                  locale={locale}
                  draft={draft}
                  busy={busy}
                  onChange={setDraft}
                  onPickFile={(apply) => void pickApplication(apply)}
                  onPickDir={(apply) => void pickDirectory(apply)}
                />
              ) : null}
              {tab === "forester" ? (
                <ForesterFields
                  locale={locale}
                  draft={draft}
                  busy={busy}
                  onChange={setDraft}
                  onPickCli={() => void pickFile((path) => setDraft((current) => ({ ...current, foresterPath: path })))}
                />
              ) : null}
              {tab === "gc" ? (
                <GCFields locale={locale} draft={draft} busy={busy} onChange={setDraft} />
              ) : null}
              {tab === "ignored" ? (
                <IgnoreFields
                  key={ignoreReady ? "ready" : "loading"}
                  locale={locale}
                  value={ignoreText}
                  disabled={busy || !draft.hasRepository || !ignoreReady}
                  onChange={setIgnoreText}
                />
              ) : null}
            </div>
            {tab === "profile" ? (
              <div className="flex shrink-0 justify-end">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const nextLocale: Locale = draft.locale === "ru" ? "ru" : "en";
                      await saveProfile(draft.userName, draft.userEmail, nextLocale);
                      onProfileSaved(draft.userName.trim(), draft.userEmail.trim(), nextLocale);
                    })
                  }
                >
                  {copy.saveProfile}
                </Button>
              </div>
            ) : null}
            {tab === "forester" ? (
              <div className="flex shrink-0 justify-end">
                <Button type="button" disabled={busy} onClick={() => void run(() => saveForester(draft.apiPath, draft.foresterPath))}>
                  {copy.upgradeForester}
                </Button>
              </div>
            ) : null}
            {tab === "gc" ? (
              <div className="flex w-full shrink-0 items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !draft.hasRepository}
                  onClick={() =>
                    void run(async () => {
                      await runGarbageCollection(draft.gcReflogExpireDays);
                    })
                  }
                >
                  {copy.gcRunNow}
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      saveGC(
                        draft.gcEnabled,
                        draft.gcReflogExpireDays,
                        draft.gcScheduleEnabled,
                        draft.gcIntervalDays,
                        draft.gcScheduleHour,
                        draft.gcScheduleMinute,
                      ),
                    )
                  }
                >
                  {copy.gcSave}
                </Button>
              </div>
            ) : null}
            {tab === "repositories" ? (
              <div className="flex w-full shrink-0 items-center justify-between">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => setDraft({ ...draft, repos: [...draft.repos, ""] })}>
                  {copy.addRepository}
                </Button>
                <Button type="button" disabled={busy} onClick={() => void run(() => saveRepos(draft.repos))}>
                  {copy.upgradeList}
                </Button>
              </div>
            ) : null}
            {tab === "editors" ? (
              <div className="flex w-full shrink-0 items-center justify-between">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => setDraft({ ...draft, editors: [...draft.editors, ""] })}>
                  {copy.addApplication}
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await saveEditors(draft.blenderPath, draft.addonPath, draft.editors);
                      rememberEditorsFromSettings(draft);
                    })
                  }
                >
                  {copy.upgradeListEditors}
                </Button>
              </div>
            ) : null}
            {tab === "ignored" ? (
              <div className="flex shrink-0 justify-end">
                <Button
                  type="button"
                  disabled={busy || !draft.hasRepository || !ignoreReady}
                  onClick={() =>
                    void run(async () => {
                      await foresterCall("workdir.dfmignore.set", { content: ignoreText });
                      onIgnoreSaved?.();
                    })
                  }
                >
                  {copy.ignoredSave}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileFields({
  locale,
  draft,
  busy,
  onChange,
  onLocale,
}: {
  locale: Locale;
  draft: SettingsInfo;
  busy: boolean;
  onChange: (next: SettingsInfo) => void;
  onLocale: (locale: Locale) => void;
}) {
  const copy = t(locale);
  function pickLocale(next: Locale) {
    onChange({ ...draft, locale: next });
    onLocale(next);
  }
  return (
    <div className="flex w-full flex-col gap-5 overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#fafafa] py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background-light">
      <Field label={copy.username}>
        <Input className={settingsInputClass} value={draft.userName} disabled={busy} onChange={(event) => onChange({ ...draft, userName: event.target.value })} />
      </Field>
      <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
      <Field label={copy.email} hint={copy.emailHint}>
        <Input className={settingsInputClass} value={draft.userEmail} disabled={busy} onChange={(event) => onChange({ ...draft, userEmail: event.target.value })} />
      </Field>
      <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
      <div className="flex w-full flex-col gap-1 px-5">
        <p className="text-sm font-medium leading-5 text-[#18181b] dark:text-foreground">{copy.language}</p>
        <div className="relative w-full">
          <select
            className="flex h-7 w-full appearance-none rounded-md border border-[#d4d4d8] bg-white pl-2.5 pr-8 text-sm leading-5 text-[#18181b] shadow-[0_1px_2px_rgba(0,0,0,0.05)] focus-visible:border-[#60a5fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0c9fc] disabled:cursor-not-allowed disabled:border-[#e4e4e7] disabled:text-[#a1a1aa] disabled:shadow-none dark:border-border dark:bg-background dark:text-foreground"
            value={draft.locale === "ru" ? "ru" : "en"}
            disabled={busy}
            onChange={(event) => pickLocale(event.target.value === "ru" ? "ru" : "en")}
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
          <Icon icon={ChevronsUpDown} size={16} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[#18181b] dark:text-foreground" />
        </div>
        <p className="text-sm font-normal leading-5 text-[#71717a]">{copy.languageHintSettings}</p>
      </div>
    </div>
  );
}

function RepositoryFields({
  locale,
  repos,
  busy,
  onChange,
  onPick,
}: {
  locale: Locale;
  repos: string[];
  busy: boolean;
  onChange: (repos: string[]) => void;
  onPick: (index: number) => void;
}) {
  const rows = repos.length > 0 ? repos : [""];
  return (
    <div className="flex w-full flex-col gap-5 overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#fafafa] py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background-light">
      {rows.map((path, index) => (
        <div key={index} className="flex w-full flex-col gap-5">
          {index > 0 ? <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" /> : null}
          <PathRow
            locale={locale}
            value={path}
            busy={busy}
            onChange={(value) => {
              const next = rows.map((item, i) => (i === index ? value : item));
              onChange(next);
            }}
            onSelect={() => onPick(index)}
            onRemove={() => onChange(rows.filter((_, i) => i !== index))}
          />
        </div>
      ))}
    </div>
  );
}

function EditorFields({
  locale,
  draft,
  busy,
  onChange,
  onPickFile,
  onPickDir,
}: {
  locale: Locale;
  draft: SettingsInfo;
  busy: boolean;
  onChange: (next: SettingsInfo) => void;
  onPickFile: (apply: (path: string) => void) => void;
  onPickDir: (apply: (path: string) => void) => void;
}) {
  const copy = t(locale);
  return (
    <div className="flex w-full flex-col gap-5 overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#fafafa] py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background-light">
      <PathRow
        locale={locale}
        label={copy.blender}
        value={draft.blenderPath}
        busy={busy}
        onChange={(value) => onChange({ ...draft, blenderPath: value })}
        onSelect={() => onPickFile((path) => onChange({ ...draft, blenderPath: path }))}
        onRemove={() => onChange({ ...draft, blenderPath: "" })}
      />
      <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
      <PathRow
        locale={locale}
        label={copy.blenderAddon}
        value={draft.addonPath}
        busy={busy}
        onChange={(value) => onChange({ ...draft, addonPath: value })}
        onSelect={() => onPickDir((path) => onChange({ ...draft, addonPath: path }))}
        onRemove={() => onChange({ ...draft, addonPath: "" })}
      />
      <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
      <p className="px-5 text-[18px] font-medium leading-7 text-[#18181b] dark:text-foreground">{copy.otherEditors}</p>
      {(draft.editors.length > 0 ? draft.editors : [""]).map((path, index) => {
        const rows = draft.editors.length > 0 ? draft.editors : [""];
        return (
          <PathRow
            key={index}
            locale={locale}
            value={path}
            busy={busy}
            onChange={(value) => onChange({ ...draft, editors: rows.map((item, i) => (i === index ? value : item)) })}
            onSelect={() => onPickFile((next) => onChange({ ...draft, editors: rows.map((item, i) => (i === index ? next : item)) }))}
            onRemove={() => onChange({ ...draft, editors: rows.filter((_, i) => i !== index) })}
          />
        );
      })}
    </div>
  );
}

function ForesterFields({
  locale,
  draft,
  busy,
  onChange,
  onPickCli,
}: {
  locale: Locale;
  draft: SettingsInfo;
  busy: boolean;
  onChange: (next: SettingsInfo) => void;
  onPickCli: () => void;
}) {
  const copy = t(locale);
  return (
    <div className="flex w-full flex-col gap-5 overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#fafafa] py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background-light">
      <Field label={copy.configFile}>
        <Input className={settingsInputClass} value={draft.apiPath} disabled={busy} onChange={(event) => onChange({ ...draft, apiPath: event.target.value })} />
      </Field>
      <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
      <PathRow
        locale={locale}
        label={copy.foresterCli}
        value={draft.foresterPath}
        busy={busy}
        showRemove={false}
        onChange={(value) => onChange({ ...draft, foresterPath: value })}
        onSelect={onPickCli}
      />
    </div>
  );
}

type IgnoreSnapshot = {
  text: string;
  start: number;
  end: number;
};

type IgnoreHistory = {
  entries: IgnoreSnapshot[];
  index: number;
};

const ignoreUndoGapMs = 400;
const ignoreUndoLimit = 200;

function ignoreSnapshot(text: string, start: number, end: number): IgnoreSnapshot {
  return { text, start, end };
}

function IgnoreFields({
  locale,
  value,
  disabled,
  onChange,
}: {
  locale: Locale;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const copy = t(locale);
  const gutterRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<IgnoreHistory>({ entries: [ignoreSnapshot(value, 0, 0)], index: 0 });
  const lastRecordAtRef = useRef(0);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const lineCount = Math.max(1, value.split("\n").length);

  useEffect(() => {
    const sel = pendingSelectionRef.current;
    const el = areaRef.current;
    if (!sel || !el) {
      return;
    }
    pendingSelectionRef.current = null;
    const max = el.value.length;
    el.setSelectionRange(Math.min(sel.start, max), Math.min(sel.end, max));
  }, [value]);

  function record(el: HTMLTextAreaElement) {
    const next = ignoreSnapshot(el.value, el.selectionStart, el.selectionEnd);
    const history = historyRef.current;
    const current = history.entries[history.index];
    if (current && current.text === next.text) {
      history.entries[history.index] = next;
      return;
    }
    const now = Date.now();
    if (current && now - lastRecordAtRef.current < ignoreUndoGapMs && history.index === history.entries.length - 1) {
      history.entries[history.index] = next;
      lastRecordAtRef.current = now;
      return;
    }
    history.entries = history.entries.slice(0, history.index + 1);
    history.entries.push(next);
    if (history.entries.length > ignoreUndoLimit) {
      history.entries.shift();
    }
    history.index = history.entries.length - 1;
    lastRecordAtRef.current = now;
  }

  function restore(entry: IgnoreSnapshot) {
    pendingSelectionRef.current = { start: entry.start, end: entry.end };
    onChange(entry.text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (disabled) {
      return;
    }
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || event.altKey) {
      return;
    }
    const key = event.key.toLowerCase();
    const isUndo = key === "z" && !event.shiftKey;
    const isRedo = (key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey);
    if (!isUndo && !isRedo) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const history = historyRef.current;
    if (isUndo) {
      if (history.index <= 0) {
        return;
      }
      history.index -= 1;
      restore(history.entries[history.index]);
      return;
    }
    if (history.index >= history.entries.length - 1) {
      return;
    }
    history.index += 1;
    restore(history.entries[history.index]);
  }

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background-light">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="w-10 shrink-0 overflow-hidden border-r border-border" aria-hidden>
          <div ref={gutterRef}>
            {Array.from({ length: lineCount }, (_, index) => (
              <div key={index} className="flex h-6 w-full shrink-0 items-center justify-center px-4 text-[16px] leading-6 text-foreground-muted">
                <span className="min-w-3 text-center">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <textarea
          ref={areaRef}
          aria-label={copy.ignoredTitle}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          wrap="off"
          disabled={disabled}
          value={value}
          className="min-h-0 min-w-0 flex-1 resize-none overflow-auto whitespace-pre bg-transparent p-0 pl-1 font-normal text-[16px] leading-6 text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
          onChange={(event) => {
            record(event.currentTarget);
            onChange(event.currentTarget.value);
          }}
          onKeyDown={onKeyDown}
          onScroll={(event) => {
            if (gutterRef.current) {
              gutterRef.current.style.transform = `translateY(${-event.currentTarget.scrollTop}px)`;
            }
          }}
        />
      </div>
    </div>
  );
}

function GCFields({
  locale,
  draft,
  busy,
  onChange,
}: {
  locale: Locale;
  draft: SettingsInfo;
  busy: boolean;
  onChange: (next: SettingsInfo) => void;
}) {
  const copy = t(locale);
  const [timeText, setTimeText] = useState(() => formatHM(draft.gcScheduleHour, draft.gcScheduleMinute));
  useEffect(() => {
    setTimeText(formatHM(draft.gcScheduleHour, draft.gcScheduleMinute));
  }, [draft.gcScheduleHour, draft.gcScheduleMinute]);

  function commitTime(raw: string) {
    const parsed = parseHM(raw);
    if (!parsed) {
      setTimeText(formatHM(draft.gcScheduleHour, draft.gcScheduleMinute));
      return;
    }
    setTimeText(formatHM(parsed.hour, parsed.minute));
    onChange({ ...draft, gcScheduleHour: parsed.hour, gcScheduleMinute: parsed.minute });
  }

  return (
    <div className="flex w-full flex-col gap-5 overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#fafafa] py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-border dark:bg-background-light">
      <div className="flex flex-col gap-3 px-5">
        <label className="flex items-center gap-2">
          <Switch
            checked={draft.gcEnabled}
            disabled={busy}
            className="border-0"
            onCheckedChange={(checked) => onChange({ ...draft, gcEnabled: checked })}
          />
          <span className="whitespace-nowrap text-sm font-normal leading-5 text-[#18181b] dark:text-foreground">{copy.gcEnabled}</span>
        </label>
        <GCNumberField
          className="w-[284px]"
          value={draft.gcReflogExpireDays}
          disabled={busy || !draft.gcEnabled}
          onChange={(value) => onChange({ ...draft, gcReflogExpireDays: value })}
        />
      </div>
      <div className="h-px w-full bg-[#e4e4e7] dark:bg-border" />
      <div className="flex flex-col gap-3 px-5">
        <label className="flex items-center gap-2">
          <Switch
            checked={draft.gcScheduleEnabled}
            disabled={busy}
            className="border-0"
            onCheckedChange={(checked) => onChange({ ...draft, gcScheduleEnabled: checked })}
          />
          <span className="whitespace-nowrap text-sm font-normal leading-5 text-[#18181b] dark:text-foreground">{copy.gcScheduleEnabled}</span>
        </label>
        <div className="flex w-[284px] shrink-0 flex-col gap-1">
          <p className="text-sm font-medium leading-5 text-[#18181b] dark:text-foreground">{copy.gcIntervalDays}</p>
          <GCNumberField
            value={draft.gcIntervalDays}
            disabled={busy || !draft.gcScheduleEnabled}
            onChange={(value) => onChange({ ...draft, gcIntervalDays: value })}
          />
        </div>
        <div className="flex w-[284px] shrink-0 flex-col gap-1">
          <p className="text-sm font-medium leading-5 text-[#18181b] dark:text-foreground">{copy.gcScheduleTime}</p>
          <Input
            className={settingsInputClass}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={timeText}
            disabled={busy || !draft.gcScheduleEnabled}
            onChange={(event) => {
              const raw = event.target.value;
              setTimeText(raw);
              const parsed = parseHM(raw);
              if (parsed) {
                onChange({ ...draft, gcScheduleHour: parsed.hour, gcScheduleMinute: parsed.minute });
              }
            }}
            onBlur={() => commitTime(timeText)}
          />
        </div>
      </div>
    </div>
  );
}

function GCNumberField({
  value,
  disabled,
  onChange,
  className,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <Input
      className={cn(settingsInputClass, className)}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={String(value)}
      disabled={disabled}
      onChange={(event) => onChange(parseIntField(event.target.value, value))}
    />
  );
}

function formatHM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseHM(raw: string): { hour: number; minute: number } | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

function parseIntField(raw: string, fallback: number): number {
  if (raw.trim() === "") {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

const settingsInputClass =
  "h-7 rounded-md py-1";

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex w-full flex-col gap-1 px-5", className)}>
      <p className="text-sm font-medium leading-5 text-[#18181b] dark:text-foreground">{label}</p>
      {children}
      {hint ? <p className="text-sm font-normal leading-5 text-[#71717a]">{hint}</p> : null}
    </div>
  );
}

function PathRow({
  locale,
  label,
  value,
  busy,
  onChange,
  onSelect,
  onRemove,
  showRemove = true,
}: {
  locale: Locale;
  label?: string;
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSelect: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}) {
  const copy = t(locale);
  return (
    <div className={cn("flex w-full gap-2 px-5", label ? "items-end" : "items-center")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {label ? <p className="text-sm font-medium leading-5 text-[#18181b] dark:text-foreground">{label}</p> : null}
        <Input className={settingsInputClass} value={value} disabled={busy} onChange={(event) => onChange(event.target.value)} />
      </div>
      <Button type="button" variant="outline" disabled={busy} onClick={onSelect}>
        {copy.select}
      </Button>
      {showRemove && onRemove ? (
        <Button type="button" variant="outline" size="icon" disabled={busy} aria-label={copy.remove} onClick={onRemove}>
          <Icon icon={Trash2} size={16} />
        </Button>
      ) : null}
    </div>
  );
}
