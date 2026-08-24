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

export async function foresterCall(method: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const raw = await app().ForesterCall(method, JSON.stringify(args));
  const env = JSON.parse(raw) as { ok: boolean; error?: string; result?: unknown };
  if (!env.ok) {
    throw new Error(env.error || "request failed");
  }
  return env.result;
}

export async function setLocale(locale: string): Promise<void> {
  await app().SetLocale(locale);
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
