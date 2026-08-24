const lightModules = import.meta.glob("./light/**/*.svg", { eager: true, import: "default" }) as Record<string, string>;

export function asset(rel: string): string {
  const src = lightModules[`./light/${rel}`];
  if (!src) {
    throw new Error(`Missing asset: ${rel}`);
  }
  return src;
}
