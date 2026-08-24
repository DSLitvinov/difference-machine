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

interface GoApp {
  GetSession: () => Promise<SessionInfo>;
  SelectDirectory: () => Promise<string>;
  InitRepository: (absPath: string) => Promise<SessionInfo>;
  OpenRepository: (absPath: string) => Promise<SessionInfo>;
  ForesterCall: (method: string, argsJSON: string) => Promise<string>;
  ReadThumbCache: (relPath: string, size: number, mtime: number) => Promise<string>;
  WriteThumbCache: (relPath: string, size: number, mtime: number, pngBase64: string) => Promise<void>;
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
