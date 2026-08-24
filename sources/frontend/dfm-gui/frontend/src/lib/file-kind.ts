export type FileKind = "image" | "text" | "binary";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tif", "tiff", "ico", "avif"]);
const TEXT_EXT = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "py",
  "go",
  "rs",
  "xml",
  "yml",
  "yaml",
  "toml",
  "sh",
  "bash",
  "log",
  "cfg",
  "ini",
]);

export function fileKind(name: string): FileKind {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  if (IMAGE_EXT.has(ext)) {
    return "image";
  }
  if (!ext || TEXT_EXT.has(ext)) {
    return "text";
  }
  return "binary";
}
