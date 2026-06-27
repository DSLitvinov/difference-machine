import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { SettingsLabeledPathRow, SettingsPathListRow } from "@/components/settings/SettingsPathRow";
import { ThemePreviewCard } from "@/components/settings/ThemePreviewCard";
import { useRepositoryAdd } from "@/components/shell/RepositoryAddProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LANGUAGE_LABELS, normalizeLanguage, translate, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { GuiFont, GuiTheme } from "@/lib/applyAppearance";
import { applyAppearance, persistAppearanceLocal } from "@/lib/applyAppearance";
import { useAppStore, type GuiLanguage } from "@/stores/appStore";
import {
  fetchSettings,
  pickSettingsFile,
  pickSettingsFolder,
  resolveAppearanceFromSettings,
  resolveExternalEditorPaths,
  saveSettingsAppearance,
  saveSettingsEditors,
  saveSettingsForester,
  saveSettingsProfile,
  saveSettingsRepos,
} from "@/wails/settings";
import { openRepository } from "@/wails/bridge";

type SettingsTab = "profile" | "appearance" | "repositories" | "external-editors" | "forester";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const setRepo = useAppStore((s) => s.setRepo);
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const setUserNameInStore = useAppStore((s) => s.setUserName);
  const setLanguageInStore = useAppStore((s) => s.setLanguage);
  const setExternalEditorPaths = useAppStore((s) => s.setExternalEditorPaths);
  const repoPath = useAppStore((s) => s.repoPath);
  const t = useT();

  const [tab, setTab] = useState<SettingsTab>("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [repos, setRepos] = useState<string[]>([]);
  const [editors, setEditors] = useState<string[]>([]);
  const [foresterCli, setForesterCli] = useState("");
  const [blenderPath, setBlenderPath] = useState("");
  const [addonPath, setAddonPath] = useState("");
  const [configPath, setConfigPath] = useState("");
  const [theme, setTheme] = useState<GuiTheme>("light");
  const [font, setFont] = useState<GuiFont>("inter");
  const [language, setLanguage] = useState<GuiLanguage>("en");
  const { pickRepositoryPath } = useRepositoryAdd();

  useEffect(() => {
    if (!open || loading) return;
    setExternalEditorPaths(resolveExternalEditorPaths(editors, blenderPath));
  }, [open, loading, editors, blenderPath, setExternalEditorPaths]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSettings();
        if (cancelled) return;
        setUserName(data.userName ?? "");
        setUserEmail(data.userEmail ?? "");
        setUserNameInStore(data.userName ?? "");
        const nextLanguage = normalizeLanguage(data.language);
        setLanguage(nextLanguage);
        setLanguageInStore(nextLanguage);
        document.documentElement.lang = nextLanguage;
        setRepos(data.repos ?? []);
        setEditors(data.editors ?? []);
        setForesterCli(data.foresterCli ?? "");
        setBlenderPath(data.blenderPath ?? "");
        setAddonPath(data.addonPath ?? "");
        setExternalEditorPaths(resolveExternalEditorPaths(data.editors ?? [], data.blenderPath ?? ""));
        setConfigPath(data.configPath ?? "");
        const appearance = resolveAppearanceFromSettings(data);
        setTheme(appearance.theme);
        setFont(appearance.font);
        applyAppearance(appearance.theme, appearance.font);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, setError, setExternalEditorPaths, setLanguageInStore, setUserNameInStore]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await saveSettingsProfile(userName, userEmail, language);
      setUserNameInStore(userName);
      setLanguageInStore(language);
      document.documentElement.lang = language;
      setNotice(translate(language, "common.profileSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRepos = async () => {
    setSaving(true);
    try {
      await saveSettingsRepos(repos);
      setNotice(t("common.repositoryListSaved"));
      const data = await fetchSettings();
      if (repoPath) {
        const stillCurrent = data.repos.some((p) => p === repoPath);
        if (!stillCurrent) {
          if (data.repos[0]) {
            const state = await openRepository(data.repos[0]);
            setRepo(
              state.repoPath,
              state.repoName,
              typeof state.status.current_branch === "string"
                ? state.status.current_branch
                : null,
            );
          } else {
            setRepo(null, null, null);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditors = async () => {
    setSaving(true);
    try {
      await saveSettingsEditors(editors.filter((path) => path.trim() !== ""));
      await saveSettingsForester(foresterCli, blenderPath, addonPath);
      setExternalEditorPaths(resolveExternalEditorPaths(editors, blenderPath));
      setNotice(t("settings.externalEditorsSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveForester = async () => {
    setSaving(true);
    try {
      await saveSettingsForester(foresterCli, blenderPath, addonPath);
      setNotice(t("common.foresterSettingsSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    setSaving(true);
    try {
      await saveSettingsAppearance(theme, font);
      persistAppearanceLocal(theme, font);
      setNotice(t("settings.appearanceSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleThemeSelect = (next: GuiTheme) => {
    setTheme(next);
    applyAppearance(next, font);
  };

  const tabs: { id: SettingsTab; label: string; disabled?: boolean; title?: string }[] = [
    { id: "profile", label: t("common.profile") },
    { id: "appearance", label: t("settings.appearance") },
    { id: "repositories", label: t("settings.repositories") },
    { id: "external-editors", label: t("settings.externalEditors") },
    { id: "forester", label: t("common.forester") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl gap-0 p-0">
        <div className="flex h-[80vh] min-h-[640px] flex-col px-10 pb-10 pt-10">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-xl">{t("common.settings")}</DialogTitle>
          </DialogHeader>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">
            {t("settings.manageSettings")}
          </p>
          <div className="flex min-h-0 flex-1 gap-8 border-t border-border pt-6">
            <nav className="w-[184px] shrink-0 space-y-1">
              {tabs.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-10 w-full justify-start px-3 text-sm font-medium",
                    tab === item.id ? "bg-accent text-foreground" : "text-muted-foreground",
                    item.disabled && "cursor-not-allowed opacity-50",
                  )}
                  disabled={item.disabled}
                  title={item.title}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {tab === "profile" ? (
                    <>
                      <h3 className="text-lg font-semibold">{t("common.profile")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("settings.profileDescription")}
                      </p>
                      <Separator className="my-4" />
                      <div className="max-w-md space-y-4">
                        <div>
                          <Label className="mb-2 block">{t("settings.username")}</Label>
                          <Input
                            value={userName}
                            placeholder={t("settings.yourName")}
                            onChange={(e) => setUserName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">{t("settings.email")}</Label>
                          <Input
                            type="email"
                            value={userEmail}
                            placeholder={t("settings.yourEmail")}
                            onChange={(e) => setUserEmail(e.target.value)}
                            autoComplete="email"
                          />
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("settings.profileEmailHint")}
                          </p>
                        </div>
                        <div>
                          <Label className="mb-2 block">{t("common.language")}</Label>
                          <div className="flex gap-2">
                            {(["en", "ru"] as const).map((item) => (
                              <Button
                                key={item}
                                type="button"
                                variant={language === item ? "default" : "outline"}
                                size="sm"
                                onClick={() => setLanguage(item)}
                              >
                                {LANGUAGE_LABELS[item]}
                              </Button>
                            ))}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("settings.dashboardLanguageHint")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto flex justify-end pt-6">
                        <Button disabled={saving} onClick={() => void handleSaveProfile()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t("common.saveProfile")}
                        </Button>
                      </div>
                    </>
                  ) : null}

                  {tab === "appearance" ? (
                    <>
                      <h3 className="text-lg font-semibold">{t("settings.appearance")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("settings.appearanceDescription")}
                      </p>
                      <Separator className="my-4" />
                      <div className="max-w-md space-y-6">
                        <div>
                          <Label className="mb-2 block">{t("settings.font")}</Label>
                          <Input value="Inter" disabled className="max-w-[348px]" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("settings.dashboardFontHint")}
                          </p>
                        </div>
                        <div>
                          <Label className="mb-2 block">{t("settings.theme")}</Label>
                          <p className="mb-4 text-sm text-muted-foreground">
                            {t("settings.dashboardThemeHint")}
                          </p>
                          <div className="flex flex-wrap gap-6">
                            <ThemePreviewCard
                              theme="light"
                              selected={theme === "light"}
                              onSelect={() => handleThemeSelect("light")}
                            />
                            <ThemePreviewCard
                              theme="dark"
                              selected={theme === "dark"}
                              onSelect={() => handleThemeSelect("dark")}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto flex justify-end pt-6">
                        <Button disabled={saving} onClick={() => void handleSaveAppearance()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t("common.saveAppearance")}
                        </Button>
                      </div>
                    </>
                  ) : null}

                  {tab === "repositories" ? (
                    <>
                      <h3 className="text-lg font-semibold">{t("settings.repositories")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t("settings.manageRepos")}</p>
                      <Separator className="my-4" />
                      <div className="min-h-0 flex-1 space-y-2 overflow-auto">
                        {repos.map((path, index) => (
                          <SettingsPathListRow
                            key={`${path}-${index}`}
                            path={path}
                            onSelect={async () => {
                              await pickRepositoryPath((picked) => {
                                setRepos((list) => list.map((item, i) => (i === index ? picked : item)));
                              });
                            }}
                            onRemove={() => setRepos((list) => list.filter((_, i) => i !== index))}
                          />
                        ))}
                      </div>
                      <div className="mt-auto flex justify-between pt-6">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            void pickRepositoryPath((picked) => {
                              setRepos((list) => [...list, picked]);
                            })
                          }
                        >
                          {t("common.addRepository")}
                        </Button>
                        <Button disabled={saving} onClick={() => void handleSaveRepos()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t("common.saveList")}
                        </Button>
                      </div>
                    </>
                  ) : null}

                  {tab === "external-editors" ? (
                    <>
                      <h3 className="text-lg font-semibold">{t("settings.externalEditors")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t("settings.manageEditors")}</p>
                      <Separator className="my-4" />
                      <div className="min-h-0 flex-1 space-y-4 overflow-auto">
                        <SettingsLabeledPathRow
                          label={t("common.blenderExecutable")}
                          value={blenderPath}
                          optional
                          onChange={setBlenderPath}
                          onSelect={async () => {
                            const picked = await pickSettingsFile();
                            if (picked) setBlenderPath(picked);
                          }}
                          onClear={() => setBlenderPath("")}
                        />
                        <SettingsLabeledPathRow
                          label={t("common.blenderAddon")}
                          value={addonPath}
                          optional
                          onChange={setAddonPath}
                          onSelect={async () => {
                            const picked = await pickSettingsFolder();
                            if (picked) setAddonPath(picked);
                          }}
                          onClear={() => setAddonPath("")}
                        />
                        <Separator />
                        {editors.map((path, index) => (
                          <SettingsPathListRow
                            key={`${path}-${index}`}
                            path={path}
                            onSelect={async () => {
                              const picked = await pickSettingsFile();
                              if (!picked) return;
                              setEditors((list) => list.map((item, i) => (i === index ? picked : item)));
                            }}
                            onRemove={() => setEditors((list) => list.filter((_, i) => i !== index))}
                          />
                        ))}
                      </div>
                      <div className="mt-auto flex justify-between pt-6">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setEditors((list) => [...list, ""])}
                        >
                          {t("settings.addApplication")}
                        </Button>
                        <Button disabled={saving} onClick={() => void handleSaveEditors()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t("common.saveList")}
                        </Button>
                      </div>
                    </>
                  ) : null}

                  {tab === "forester" ? (
                    <>
                      <h3 className="text-lg font-semibold">{t("common.forester")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t("settings.foresterDescription")}</p>
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        <div>
                          <Label className="mb-2 block text-sm text-muted-foreground">
                            {t("common.configFile")}
                          </Label>
                          <Input value={configPath} readOnly className="font-mono text-xs" />
                        </div>
                        <SettingsLabeledPathRow
                          label={t("common.foresterCli")}
                          value={foresterCli}
                          onChange={setForesterCli}
                          onSelect={async () => {
                            const picked = await pickSettingsFile();
                            if (picked) setForesterCli(picked);
                          }}
                        />
                      </div>
                      <div className="mt-auto flex justify-end pt-6">
                        <Button disabled={saving} onClick={() => void handleSaveForester()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t("common.saveSettings")}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
