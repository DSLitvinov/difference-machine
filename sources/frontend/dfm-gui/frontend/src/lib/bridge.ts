function app(): GoApp {
  const bound = window.go?.main.App;
  if (!bound) {
    throw new Error("Wails bindings are not available");
  }
  return bound;
}

export async function getSession(): Promise<SessionInfo> {
  return app().GetSession();
}

export async function selectDirectory(): Promise<string> {
  return app().SelectDirectory();
}

export async function initRepository(absPath: string): Promise<SessionInfo> {
  return app().InitRepository(absPath);
}

export async function openRepository(absPath: string): Promise<SessionInfo> {
  return app().OpenRepository(absPath);
}

export async function cleanRepository(): Promise<SessionInfo> {
  return app().CleanRepository();
}

export async function foresterCall(method: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const raw = await app().ForesterCall(method, JSON.stringify(args));
  const env = JSON.parse(raw) as { ok: boolean; error?: string; result?: unknown };
  if (!env.ok) {
    throw new Error(env.error || "request failed");
  }
  return env.result;
}

export async function readThumbCache(relPath: string, size: number, mtime: number): Promise<string> {
  try {
    return (await app().ReadThumbCache(relPath, size, mtime)) || "";
  } catch {
    return "";
  }
}

export async function writeThumbCache(relPath: string, size: number, mtime: number, pngBase64: string): Promise<void> {
  try {
    await app().WriteThumbCache(relPath, size, mtime, pngBase64);
  } catch {
    // Disk cache is best-effort; memory still holds the blob.
  }
}

export async function setLocale(locale: string): Promise<void> {
  await app().SetLocale(locale);
}

export async function setTheme(theme: string): Promise<void> {
  await app().SetTheme(theme);
}

export type SettingsInfo = {
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
  platform: string;
  hasRepository: boolean;
  gcEnabled: boolean;
  gcReflogExpireDays: number;
  gcScheduleEnabled: boolean;
  gcIntervalDays: number;
  gcScheduleHour: number;
  gcScheduleMinute: number;
};

export type GCRunResult = {
  commitsDeleted: number;
  treesDeleted: number;
  blobsDeleted: number;
  lastRun: number;
};

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value) {
    return [value];
  }
  if (value && typeof value === "object") {
    return Object.values(value).filter((item): item is string => typeof item === "string");
  }
  return [];
}

function asInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return fallback;
}

export async function getSettings(): Promise<SettingsInfo> {
  const info = await app().GetSettings();
  return {
    ...info,
    repos: stringList(info?.repos),
    editors: stringList(info?.editors),
    platform: typeof info?.platform === "string" ? info.platform : "",
    hasRepository: Boolean(info?.hasRepository),
    gcEnabled: Boolean(info?.gcEnabled),
    gcReflogExpireDays: asInt(info?.gcReflogExpireDays, 90),
    gcScheduleEnabled: Boolean(info?.gcScheduleEnabled),
    gcIntervalDays: asInt(info?.gcIntervalDays, 7),
    gcScheduleHour: asInt(info?.gcScheduleHour, 7),
    gcScheduleMinute: asInt(info?.gcScheduleMinute, 0),
  };
}

export async function saveProfile(name: string, email: string, locale: string): Promise<void> {
  await app().SaveProfile(name, email, locale);
}

export async function saveRepos(paths: string[]): Promise<void> {
  await app().SaveRepos(paths);
}

export async function saveForester(apiPath: string, cliPath: string): Promise<void> {
  await app().SaveForester(apiPath, cliPath);
}

export async function saveEditors(blenderPath: string, addonPath: string, others: string[]): Promise<void> {
  await app().SaveEditors(blenderPath, addonPath, others);
}

export async function saveGC(
  enabled: boolean,
  reflogExpireDays: number,
  scheduleEnabled: boolean,
  intervalDays: number,
  hour: number,
  minute: number,
): Promise<void> {
  await app().SaveGC(enabled, reflogExpireDays, scheduleEnabled, intervalDays, hour, minute);
}

export async function runGarbageCollection(reflogExpireDays: number): Promise<GCRunResult> {
  const result = await app().RunGarbageCollection(reflogExpireDays);
  return {
    commitsDeleted: asInt(result?.commitsDeleted, 0),
    treesDeleted: asInt(result?.treesDeleted, 0),
    blobsDeleted: asInt(result?.blobsDeleted, 0),
    lastRun: asInt(result?.lastRun, 0),
  };
}

export async function selectFile(): Promise<string> {
  return app().SelectFile();
}

export async function selectApplication(): Promise<string> {
  return app().SelectApplication();
}

export async function windowMinimise(): Promise<void> {
  await app().WindowMinimise();
}

export async function windowToggleMaximise(): Promise<void> {
  await app().WindowToggleMaximise();
}

export async function windowClose(): Promise<void> {
  await app().WindowClose();
}

function wailsRuntime() {
  return window.runtime;
}

export function onWailsEvent(event: string, callback: (...args: unknown[]) => void): () => void {
  const runtime = wailsRuntime();
  if (!runtime?.EventsOn) {
    return () => undefined;
  }
  runtime.EventsOn(event, callback);
  return () => runtime.EventsOff?.(event);
}
