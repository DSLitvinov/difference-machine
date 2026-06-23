export type GuiTheme = "light" | "dark";
export type GuiFont = "inter";

const THEME_KEY = "dfm.gui.theme";
const FONT_KEY = "dfm.gui.font";

export function normalizeTheme(value: string | null | undefined): GuiTheme {
  return value === "dark" ? "dark" : "light";
}

export function normalizeFont(value: string | null | undefined): GuiFont {
  return value === "inter" || !value ? "inter" : "inter";
}

export function loadStoredTheme(): GuiTheme {
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "light";
  }
}

export function loadStoredFont(): GuiFont {
  try {
    return normalizeFont(localStorage.getItem(FONT_KEY));
  } catch {
    return "inter";
  }
}

export function applyTheme(theme: GuiTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function applyFont(font: GuiFont): void {
  const family =
    font === "inter" ? "Inter, ui-sans-serif, system-ui, sans-serif" : "ui-sans-serif, system-ui, sans-serif";
  document.body.style.fontFamily = family;
}

export function applyAppearance(theme: GuiTheme, font: GuiFont = "inter"): void {
  applyTheme(theme);
  applyFont(font);
}

export function persistAppearanceLocal(theme: GuiTheme, font: GuiFont): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(FONT_KEY, font);
  } catch {
    // ignore quota / private mode
  }
  applyAppearance(theme, font);
}

export function bootstrapAppearance(): void {
  applyAppearance(loadStoredTheme(), loadStoredFont());
}
