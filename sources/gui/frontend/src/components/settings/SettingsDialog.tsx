import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { SettingsLabeledPathRow, SettingsPathListRow } from "@/components/settings/SettingsPathRow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import {
  fetchSettings,
  pickSettingsFile,
  pickSettingsFolder,
  saveSettingsEditors,
  saveSettingsForester,
  saveSettingsProfile,
  saveSettingsRepos,
} from "@/wails/settings";
import { openRepository, pickRepositoryFolder } from "@/wails/bridge";

type SettingsTab = "profile" | "repositories" | "external-editors" | "forester";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const setRepo = useAppStore((s) => s.setRepo);
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const repoPath = useAppStore((s) => s.repoPath);

  const [tab, setTab] = useState<SettingsTab>("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [repos, setRepos] = useState<string[]>([]);
  const [editors, setEditors] = useState<string[]>([]);
  const [foresterCli, setForesterCli] = useState("");
  const [blenderPath, setBlenderPath] = useState("");
  const [addonPath, setAddonPath] = useState("");
  const [configPath, setConfigPath] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSettings();
        if (cancelled) return;
        setUserName(data.userName ?? "");
        setRepos(data.repos ?? []);
        setEditors(data.editors ?? []);
        setForesterCli(data.foresterCli ?? "");
        setBlenderPath(data.blenderPath ?? "");
        setAddonPath(data.addonPath ?? "");
        setConfigPath(data.configPath ?? "");
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
  }, [open, setError]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await saveSettingsProfile(userName, "en");
      setNotice("Profile saved");
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
      setNotice("Repository list saved");
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
      setNotice("External editors saved");
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
      setNotice("Forester settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "repositories", label: "Repositories" },
    { id: "external-editors", label: "External editors" },
    { id: "forester", label: "Forester" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl gap-0 p-0">
        <div className="flex h-[80vh] min-h-[640px] flex-col px-10 pb-10 pt-10">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-xl">Settings</DialogTitle>
          </DialogHeader>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">
            Manage repository and your account settings
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
                  )}
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
                      <h3 className="text-lg font-semibold">Profile</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This is how others will see you on the site.
                      </p>
                      <Separator className="my-4" />
                      <div className="max-w-md space-y-4">
                        <div>
                          <Label className="mb-2 block">Username</Label>
                          <Input
                            value={userName}
                            placeholder="Your name"
                            onChange={(e) => setUserName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">Language</Label>
                          <Input value="English" disabled />
                          <p className="mt-2 text-sm text-muted-foreground">
                            This is the language that will be used in the dashboard.
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto flex justify-end pt-6">
                        <Button disabled={saving} onClick={() => void handleSaveProfile()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Save profile
                        </Button>
                      </div>
                    </>
                  ) : null}

                  {tab === "repositories" ? (
                    <>
                      <h3 className="text-lg font-semibold">Repositories</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Manage your repository list.</p>
                      <Separator className="my-4" />
                      <div className="min-h-0 flex-1 space-y-2 overflow-auto">
                        {repos.map((path, index) => (
                          <SettingsPathListRow
                            key={`${path}-${index}`}
                            path={path}
                            onSelect={async () => {
                              const picked = await pickRepositoryFolder();
                              if (!picked) return;
                              setRepos((list) => list.map((item, i) => (i === index ? picked : item)));
                            }}
                            onRemove={() => setRepos((list) => list.filter((_, i) => i !== index))}
                          />
                        ))}
                      </div>
                      <div className="mt-auto flex justify-between pt-6">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            const picked = await pickRepositoryFolder();
                            if (picked) setRepos((list) => [...list, picked]);
                          }}
                        >
                          Add repository
                        </Button>
                        <Button disabled={saving} onClick={() => void handleSaveRepos()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Save list
                        </Button>
                      </div>
                    </>
                  ) : null}

                  {tab === "external-editors" ? (
                    <>
                      <h3 className="text-lg font-semibold">External editors</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Manage your editors.</p>
                      <Separator className="my-4" />
                      <div className="min-h-0 flex-1 space-y-2 overflow-auto">
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
                          Add application
                        </Button>
                        <Button disabled={saving} onClick={() => void handleSaveEditors()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Save list
                        </Button>
                      </div>
                    </>
                  ) : null}

                  {tab === "forester" ? (
                    <>
                      <h3 className="text-lg font-semibold">Forester</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Manage your repository backend.</p>
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        <div>
                          <Label className="mb-2 block text-sm text-muted-foreground">Config file</Label>
                          <Input value={configPath} readOnly className="font-mono text-xs" />
                        </div>
                        <SettingsLabeledPathRow
                          label="Forester CLI"
                          value={foresterCli}
                          onChange={setForesterCli}
                          onSelect={async () => {
                            const picked = await pickSettingsFile();
                            if (picked) setForesterCli(picked);
                          }}
                        />
                        <SettingsLabeledPathRow
                          label="Blender executable"
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
                          label="Blender addon"
                          value={addonPath}
                          optional
                          onChange={setAddonPath}
                          onSelect={async () => {
                            const picked = await pickSettingsFolder();
                            if (picked) setAddonPath(picked);
                          }}
                          onClear={() => setAddonPath("")}
                        />
                      </div>
                      <div className="mt-auto flex justify-end pt-6">
                        <Button disabled={saving} onClick={() => void handleSaveForester()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Save settings
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
