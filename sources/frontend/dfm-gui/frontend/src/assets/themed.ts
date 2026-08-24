export type ThemedSrc = {
  light: string;
  dark: string;
};

const lightModules = import.meta.glob("./light/**/*.svg", { eager: true, import: "default" }) as Record<string, string>;
const darkModules = import.meta.glob("./dark/**/*.svg", { eager: true, import: "default" }) as Record<string, string>;

export function asset(rel: string): ThemedSrc {
  const light = lightModules[`./light/${rel}`];
  const dark = darkModules[`./dark/${rel}`];
  if (!light || !dark) {
    throw new Error(`Missing themed asset: ${rel}`);
  }
  return { light, dark };
}

export function isThemedSrc(value: string | ThemedSrc | undefined): value is ThemedSrc {
  return Boolean(value && typeof value === "object" && "light" in value && "dark" in value);
}
