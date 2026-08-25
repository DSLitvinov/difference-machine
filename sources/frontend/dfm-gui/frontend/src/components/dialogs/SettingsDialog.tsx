import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import {
  getSettings,
  saveEditors,
  saveForester,
  saveProfile,
  saveRepos,
  selectDirectory,
  selectFile,
  type SettingsInfo,
} from "@/lib/bridge";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "repositories" | "editors" | "forester";

type SettingsDialogProps = {
  locale: Locale;
  onClose: () => void;
  onLocale: (locale: Locale) => void;
  onProfileSaved: (name: string, email: string, locale: Locale) => void;
  onError: (message: string) => void;
};

function emptySettings(): SettingsInfo {
  return {
    userName: "",
    userEmail: "",
    locale: "en",
    repos: [],
    apiPath: "",
    foresterPath: "",
    blenderPath: "",
    addonPath: "",
    editors: [],
  };
}

export function SettingsDialog({ locale, onClose, onLocale, onProfileSaved, onError }: SettingsDialogProps) {
  const copy = t(locale);
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "profile", label: copy.tabProfile },
    { id: "repositories", label: copy.tabRepositories },
    { id: "editors", label: copy.tabEditors },
    { id: "forester", label: copy.tabForester },
  ];
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
            repos: info.repos,
            editors: info.editors,
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
    tab === "repositories"
      ? { title: copy.repositoriesTitle, body: copy.repositoriesBody }
      : tab === "editors"
        ? { title: copy.editorsTitle, body: copy.editorsBody }
        : tab === "forester"
          ? { title: copy.foresterTitle, body: copy.foresterBody }
          : { title: copy.profileTitle, body: copy.profileBody };

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
          <FigmaIcon src="icons/x.svg" size={16} />
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
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto">
              <div className="flex w-full flex-col gap-3">
                <p className="text-[18px] font-semibold leading-7 text-foreground">{heading.title}</p>
                <p className="text-[14px] leading-5 text-foreground-muted">{heading.body}</p>
                <div className="h-px w-full bg-border" />
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
                  onPickFile={(apply) => void pickFile(apply)}
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
                  onClick={() => void run(() => saveEditors(draft.blenderPath, draft.addonPath, draft.editors))}
                >
                  {copy.upgradeListEditors}
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
          <FigmaIcon src="icons/trash-2.svg" size={16} />
        </Button>
      ) : null}
    </div>
  );
}
