export type UiTheme = "light" | "dark";

export function normalizeTheme(value: string | undefined | null): UiTheme {
  return value === "dark" ? "dark" : "light";
}

export function applyTheme(value: string | undefined | null): UiTheme {
  const theme = normalizeTheme(value);
  document.documentElement.classList.toggle("dark", theme === "dark");
  const runtime = window.runtime as
    | { WindowSetDarkTheme?: () => void; WindowSetLightTheme?: () => void }
    | undefined;
  try {
    if (theme === "dark") {
      runtime?.WindowSetDarkTheme?.();
    } else {
      runtime?.WindowSetLightTheme?.();
    }
  } catch {
    // Native title-bar theme is Windows-only and best-effort.
  }
  return theme;
}
