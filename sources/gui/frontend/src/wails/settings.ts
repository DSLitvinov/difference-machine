import {
  GetSettings,
  PickSettingsFile,
  SaveSettingsProfile,
  SaveSettingsRepos,
} from "../../wailsjs/go/main/App";

export interface SettingsSnapshot {
  userName: string;
  language: string;
  repos: string[];
  currentRepo: string;
  configPath: string;
  foresterCli: string;
  blenderPath: string;
  addonPath: string;
}

export async function fetchSettings(): Promise<SettingsSnapshot> {
  return GetSettings();
}

export async function saveSettingsProfile(userName: string, language: string): Promise<void> {
  await SaveSettingsProfile(userName, language);
}

export async function saveSettingsRepos(repos: string[]): Promise<void> {
  await SaveSettingsRepos(repos);
}

export async function pickSettingsFile(): Promise<string> {
  return PickSettingsFile();
}
