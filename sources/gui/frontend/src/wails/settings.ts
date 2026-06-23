import {
  GetSettings,
  PickSettingsFile,
  PickSettingsFolder,
  SaveSettingsAppearance,
  SaveSettingsEditors,
  SaveSettingsForester,
  SaveSettingsProfile,
  SaveSettingsRepos,
} from "../../wailsjs/go/main/App";

import type { GuiFont, GuiTheme } from "@/lib/applyAppearance";
import { loadStoredFont, loadStoredTheme, normalizeFont, normalizeTheme } from "@/lib/applyAppearance";

export interface SettingsSnapshot {
  userName: string;
  language: string;
  repos: string[];
  currentRepo: string;
  configPath: string;
  foresterCli: string;
  blenderPath: string;
  addonPath: string;
  editors: string[];
  theme: string;
  font: string;
}

export async function fetchSettings(): Promise<SettingsSnapshot> {
  return GetSettings();
}

export function resolveAppearanceFromSettings(snapshot: SettingsSnapshot): {
  theme: GuiTheme;
  font: GuiFont;
} {
  const localTheme = loadStoredTheme();
  const localFont = loadStoredFont();
  const cfgTheme = normalizeTheme(snapshot.theme);
  const cfgFont = normalizeFont(snapshot.font);

  try {
    if (localStorage.getItem("dfm.gui.theme")) {
      return { theme: localTheme, font: localFont };
    }
  } catch {
    // ignore
  }

  return { theme: cfgTheme, font: cfgFont };
}

export async function saveSettingsProfile(userName: string, language: string): Promise<void> {
  await SaveSettingsProfile(userName, language);
}

export async function saveSettingsRepos(repos: string[]): Promise<void> {
  await SaveSettingsRepos(repos);
}

export async function saveSettingsEditors(editors: string[]): Promise<void> {
  await SaveSettingsEditors(editors);
}

export async function saveSettingsForester(
  cliPath: string,
  blenderPath: string,
  addonPath: string,
): Promise<void> {
  await SaveSettingsForester(cliPath, blenderPath, addonPath);
}

export async function saveSettingsAppearance(theme: GuiTheme, font: GuiFont): Promise<void> {
  await SaveSettingsAppearance(theme, font);
}

export async function pickSettingsFile(): Promise<string> {
  return PickSettingsFile();
}

export async function pickSettingsFolder(): Promise<string> {
  return PickSettingsFolder();
}
