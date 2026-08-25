const lightModules = import.meta.glob("./light/**/*.svg", { eager: true, import: "default" }) as Record<string, string>;
const darkModules = import.meta.glob("./dark/**/*.svg", { eager: true, import: "default" }) as Record<string, string>;

export type UiTheme = "light" | "dark";

/** Resolve themed SVG. Dark falls back to light when a file is missing. */
export function asset(rel: string, theme?: UiTheme): string {
  const mode = theme ?? documentTheme();
  if (mode === "dark") {
    const dark = darkModules[`./dark/${rel}`];
    if (dark) {
      return dark;
    }
  }
  const src = lightModules[`./light/${rel}`];
  if (!src) {
    throw new Error(`Missing asset: ${rel}`);
  }
  return src;
}

export function documentTheme(): UiTheme {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  return "light";
}

export function applyDocumentTheme(theme: UiTheme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = theme;
}
