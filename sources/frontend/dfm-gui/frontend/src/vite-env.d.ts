/// <reference types="vite/client" />

declare module "*.svg" {
  const src: string;
  export default src;
}


interface SessionInfo {
  shell: "first-start" | "app";
  repoPath: string;
  locale: string;
  userName: string;
  userEmail: string;
  isRepository: boolean;
  error?: string;
}

interface SettingsInfo {
  userName: string;
  userEmail: string;
  locale: string;
  theme: string;
  repos: string[];
  apiPath: string;
  foresterPath: string;
  blenderPath: string;
  addonPath: string;
  editors: string[];
}

interface GoApp {
  GetSession: () => Promise<SessionInfo>;
  SelectDirectory: () => Promise<string>;
  InitRepository: (absPath: string) => Promise<SessionInfo>;
  OpenRepository: (absPath: string) => Promise<SessionInfo>;
  ForesterCall: (method: string, argsJSON: string) => Promise<string>;
  ReadThumbCache: (relPath: string, size: number, mtime: number) => Promise<string>;
  WriteThumbCache: (relPath: string, size: number, mtime: number, pngBase64: string) => Promise<void>;
  GetSettings: () => Promise<SettingsInfo>;
  SaveProfile: (name: string, email: string, locale: string) => Promise<void>;
  SaveAppearance: (theme: string) => Promise<void>;
  SaveRepos: (paths: string[]) => Promise<void>;
  SaveForester: (apiPath: string, cliPath: string) => Promise<void>;
  SaveEditors: (blenderPath: string, addonPath: string, others: string[]) => Promise<void>;
  SelectFile: () => Promise<string>;
  SetLocale: (locale: string) => Promise<void>;
  WindowMinimise: () => Promise<void>;
  WindowToggleMaximise: () => Promise<void>;
  WindowClose: () => Promise<void>;
}

interface Window {
  go?: {
    main: {
      App: GoApp;
    };
  };
  runtime?: {
    EventsOn: (event: string, callback: (...args: unknown[]) => void) => void;
    EventsOff: (event: string) => void;
  };
}
