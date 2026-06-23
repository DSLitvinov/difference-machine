import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import {
  fetchSettings,
  pickSettingsFile,
  saveSettingsProfile,
  saveSettingsRepos,
  type SettingsSnapshot,
} from "@/wails/settings";
import { openRepository, pickRepositoryFolder } from "@/wails/bridge";

type SettingsTab = "profile" | "repositories" | "forester";

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
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [userName, setUserName] = useState("");
  const [repos, setRepos] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSettings();
        if (cancelled) return;
        setSnapshot(data);
        setUserName(data.userName ?? "");
        setRepos(data.repos ?? []);
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
      setSnapshot(data);
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

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "repositories", label: "Repositories" },
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
                    "h-10 w-full justify-start px-3 font-medium",
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
            ) : tab === "profile" ? (
              <>
                <h3 className="text-lg font-semibold">Profile</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Author name used for commits and merges.
                </p>
                <div className="max-w-md space-y-4">
                  <div>
                    <Label className="mb-1">Author name</Label>
                    <Input
                      value={userName}
                      placeholder="Your name"
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Language</Label>
                    <Input value="English" disabled />
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
                <p className="mb-4 text-sm text-muted-foreground">Manage your repository list.</p>
                <div className="min-h-0 flex-1 space-y-2 overflow-auto">
                  {repos.map((path, index) => (
                    <div key={`${path}-${index}`} className="flex items-center gap-2">
                      <Input value={path} readOnly className="font-mono text-xs" title={path} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const picked = await pickRepositoryFolder();
                          if (!picked) return;
                          setRepos((list) =>
                            list.map((item, i) => (i === index ? picked : item)),
                          );
                        }}
                      >
                        Select
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRepos((list) => list.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                    Save list
                  </Button>
                </div>
              </>
            ) : null}

            {tab === "forester" ? (
              <>
                <h3 className="text-lg font-semibold">Forester</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Backend paths (read-only in v1.0).
                </p>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="mb-1 font-medium">Config file</p>
                    <Input value={snapshot?.configPath ?? ""} readOnly className="font-mono text-xs" />
                  </div>
                  <div>
                    <p className="mb-1 font-medium">Forester CLI</p>
                    <Input value={snapshot?.foresterCli ?? ""} readOnly className="font-mono text-xs" />
                  </div>
                  <div>
                    <p className="mb-1 font-medium">Blender executable</p>
                    <Input value={snapshot?.blenderPath ?? ""} readOnly className="font-mono text-xs" />
                  </div>
                  <div>
                    <p className="mb-1 font-medium">Blender addon</p>
                    <Input value={snapshot?.addonPath ?? ""} readOnly className="font-mono text-xs" />
                  </div>
                </div>
                <div className="mt-auto flex justify-end pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const picked = await pickSettingsFile();
                      if (picked) setNotice(`Selected: ${picked}`);
                    }}
                  >
                    Test file picker
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
