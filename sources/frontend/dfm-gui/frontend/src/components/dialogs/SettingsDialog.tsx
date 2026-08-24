import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import {
  getSettings,
  saveAppearance,
  saveEditors,
  saveForester,
  saveProfile,
  saveRepos,
  selectDirectory,
  selectFile,
  type SettingsInfo,
} from "@/lib/bridge";
import { cn } from "@/lib/utils";
import xIcon from "@/assets/icons/x.svg";
import trash2 from "@/assets/icons/trash-2.svg";

type SettingsTab = "profile" | "appearance" | "repositories" | "editors" | "forester";

type SettingsDialogProps = {
  locale: Locale;
  onClose: () => void;
  onProfileSaved: (name: string, email: string, locale: Locale) => void;
  onError: (message: string) => void;
};

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "repositories", label: "Repositories" },
  { id: "editors", label: "External editors" },
  { id: "forester", label: "Backed (Forester)" },
];

function emptySettings(): SettingsInfo {
  return {
    userName: "",
    userEmail: "",
    locale: "en",
    theme: "light",
    repos: [],
    apiPath: "",
    foresterPath: "",
    blenderPath: "",
    addonPath: "",
    editors: [],
  };
}

export function SettingsDialog({ locale, onClose, onProfileSaved, onError }: SettingsDialogProps) {
  const copy = t(locale);
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<SettingsInfo>(emptySettings);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const info = await getSettings();
        if (!cancelled) {
          setDraft({
            ...info,
            repos: info.repos?.length ? info.repos : [],
            editors: info.editors?.length ? info.editors : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          onErrorRef.current(err instanceof Error ? err.message : "request failed");
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

  const heading =
    tab === "appearance"
      ? { title: "Appearance", body: "Customize the appearance of the app. Automatically switch between day and night themes." }
      : tab === "repositories"
        ? { title: "Repositories", body: "Manage you repository list" }
        : tab === "editors"
          ? { title: "External editors", body: "Manage you editors" }
          : tab === "forester"
            ? { title: "Forester", body: "Manage you repository backend" }
            : { title: "Profile", body: "This is how others will see you on the site." };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40" role="presentation" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative flex max-h-[min(1000px,calc(100vh-24px))] w-[min(1113px,calc(100vw-24px))] flex-col gap-6 overflow-hidden rounded-xl border border-border bg-background px-10 pb-16 pt-10 shadow-md"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="absolute right-[13px] top-[11px] flex size-6 items-center justify-center" aria-label={copy.close} onClick={onClose}>
          <FigmaIcon src={xIcon} size={16} />
        </button>
        <div className="flex w-full shrink-0 flex-col gap-6 pl-4">
          <div className="flex flex-col gap-1">
            <p id="settings-title" className="text-[24px] font-semibold leading-8 tracking-[-0.144px] text-foreground">
              Settings
            </p>
            <p className="text-[16px] leading-6 text-foreground-muted">Manage repository and your account settings</p>
          </div>
          <div className="h-px w-full bg-border" />
        </div>
        <div className="flex min-h-0 w-full flex-1 gap-10">
          <nav className="flex w-[184px] shrink-0 flex-col gap-1">
            {TABS.map((item) => (
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
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto">
              <div className="flex w-full flex-col gap-3">
                <p className="text-[18px] font-semibold leading-7 text-foreground">{heading.title}</p>
                <p className="text-[14px] leading-5 text-foreground-muted">{heading.body}</p>
                <div className="h-px w-full bg-border" />
              </div>
              {tab === "profile" ? (
                <ProfileFields draft={draft} busy={busy} onChange={setDraft} />
              ) : null}
              {tab === "appearance" ? (
                <AppearanceFields theme={draft.theme === "dark" ? "dark" : "light"} onChange={(theme) => setDraft({ ...draft, theme })} />
              ) : null}
              {tab === "repositories" ? (
                <RepositoryFields
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
                  draft={draft}
                  busy={busy}
                  onChange={setDraft}
                  onPickFile={(apply) => void pickFile(apply)}
                  onPickDir={(apply) => void pickDirectory(apply)}
                />
              ) : null}
              {tab === "forester" ? (
                <ForesterFields
                  draft={draft}
                  busy={busy}
                  onChange={setDraft}
                  onPickCli={() => void pickFile((path) => setDraft((current) => ({ ...current, foresterPath: path })))}
                />
              ) : null}
            </div>
            {tab === "profile" ? (
              <div className="flex justify-end">
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
                  Save Profile
                </Button>
              </div>
            ) : null}
            {tab === "appearance" ? (
              <div className="flex justify-end">
                <Button type="button" disabled={busy} onClick={() => void run(() => saveAppearance(draft.theme === "dark" ? "dark" : "light"))}>
                  Save Appearance
                </Button>
              </div>
            ) : null}
            {tab === "forester" ? (
              <div className="flex justify-end">
                <Button type="button" disabled={busy} onClick={() => void run(() => saveForester(draft.apiPath, draft.foresterPath))}>
                  Upgrade Forester
                </Button>
              </div>
            ) : null}
            {tab === "repositories" ? (
              <div className="flex w-full items-center justify-between">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => setDraft({ ...draft, repos: [...draft.repos, ""] })}>
                  Add repository
                </Button>
                <Button type="button" disabled={busy} onClick={() => void run(() => saveRepos(draft.repos))}>
                  Upgrade List
                </Button>
              </div>
            ) : null}
            {tab === "editors" ? (
              <div className="flex w-full items-center justify-between">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => setDraft({ ...draft, editors: [...draft.editors, ""] })}>
                  Add application
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => saveEditors(draft.blenderPath, draft.addonPath, draft.editors))}
                >
                  Upgrade list
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
  draft,
  busy,
  onChange,
}: {
  draft: SettingsInfo;
  busy: boolean;
  onChange: (next: SettingsInfo) => void;
}) {
  return (
    <>
      <Field label="Username">
        <Input value={draft.userName} disabled={busy} onChange={(event) => onChange({ ...draft, userName: event.target.value })} />
      </Field>
      <Field label="Email" hint="Used for commits and locks, like git user.email. ">
        <Input value={draft.userEmail} disabled={busy} onChange={(event) => onChange({ ...draft, userEmail: event.target.value })} />
      </Field>
      <div className="flex w-full flex-col gap-2">
        <p className="text-[14px] font-medium leading-5 text-foreground">Language</p>
        <div className="flex gap-2">
          <Button type="button" variant={draft.locale === "en" ? "primary" : "outline"} disabled={busy} onClick={() => onChange({ ...draft, locale: "en" })}>
            English
          </Button>
          <Button type="button" variant={draft.locale === "ru" ? "primary" : "outline"} disabled={busy} onClick={() => onChange({ ...draft, locale: "ru" })}>
            Русский
          </Button>
        </div>
        <p className="text-[14px] leading-5 text-foreground-muted">This is the language that will be used in the dashboard. </p>
      </div>
    </>
  );
}

function AppearanceFields({ theme, onChange }: { theme: "light" | "dark"; onChange: (theme: "light" | "dark") => void }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="text-[14px] leading-5 text-foreground-muted">Select the theme for the dashboard</p>
      <div className="flex flex-wrap items-start gap-6 pt-2">
        <ThemeCard label="Light" selected={theme === "light"} dark={false} onSelect={() => onChange("light")} />
        <ThemeCard label="Dark" selected={theme === "dark"} dark onSelect={() => onChange("dark")} />
      </div>
    </div>
  );
}

function ThemeCard({
  label,
  selected,
  dark,
  onSelect,
}: {
  label: string;
  selected: boolean;
  dark: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className="flex flex-col items-center gap-2" onClick={onSelect}>
      <div className={cn("rounded-lg border-2 p-1", selected ? "border-[#a1a1aa]" : "border-[#d4d4d8]")}>
        <div className={cn("flex flex-col gap-2.5 overflow-hidden rounded-lg p-2", dark ? "bg-foreground" : "bg-border")}>
          <div className={cn("flex w-full items-center gap-4 rounded p-2", dark ? "bg-[#27272a]" : "bg-background")}>
            <div className="flex flex-col gap-2">
              <div className={cn("h-4 w-[112px] rounded-full", dark ? "bg-[#52525b]" : "bg-background-light")} />
              <div className={cn("h-4 w-[140px] rounded-full", dark ? "bg-[#52525b]" : "bg-background-light")} />
            </div>
          </div>
          <div className={cn("flex items-center gap-4 rounded p-2", dark ? "bg-[#27272a]" : "bg-background")}>
            <div className={cn("size-6 rounded-full", dark ? "bg-[#52525b]" : "bg-background-light")} />
            <div className={cn("h-4 w-[200px] rounded-full", dark ? "bg-[#52525b]" : "bg-background-light")} />
          </div>
          <div className={cn("flex items-center gap-4 rounded p-2", dark ? "bg-[#27272a]" : "bg-background")}>
            <div className={cn("size-6 rounded-full", dark ? "bg-[#52525b]" : "bg-background-light")} />
            <div className={cn("h-4 w-[200px] rounded-full", dark ? "bg-[#52525b]" : "bg-background-light")} />
          </div>
        </div>
      </div>
      <p className="text-[14px] leading-5 text-foreground-muted">{label}</p>
    </button>
  );
}

function RepositoryFields({
  repos,
  busy,
  onChange,
  onPick,
}: {
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
  draft,
  busy,
  onChange,
  onPickFile,
  onPickDir,
}: {
  draft: SettingsInfo;
  busy: boolean;
  onChange: (next: SettingsInfo) => void;
  onPickFile: (apply: (path: string) => void) => void;
  onPickDir: (apply: (path: string) => void) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-3">
        <PathRow
          label="Blender"
          value={draft.blenderPath}
          busy={busy}
          onChange={(value) => onChange({ ...draft, blenderPath: value })}
          onSelect={() => onPickFile((path) => onChange({ ...draft, blenderPath: path }))}
          onRemove={() => onChange({ ...draft, blenderPath: "" })}
        />
        <PathRow
          label="Blender addon Difference Machine"
          value={draft.addonPath}
          busy={busy}
          onChange={(value) => onChange({ ...draft, addonPath: value })}
          onSelect={() => onPickDir((path) => onChange({ ...draft, addonPath: path }))}
          onRemove={() => onChange({ ...draft, addonPath: "" })}
        />
        <div className="h-px w-full bg-border" />
      </div>
      <p className="text-[18px] font-semibold leading-7 text-foreground">Other editors</p>
      {(draft.editors.length > 0 ? draft.editors : [""]).map((path, index) => {
        const rows = draft.editors.length > 0 ? draft.editors : [""];
        return (
          <PathRow
            key={index}
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
  draft,
  busy,
  onChange,
  onPickCli,
}: {
  draft: SettingsInfo;
  busy: boolean;
  onChange: (next: SettingsInfo) => void;
  onPickCli: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <Field label="Config File">
        <Input value={draft.apiPath} disabled={busy} onChange={(event) => onChange({ ...draft, apiPath: event.target.value })} />
      </Field>
      <PathRow
        label="Forester CLI App"
        value={draft.foresterPath}
        busy={busy}
        showRemove={false}
        onChange={(value) => onChange({ ...draft, foresterPath: value })}
        onSelect={onPickCli}
      />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex w-full max-w-[672px] flex-col gap-1">
      <p className="text-[14px] font-medium leading-5 text-foreground">{label}</p>
      {children}
      {hint ? <p className="text-[14px] leading-5 text-foreground-muted">{hint}</p> : null}
    </div>
  );
}

function PathRow({
  label,
  value,
  busy,
  onChange,
  onSelect,
  onRemove,
  showRemove = true,
}: {
  label?: string;
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSelect: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}) {
  return (
    <div className="flex w-full items-end gap-2">
      <div className="flex min-w-0 max-w-[672px] flex-1 flex-col gap-1">
        {label ? <p className="text-[14px] font-medium leading-5 text-foreground">{label}</p> : null}
        <Input value={value} disabled={busy} onChange={(event) => onChange(event.target.value)} />
      </div>
      <Button type="button" variant="outline" disabled={busy} onClick={onSelect}>
        Select
      </Button>
      {showRemove && onRemove ? (
        <Button type="button" variant="destructive" size="icon" disabled={busy} aria-label="Remove" onClick={onRemove}>
          <FigmaIcon src={trash2} size={16} />
        </Button>
      ) : null}
    </div>
  );
}
