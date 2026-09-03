import { Trash2, X } from "lucide-react";
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
  setTheme as persistTheme,
  runGarbageCollection,
  foresterCall,
  type SettingsInfo,
} from "@/lib/bridge";
import { rememberEditorsFromSettings } from "@/lib/editors";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "appearance" | "repositories" | "editors" | "forester" | "gc" | "ignored";

type SettingsDialogProps = {
  locale: Locale;
  theme: UiTheme;
  onClose: () => void;
  onLocale: (locale: Locale) => void;
  onThemeSaved: (theme: UiTheme) => void;
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

export function SettingsDialog({ locale, theme, onClose, onLocale, onThemeSaved, onProfileSaved, onIgnoreSaved, onError }: SettingsDialogProps) {
  const copy = t(locale);
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "profile", label: copy.tabProfile },
    { id: "appearance", label: copy.tabAppearance },
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
    tab === "appearance"
      ? { title: copy.appearanceTitle, body: copy.appearanceBody }
      : tab === "repositories"
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

  const draftTheme: UiTheme = draft.theme === "dark" ? "dark" : "light";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="presentation" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative flex h-[720px] w-[min(1113px,calc(100vw-24px))] flex-col gap-6 overflow-hidden rounded-[16px] border border-border bg-background px-10 pb-16 pt-10 shadow-md"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="absolute right-3 top-3 flex size-6 items-center justify-center" aria-label={copy.close} onClick={onClose}>
          <Icon icon={X} size={16} />
        </button>
        <div className="flex w-full shrink-0 flex-col gap-6">
          <div className="flex flex-col gap-1 pl-4">
            <p id="settings-title" className="text-[24px] font-semibold leading-8 tracking-[-0.144px] text-foreground">
              {copy.settings}
            </p>
            <p className="text-[16px] leading-6 text-foreground-muted">{copy.settingsManage}</p>
          </div>
          <div className="h-px w-full bg-border" />
        </div>
        <div className="flex min-h-0 w-full flex-1 gap-10">
          <nav className="flex w-[184px] shrink-0 flex-col gap-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex h-10 w-full items-center rounded-md px-4 text-left text-[14px] font-medium leading-5 text-foreground",
                  tab === item.id && "bg-background-muted",
                )}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
            <div className={cn("flex min-h-0 flex-1 flex-col gap-8", tab === "ignored" ? "overflow-hidden" : "overflow-y-auto")}>
              <div className="flex w-full shrink-0 flex-col gap-3">
                <p className="text-[18px] font-semibold leading-7 text-foreground">{heading.title}</p>
                <p className="text-[14px] leading-5 text-foreground-muted">{heading.body}</p>
                <div className="h-px w-full bg-border" />
              </div>
              {tab === "profile" ? (
                <ProfileFields locale={locale} draft={draft} busy={busy} onChange={setDraft} onLocale={onLocale} />
              ) : null}
              {tab === "appearance" ? (
                <AppearanceFields locale={locale} theme={draftTheme} busy={busy} onChange={(next) => setDraft({ ...draft, theme: next })} />
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
            {tab === "appearance" ? (
              <div className="flex shrink-0 justify-end">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await persistTheme(draftTheme);
                      onThemeSaved(draftTheme);
                    })
                  }
                >
                  {copy.saveAppearance}
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

function AppearanceFields({
  locale,
  theme,
  busy,
  onChange,
}: {
  locale: Locale;
  theme: UiTheme;
  busy: boolean;
  onChange: (theme: UiTheme) => void;
}) {
  const copy = t(locale);
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="text-[14px] leading-5 text-foreground-muted">{copy.themeSelectHint}</p>
      <div className="flex flex-wrap items-start gap-6 pt-2">
        <ThemeCard locale={locale} mode="light" selected={theme === "light"} disabled={busy} onSelect={() => onChange("light")} />
        <ThemeCard locale={locale} mode="dark" selected={theme === "dark"} disabled={busy} onSelect={() => onChange("dark")} />
      </div>
    </div>
  );
}

