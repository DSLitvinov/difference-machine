import {
  GetSettings,
  PickSettingsFile,
  PickSettingsFolder,
  SaveSettingsEditors,
  SaveSettingsForester,
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
  editors: string[];
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

export async function pickSettingsFile(): Promise<string> {
  return PickSettingsFile();
}

export async function pickSettingsFolder(): Promise<string> {
  return PickSettingsFolder();
}