function ThemeCard({
  locale,
  mode,
  selected,
  disabled,
  onSelect,
}: {
  locale: Locale;
  mode: UiTheme;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const copy = t(locale);
  const dark = mode === "dark";
  return (
    <button type="button" disabled={disabled} className="flex flex-col items-center gap-2" onClick={onSelect}>
      <div className={cn("rounded-md border-2 p-1", selected ? "border-foreground-disabled" : "border-border")}>
        <div className={cn("flex flex-col gap-2.5 overflow-hidden rounded-md p-2", dark ? "bg-[#09090b]" : "bg-[#e4e4e7]")}>
          <ThemeSkeleton dark={dark} wide />
          <ThemeSkeleton dark={dark} />
          <ThemeSkeleton dark={dark} />
        </div>
      </div>
      <span className="text-[14px] leading-5 text-foreground-muted">{dark ? copy.themeDark : copy.themeLight}</span>
    </button>
  );
}

function ThemeSkeleton({ dark, wide }: { dark: boolean; wide?: boolean }) {
  const bar = dark ? "bg-[#52525b]" : "bg-[#fafafa]";
  const card = dark ? "bg-[#27272a]" : "bg-white";
  return (
    <div className={cn("flex items-center gap-4 rounded p-2", card, wide && "w-full")}>
      {wide ? null : <div className={cn("size-6 shrink-0 rounded-full", bar)} />}
      <div className="flex flex-col gap-2">
        <div className={cn("h-4 rounded-full", bar, wide ? "w-[112px]" : "w-[200px]")} />
        {wide ? <div className={cn("h-4 w-[140px] rounded-full", bar)} /> : null}
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
    <div className="flex w-full flex-col gap-8">
      <Field label={copy.username}>
        <Input value={draft.userName} disabled={busy} onChange={(event) => onChange({ ...draft, userName: event.target.value })} />
      </Field>
      <Field label={copy.email} hint={copy.emailHint}>
        <Input value={draft.userEmail} disabled={busy} onChange={(event) => onChange({ ...draft, userEmail: event.target.value })} />
      </Field>
      <div className="flex w-full flex-col gap-2">
        <p className="text-[14px] font-medium leading-5 text-foreground">{copy.language}</p>
        <div className="flex gap-2">
          <Button type="button" variant={draft.locale === "en" ? "primary" : "outline"} disabled={busy} onClick={() => pickLocale("en")}>
            English
          </Button>
          <Button type="button" variant={draft.locale === "ru" ? "primary" : "outline"} disabled={busy} onClick={() => pickLocale("ru")}>
            Русский
          </Button>
        </div>
        <p className="text-[14px] leading-5 text-foreground-muted">{copy.languageHintSettings}</p>
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
    <div className="flex w-full flex-col gap-4">
      {rows.map((path, index) => (
        <PathRow
          key={index}
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
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-3">
        <PathRow
          locale={locale}
          label={copy.blender}
          value={draft.blenderPath}
          busy={busy}
          onChange={(value) => onChange({ ...draft, blenderPath: value })}
          onSelect={() => onPickFile((path) => onChange({ ...draft, blenderPath: path }))}
          onRemove={() => onChange({ ...draft, blenderPath: "" })}
        />
        <PathRow
          locale={locale}
          label={copy.blenderAddon}
          value={draft.addonPath}
          busy={busy}
          onChange={(value) => onChange({ ...draft, addonPath: value })}
          onSelect={() => onPickDir((path) => onChange({ ...draft, addonPath: path }))}
          onRemove={() => onChange({ ...draft, addonPath: "" })}
        />
        <div className="h-px w-full bg-border" />
      </div>
      <p className="text-[18px] font-semibold leading-7 text-foreground">{copy.otherEditors}</p>
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
    <div className="flex w-full flex-col gap-3">
      <Field label={copy.configFile}>
        <Input value={draft.apiPath} disabled={busy} onChange={(event) => onChange({ ...draft, apiPath: event.target.value })} />
      </Field>
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
    <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-border bg-background p-4 shadow-sm">
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
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <Switch
            checked={draft.gcEnabled}
            disabled={busy}
            className="border-0"
            onCheckedChange={(checked) => onChange({ ...draft, gcEnabled: checked })}
          />
          <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-foreground">{copy.gcEnabled}</span>
        </label>
        <GCNumberField
          className="w-[284px]"
          value={draft.gcReflogExpireDays}
          disabled={busy || !draft.gcEnabled}
          onChange={(value) => onChange({ ...draft, gcReflogExpireDays: value })}
        />
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <Switch
            checked={draft.gcScheduleEnabled}
            disabled={busy}
            className="border-0"
            onCheckedChange={(checked) => onChange({ ...draft, gcScheduleEnabled: checked })}
          />
          <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-foreground">{copy.gcScheduleEnabled}</span>
        </label>
        <div className="flex w-[284px] shrink-0 flex-col gap-1">
          <p className="text-[14px] font-medium leading-5 text-foreground">{copy.gcIntervalDays}</p>
          <GCNumberField
            value={draft.gcIntervalDays}
            disabled={busy || !draft.gcScheduleEnabled}
            onChange={(value) => onChange({ ...draft, gcIntervalDays: value })}
          />
        </div>
        <div className="flex w-[284px] shrink-0 flex-col gap-1">
          <p className="text-[14px] font-medium leading-5 text-foreground">{copy.gcScheduleTime}</p>
          <Input
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
      className={className}
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

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex w-full flex-col gap-1", className ?? "max-w-[672px]")}>
      <p className="text-[14px] font-medium leading-5 text-foreground">{label}</p>
      {children}
      {hint ? <p className="text-[14px] leading-5 text-foreground-muted">{hint}</p> : null}
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
    <div className="flex w-full items-end gap-2">
      <div className="flex min-w-0 max-w-[672px] flex-1 flex-col gap-1">
        {label ? <p className="text-[14px] font-medium leading-5 text-foreground">{label}</p> : null}
        <Input value={value} disabled={busy} onChange={(event) => onChange(event.target.value)} />
      </div>
      <Button type="button" variant="outline" disabled={busy} onClick={onSelect}>
        {copy.select}
      </Button>
      {showRemove && onRemove ? (
        <Button type="button" variant="destructive" size="icon" disabled={busy} aria-label={copy.remove} onClick={onRemove}>
          <Icon icon={Trash2} size={16} />
        </Button>
      ) : null}
    </div>
  );
}
